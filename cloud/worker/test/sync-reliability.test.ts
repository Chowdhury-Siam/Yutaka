import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createClient } from '@libsql/client';
import { handleRequest } from '../src/index.ts';
import { deploymentSecrets } from '../scripts/prepare-secrets.mjs';

const schema = fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');
const context = { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext;

async function fixture(t: test.TestContext) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'yutaka-sync-reliability-'));
  const db = createClient({ url: 'file:' + path.join(directory, 'test.db') });
  t.after(async () => {
    db.close();
    await fs.promises.rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });
  await db.executeMultiple(schema);
  await db.execute('PRAGMA journal_mode = WAL');
  const env = await deploymentSecrets({
    TURSO_DATABASE_URL: 'file:' + path.join(directory, 'test.db'),
    TURSO_AUTH_TOKEN: 'local-test', JWT_SECRET: 'x'.repeat(40),
  });
  // Production opens a client per request. Independent connections also
  // exercise lock contention rather than sharing a local SQLite statement.
  const connect = () => createClient({ url: env.TURSO_DATABASE_URL });
  const call = (route: string, method = 'GET', body?: unknown, token = '') => handleRequest(
    new Request('https://worker.example' + route, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }), env, context, connect,
  );
  const registration = await call('/v1/auth/register', 'POST', {
    username: 'sync-owner', password: 'password123', deviceId: 'device-one',
  });
  assert.equal(registration.status, 200);
  const session = await registration.json() as any;
  const op = (operationId: string, baseVersion = 0, amount = 100) => ({
    operationId, entityType: 'accounts', entityId: 'cash-account', operation: 'upsert',
    payload: { id: 'cash-account', amount, updated_on: amount }, baseVersion, clientUpdatedAt: 100,
  });
  return { db, call, session, op };
}

test('lost push responses retry once and preserve the original receipt', async t => {
  const { db, call, session, op } = await fixture(t);
  const push = (operations: unknown[]) => call('/v1/sync/push', 'POST', { operations }, session.accessToken);
  const first = await (await push([op('create-cash')])).json() as any;
  const second = await (await push([op('edit-cash', 1, 200)])).json() as any;
  assert.equal(second.accepted[0].version, 2);
  const retry = await (await push([op('create-cash')])).json() as any;
  assert.deepEqual(retry, first);
  assert.equal(Number((await db.execute('SELECT COUNT(*) AS n FROM sync_changes')).rows[0].n), 2);
  assert.equal(Number((await db.execute('SELECT version FROM sync_entities')).rows[0].version), 2);
});

test('stale devices conflict, rebased deletes persist and pull pages advance', async t => {
  const { db, call, session, op } = await fixture(t);
  const push = (operations: unknown[]) => call('/v1/sync/push', 'POST', { operations }, session.accessToken);
  await push([op('create-cash')]);
  const stale = await (await push([op('stale-edit')])).json() as any;
  assert.equal(stale.accepted.length, 0);
  assert.equal(stale.conflicts[0].serverVersion, 1);
  const deletion = { ...op('delete-cash', 1), operation: 'delete', payload: null };
  assert.equal((await push([deletion])).status, 200);
  assert.deepEqual(await (await push([deletion])).json(), await (await push([deletion])).json());
  assert.notEqual((await db.execute('SELECT deleted_at FROM sync_entities')).rows[0].deleted_at, null);
  const one = await (await call('/v1/sync/pull?cursor=0&limit=1', 'GET', undefined, session.accessToken)).json() as any;
  const two = await (await call(`/v1/sync/pull?cursor=${one.cursor}&limit=1`, 'GET', undefined, session.accessToken)).json() as any;
  assert.equal(one.hasMore, true);
  assert.equal(two.hasMore, false);
  assert.ok(two.cursor > one.cursor);
  assert.equal(two.changes[0].operation, 'delete');
});

