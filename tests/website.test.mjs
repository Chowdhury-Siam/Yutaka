import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
const read = p => readFile(new URL(p, import.meta.url), 'utf8');

test('live demo is removed from public pages and deployable assets', async () => {
  for (const path of ['../public/index.html', '../public/privacy/index.html', '../public/404.html']) {
    assert.doesNotMatch(await read(path), /\/demo\/|interactive demo|live demo/i);
  }
  for (const path of ['../public/demo', '../public/assets/demo.js', '../public/assets/demo-model.js', '../public/assets/app-demo.css']) {
    await assert.rejects(access(new URL(path, import.meta.url)), { code: 'ENOENT' });
  }
});

test('landing and privacy are static and no longer advertise release signup', async () => {
  const [home,privacy,wrangler,config,main] = await Promise.all(['../public/index.html','../public/privacy/index.html','../wrangler.jsonc','../public/assets/config.js','../public/assets/main.js'].map(read));
  for (const id of ['features','sync','downloads']) assert.match(home,new RegExp(`id="${id}"`));
  assert.match(privacy,/no website database/);
  assert.match(config,/playStoreUrl: ''/); assert.match(config,/microsoftStoreUrl: ''/);
  assert.match(main,/removeAttribute\('href'\)/);
  for (const text of [home,main,wrangler]) assert.doesNotMatch(text,/waitlist|TURSO_DATABASE_URL|api\/health|Turso/i);
  const styles = await read('../public/assets/styles.css');
  assert.match(styles,/scroll-margin-top:96px/);
  await assert.rejects(access(new URL('../schema.sql', import.meta.url)));
  await assert.rejects(access(new URL('../worker/index.js', import.meta.url)));
});
