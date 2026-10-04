import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { selectDownloads } from '../public/assets/releases.mjs';
import { refreshDownloads } from '../public/assets/downloads.mjs';
import { refreshStaticDownloads } from '../scripts/refresh-download-links.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/release.json', import.meta.url), 'utf8'));
const home = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const response = release => async () => ({ ok:true, json:async () => release });

test('all twelve installable release files are offered directly, with no GitHub project row', () => {
  const release = selectDownloads(fixture);
  assert.equal(Object.keys(release.downloads).length,12);
  for (const key of ['android','windows','linux','macos']) assert.ok(release.downloads[key]);
  assert.match(release.downloads.android.url,/universal\.apk$/);
  assert.match(release.downloads.windows.url,/Setup\.exe$/);
  assert.match(release.downloads.linux.url,/linux-x64\.AppImage$/);
  assert.match(release.downloads.macos.url,/macos-universal\.dmg$/);
  for (const [key,file] of Object.entries(release.downloads)) {
    assert.ok(home.includes(`data-download-file="${key}"`));
    assert.ok(home.includes(file.url));
  }
  assert.doesNotMatch(home,/GitHub project|Coming soon|play\.aab/);
});

test('release selection rejects unsafe URLs and unpublished releases', () => {
  for (const changes of [{draft:true},{prerelease:true},{tag_name:'<script>'}]) assert.throws(()=>selectDownloads({...fixture,...changes}));
  const assets = fixture.assets.map(a=>a.name.endsWith('universal.apk')?{...a,browser_download_url:'https://evil.example/app.apk'}:a);
  assert.throws(()=>selectDownloads({...fixture,assets}));
});

function documentStub() {
  const link={dataset:{downloadFile:'android'},href:'existing',attrs:{},removeAttribute(name){delete this.attrs[name];if(name==='href')delete this.href;},setAttribute(name,value){this.attrs[name]=value;}};
  const size={dataset:{downloadSize:'android'},textContent:'old size'};
  const version={textContent:'old version'};
  return {link,size,version,querySelectorAll:selector=>selector==='[data-download-file]'?[link]:[size],getElementById:()=>version};
}

test('browser refresh replaces versioned URLs and labels with a newer release', async () => {
  const newer=JSON.parse(JSON.stringify(fixture).replaceAll(fixture.tag_name,'v2.0.0'));
  const document=documentStub();
  await refreshDownloads(document,response(newer));
  assert.match(document.link.href,/\/v2\.0\.0\/Yutaka-v2\.0\.0-universal\.apk$/);
  assert.equal(document.version.textContent,'v2.0.0');
  assert.equal(document.size.textContent,'59 MB');
});

test('failed release checks preserve usable fallback links; absent files become unavailable', async () => {
  const document=documentStub();
  await assert.rejects(refreshDownloads(document,async()=>({ok:false})));
  assert.equal(document.link.href,'existing');
  await refreshDownloads(document,response({...fixture,assets:[]}));
  assert.equal(document.link.href,undefined);
  assert.equal(document.link.attrs['aria-disabled'],'true');
  assert.equal(document.size.textContent,'Not available');
});

test('deployment refresh writes new static links only after a valid release check', async () => {
  const dir=await mkdtemp(join(tmpdir(),'yutaka-downloads-'));
  try {
    const htmlPath=join(dir,'index.html'); await writeFile(htmlPath,home);
    await assert.rejects(refreshStaticDownloads({htmlPath,fetcher:async()=>({ok:false})}));
    assert.equal(await readFile(htmlPath,'utf8'),home);
    const newer=JSON.parse(JSON.stringify(fixture).replaceAll(fixture.tag_name,'v2.0.0'));
    await refreshStaticDownloads({htmlPath,fetcher:response(newer)});
    const updated=await readFile(htmlPath,'utf8');
    assert.match(updated,/<span id="download-version">v2\.0\.0<\/span>/);
    assert.doesNotMatch(updated,new RegExp(fixture.tag_name.replaceAll('.','\\.')));
  } finally { await rm(dir,{recursive:true,force:true}); }
});