test('legacy receipts without change history recover through a fresh rebased operation', async t => {
  const { db, call, session, op } = await fixture(t);
  const push = (operation: unknown) => call('/v1/sync/push', 'POST', { operations: [operation] }, session.accessToken);
  await push(op('orphan-receipt'));
  await db.execute('DELETE FROM sync_changes');
  const response = await push(op('orphan-receipt'));
  assert.equal(response.status, 200);
  const result = await response.json() as any;
  assert.equal(result.accepted.length, 0);
  assert.equal(result.conflicts[0].serverVersion, 1);
  const retry = await push(op('rebased-fresh-id', 1, 200));
  assert.equal((await retry.json() as any).accepted[0].version, 2);
});

test('invalid operations and pagination return 400 without partial writes', async t => {
  const { db, call, session, op } = await fixture(t);
  for (const invalid of [null, [], { ...op('bad-version'), baseVersion: -1 },
    { ...op('bad-version'), baseVersion: 0.5 }, { ...op('bad-version'), baseVersion: 'NaN' },
    { ...op('bad-payload'), payload: [] }, { ...op('bad-payload'), payload: null }]) {
    const response = await call('/v1/sync/push', 'POST', { operations: [op('valid-first'), invalid] }, session.accessToken);
    assert.equal(response.status, 400, JSON.stringify(invalid));
    assert.equal(Number((await db.execute('SELECT COUNT(*) AS n FROM sync_changes')).rows[0].n), 0);
  }
  assert.equal((await call('/v1/sync/push', 'POST', null, session.accessToken)).status, 400);
  for (const query of ['cursor=-1', 'cursor=NaN', 'cursor=Infinity', 'cursor=0.5', 'limit=0', 'limit=0.5', 'limit=NaN']) {
    assert.equal((await call('/v1/sync/pull?' + query, 'GET', undefined, session.accessToken)).status, 400, query);
  }
});

test('duplicate operation IDs cannot silently discard a different mutation', async t => {
  const { call, session, op } = await fixture(t);
  const response = await call('/v1/sync/push', 'POST', {
    operations: [op('same-operation'), op('same-operation', 0, 300)],
  }, session.accessToken);
  assert.equal(response.status, 400);
});

test('simultaneous device writes preserve compare-and-set and one ordered receipt', async t => {
  const { db, call, session, op } = await fixture(t);
  const responses = await Promise.all(['device-one-edit', 'device-two-edit'].map(id =>
    call('/v1/sync/push', 'POST', { operations: [op(id)] }, session.accessToken)));
  const results = await Promise.all(responses.map(async response => {
    assert.equal(response.status, 200);
    return await response.json() as any;
  }));
  assert.equal(results.flatMap(result => result.accepted).length, 1);
  assert.equal(results.flatMap(result => result.conflicts).length, 1);
  assert.equal(Number((await db.execute('SELECT COUNT(*) AS n FROM sync_changes')).rows[0].n), 1);
  assert.equal(Number((await db.execute('SELECT COUNT(*) AS n FROM processed_operations')).rows[0].n), 1);
});

