import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read = name => readFile(new URL(name,import.meta.url),'utf8');

test('No website Turso integration remains and release links use GitHub secrets', async()=>{
 const [workflow,readme,pkg,lock]=await Promise.all(['../.github/workflows/deploy-website.yml','../README.md','../package.json','../package-lock.json'].map(read));
 for(const secret of ['PLAY_STORE_URL','MICROSOFT_STORE_URL']){assert.ok(workflow.includes(`secrets.${secret}`));assert.ok(readme.includes(secret));}
 for(const old of ['TURSO_DATABASE_URL','TURSO_AUTH_TOKEN','RATE_LIMIT_KEY'])assert.ok(!workflow.includes(old));
 assert.equal(JSON.parse(pkg).version,'1.3.1');assert.equal(JSON.parse(lock).packages[''].version,'1.3.1');
 assert.ok(!JSON.parse(pkg).dependencies?.['@libsql/client']);
});
