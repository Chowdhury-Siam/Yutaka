import assert from 'node:assert/strict';
import test from 'node:test';
import { handleRequest } from '../src/index.ts';

const env = {
  TURSO_DATABASE_URL: 'libsql://private-database.example',
  TURSO_AUTH_TOKEN: 'private-database-token',
  JWT_SECRET: 'private-signing-secret-that-is-long-enough',
  YUTAKA_WORKER_VERSION: '1.0.1297',
};
const context = { waitUntil() {} } as unknown as ExecutionContext;
const noDatabase = () => { throw new Error('The welcome page must not open the database.'); };

test('browser root renders the website theme without leaking configuration', async () => {
  const response = await handleRequest(new Request('https://my-yutaka.workers.dev/', {
    headers: { accept: 'text/html,application/xhtml+xml' },
  }), env, context, noDatabase);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type')!, /text\/html/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('vary'), 'Accept');
  const html = await response.text();
  assert.match(html, /Your finances\./);
  assert.match(html, /Your control\./);
  assert.match(html, /#080f0c/);
  assert.match(html, /#9be9b1/);
  assert.match(html, /Manrope/);
  assert.match(html, /href="\/profile"/);
  assert.match(html, /href="\/delete-account"/);
  assert.match(html, /https:\/\/my-yutaka\.workers\.dev/);
  assert.match(html, /Configured/);
  assert.match(html, /Sync v1\.0\.1297/);
  for (const secret of [env.TURSO_DATABASE_URL, env.TURSO_AUTH_TOKEN, env.JWT_SECRET]) {
    assert.ok(!html.includes(secret));
  }
  const nonce = html.match(/<style nonce="([^"]+)"/)!;
  assert.ok(nonce);
  assert.ok(response.headers.get('content-security-policy')!.includes(`'nonce-${nonce[1]}'`));
  assert.ok(html.includes(`<script nonce="${nonce[1]}">`));
});

test('root remains compatible with JSON clients and explicit JSON requests', async () => {
  for (const [accept, query] of [['application/json', ''], ['', ''], ['text/html', '?format=json']]) {
    const response = await handleRequest(new Request('https://my-yutaka.workers.dev/' + query, {
      headers: { accept },
    }), env, context, noDatabase);
    assert.match(response.headers.get('content-type')!, /application\/json/);
    const info = await response.json() as { configured: boolean; workerVersion: string; endpoints: Record<string, string> };
    assert.equal(info.configured, true);
    assert.equal(info.workerVersion, env.YUTAKA_WORKER_VERSION);
    assert.equal(info.endpoints.profile, '/profile');
    assert.equal(info.endpoints.push, 'POST /v1/sync/push');
  }
});

test('unconfigured browsers get setup guidance and escaped version text', async () => {
  const response = await handleRequest(new Request('https://my-yutaka.workers.dev/', {
    headers: { accept: 'text/html' },
  }), { ...env, JWT_SECRET: '', YUTAKA_WORKER_VERSION: '<script>alert(1)</script>' }, context, noDatabase);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Setup needed/);
  assert.match(html, /Finish Deploy Database/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.ok(!html.includes('<script>alert(1)</script>'));
});