test('receipt failures roll back the entity and history before an identical retry', async t => {
  const { db, call, session, op } = await fixture(t);
  await db.execute(`CREATE TRIGGER fail_receipt BEFORE INSERT ON processed_operations BEGIN SELECT RAISE(ABORT, 'injected receipt failure'); END`);
  const push = () => call('/v1/sync/push', 'POST', { operations: [op('receipt-retry')] }, session.accessToken);
  assert.equal((await push()).status, 500);
  for (const table of ['sync_entities', 'sync_changes', 'processed_operations']) {
    assert.equal(Number((await db.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n), 0);
  }
  await db.execute('DROP TRIGGER fail_receipt');
  const response = await push();
  assert.equal(response.status, 200);
  assert.equal((await response.json() as any).accepted[0].version, 1);
});

test('refresh response loss and simultaneous retries return the same replacement token', async t => {
  const { db, call, session } = await fixture(t);
  const body = { refreshToken: session.refreshToken, deviceId: 'device-one' };
  const firstResponse = await call('/v1/auth/refresh', 'POST', body);
  assert.equal(firstResponse.status, 200);
  const first = await firstResponse.json() as any;
  for (const response of await Promise.all([
    call('/v1/auth/refresh', 'POST', body), call('/v1/auth/refresh', 'POST', body),
  ])) {
    assert.equal(response.status, 200);
    const repeated = await response.json() as any;
    assert.equal(repeated.refreshToken, first.refreshToken);
    assert.equal(repeated.refreshExpiresAt, first.refreshExpiresAt);
    assert.equal((await call('/v1/sync/status', 'GET', undefined, repeated.accessToken)).status, 200);
  }
  assert.equal(Number((await db.execute('SELECT COUNT(*) AS n FROM refresh_tokens WHERE revoked_at IS NULL')).rows[0].n), 1);
  // Rotating the replacement ends the previous token's replay window too.
  const next = await call('/v1/auth/refresh', 'POST', { ...body, refreshToken: first.refreshToken });
  assert.equal(next.status, 200);
  assert.equal((await call('/v1/auth/refresh', 'POST', body)).status, 401);
});

test('refresh rollback preserves the original session if issuing its replacement fails', async t => {
  const { db, call, session } = await fixture(t);
  await db.execute(`CREATE TRIGGER fail_refresh BEFORE INSERT ON refresh_tokens BEGIN SELECT RAISE(ABORT, 'injected database failure'); END`);
  const body = { refreshToken: session.refreshToken, deviceId: 'device-one' };
  assert.equal((await call('/v1/auth/refresh', 'POST', body)).status, 500);
  assert.equal((await db.execute('SELECT revoked_at FROM refresh_tokens')).rows[0].revoked_at, null);
  await db.execute('DROP TRIGGER fail_refresh');
  assert.equal((await call('/v1/auth/refresh', 'POST', body)).status, 200);
});

test('refresh replay expires and cannot revive logged-out or password-reset sessions', async t => {
  const { db, call, session } = await fixture(t);
  const body = { refreshToken: session.refreshToken, deviceId: 'device-one' };
  const rotated = await (await call('/v1/auth/refresh', 'POST', body)).json() as any;
  assert.equal((await call('/v1/auth/refresh', 'POST', { ...body, deviceId: 'wrong-device' })).status, 401);
  await db.execute('UPDATE refresh_tokens SET rotated_at = rotated_at - 120001, revoked_at = revoked_at - 120001 WHERE rotated_at IS NOT NULL');
  assert.equal((await call('/v1/auth/refresh', 'POST', body)).status, 401);
  const latest = await (await call('/v1/auth/refresh', 'POST', { ...body, refreshToken: rotated.refreshToken })).json() as any;
  await call('/v1/auth/logout', 'POST', { refreshToken: latest.refreshToken }, latest.accessToken);
  assert.equal((await call('/v1/auth/refresh', 'POST', { ...body, refreshToken: rotated.refreshToken })).status, 401);
  await db.batch([
    'UPDATE users SET session_version = session_version + 1',
    'UPDATE refresh_tokens SET revoked_at = 9999999999999',
  ], 'write');
  assert.equal((await call('/v1/auth/refresh', 'POST', body)).status, 401);
});

test('logout and session reset close an otherwise active rotation replay window', async t => {
  const { db, call, session } = await fixture(t);
  const body = { refreshToken: session.refreshToken, deviceId: 'device-one' };
  const rotated = await (await call('/v1/auth/refresh', 'POST', body)).json() as any;
  await call('/v1/auth/logout', 'POST', { refreshToken: session.refreshToken }, rotated.accessToken);
  assert.equal((await call('/v1/auth/refresh', 'POST', body)).status, 401);
  await call('/v1/auth/refresh', 'POST', { ...body, refreshToken: rotated.refreshToken });
  await db.batch([
    'UPDATE users SET session_version = session_version + 1',
    'UPDATE refresh_tokens SET revoked_at = COALESCE(rotated_at, 1)',
  ], 'write');
  assert.equal((await call('/v1/auth/refresh', 'POST', { ...body, refreshToken: rotated.refreshToken })).status, 401);
});
