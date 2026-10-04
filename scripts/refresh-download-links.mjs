import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLatestRelease } from '../public/assets/releases.mjs';

export async function refreshStaticDownloads({ fetcher, htmlPath = 'public/index.html' } = {}) {
  const release = await fetchLatestRelease(fetcher);
  const html = await readFile(htmlPath, 'utf8');
  const updated = html.replace(/<a\b[^>]*data-download-file="([^"]+)"[^>]*>/g, (tag, key) => {
    const file = release.downloads[key];
    const clean = tag.replace(/\s+(?:href|aria-disabled)="[^"]*"/g, '');
    return clean.replace(/>$/, file ? ` href="${file.url}">` : ' aria-disabled="true">');
  }).replace(/(<span data-download-size="([^"]+)">)[^<]*(<\/span>)/g, (_match, start, key, end) => `${start}${release.downloads[key]?.size || 'Not available'}${end}`)
    .replace(/(<span id="download-version">)[^<]*(<\/span>)/, `$1${release.version}$2`);
  await writeFile(htmlPath, updated);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await refreshStaticDownloads(); }
  catch (error) { console.error(`::error::${error.message}`); process.exitCode = 1; }
}
