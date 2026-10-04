import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const socialImage = '../public/assets/yutaka-share-logo-v2.png';

test('homepage advertises the supplied logo for social previews', async () => {
  const home = await read('../public/index.html');
  for (const page of [home]) {
    assert.match(page, /<title>Yutaka<\/title>/);
    assert.match(page, /<meta property="og:title" content="Yutaka">/);
    assert.match(page, /<meta name="twitter:title" content="Yutaka">/);
    assert.match(page, /<meta property="og:image" content="https:\/\/webpage\.getyutaka\.workers\.dev\/assets\/yutaka-share-logo-v2\.png">/);
    assert.match(page, /<meta property="og:image:type" content="image\/png">/);
    assert.match(page, /<meta property="og:image:width" content="512">/);
    assert.match(page, /<meta property="og:image:height" content="512">/);
    assert.match(page, /<meta name="twitter:card" content="summary">/);
    assert.match(page, /<meta name="twitter:image" content="https:\/\/webpage\.getyutaka\.workers\.dev\/assets\/yutaka-share-logo-v2\.png">/);
    assert.match(page, /<link rel="apple-touch-icon" href="\/assets\/yutaka-logo-icon\.png">/);
    assert.doesNotMatch(page, /og-yutaka\.png/);
  }
});

test('social thumbnail is an opaque square PNG for consistent preview backgrounds', async () => {
  const previewIcon = await readFile(new URL(socialImage, import.meta.url));
  assert.ok(previewIcon.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')));
  assert.equal(previewIcon.readUInt32BE(16), 512);
  assert.equal(previewIcon.readUInt32BE(20), 512);
  assert.equal(previewIcon[25], 2, 'RGB PNG has no transparent padding');
  await assert.rejects(access(new URL('../public/assets/og-legacy.png', import.meta.url)));
});
