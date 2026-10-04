export const RELEASE_API = 'https://api.github.com/repos/Chowdhury-Siam/Yutaka/releases/latest';
const RELEASE_ROOT = 'https://github.com/Chowdhury-Siam/Yutaka/releases/download/';
const formats = {
  android: 'universal.apk',
  'android-arm64': 'arm64.apk',
  'android-arm32': 'arm32.apk',
  windows: 'Setup.exe',
  linux: 'linux-x64.AppImage',
  'linux-x64-installer': 'linux-x64-Setup.run',
  'linux-x64-archive': 'linux-x64.tar.gz',
  'linux-arm64': 'linux-arm64.AppImage',
  'linux-arm64-installer': 'linux-arm64-Setup.run',
  'linux-arm64-archive': 'linux-arm64.tar.gz',
  macos: 'macos-universal.dmg',
  'macos-archive': 'macos-universal.zip',
};

export function selectDownloads(release) {
  if (!release || release.draft || release.prerelease || !/^v?\d[\w.+-]{0,63}$/.test(release.tag_name || '') || !Array.isArray(release.assets)) {
    throw new Error('Invalid published release.');
  }
  const downloads = {};
  for (const [key, suffix] of Object.entries(formats)) {
    const name = `Yutaka-${release.tag_name}-${suffix}`;
    const asset = release.assets.find(asset => asset.name === name);
    if (!asset) continue;
    const expected = `${RELEASE_ROOT}${encodeURIComponent(release.tag_name)}/${encodeURIComponent(name)}`;
    if (asset.browser_download_url !== expected || !Number.isSafeInteger(asset.size) || asset.size <= 0) {
      throw new Error('Invalid release download.');
    }
    downloads[key] = { url: expected, size: `${Math.round(asset.size / 1e6)} MB` };
  }
  return { version: release.tag_name, downloads };
}

export async function fetchLatestRelease(fetcher = fetch) {
  const response = await fetcher(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error('Release check unavailable.');
  return selectDownloads(await response.json());
}
