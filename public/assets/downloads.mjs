import { fetchLatestRelease } from './releases.mjs';

export async function refreshDownloads(document, fetcher) {
  // A failed request leaves the last verified, static download links usable.
  const release = await fetchLatestRelease(fetcher);
  document.querySelectorAll('[data-download-file]').forEach(link => {
    const file = release.downloads[link.dataset.downloadFile];
    if (file) {
      link.href = file.url;
      link.removeAttribute('aria-disabled');
    } else {
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
    }
  });
  document.querySelectorAll('[data-download-size]').forEach(label => {
    label.textContent = release.downloads[label.dataset.downloadSize]?.size || 'Not available';
  });
  document.getElementById('download-version').textContent = release.version;
}

if (typeof document !== 'undefined') {
  const menu = document.getElementById('platform-menu');
  let check;
  const refreshOnce = () => { check ||= refreshDownloads(document).catch(() => {}); };
  menu?.addEventListener('toggle', () => { if (menu.open) refreshOnce(); });
  if (menu?.open) refreshOnce();
}
