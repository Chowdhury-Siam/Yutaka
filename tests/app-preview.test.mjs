import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL(name,import.meta.url),'utf8');
test('marketing homepage previews the static app screenshot',async()=>{
 const [html,shot,pkg,lock]=await Promise.all([read('../public/index.html'),readFile(new URL('../public/assets/app-home-v2.png',import.meta.url)),read('../package.json'),read('../package-lock.json')]);
 assert.match(html,/<img src="\/assets\/app-home-v2\.png"/);
 assert.match(html,/class=\"app-screen home-screen\"/);
 assert.ok(shot.length>20000,'preview screenshot exists');
 assert.equal(JSON.parse(pkg).version,'1.3.1');
 assert.equal(JSON.parse(lock).packages[''].version,'1.3.1');
});
