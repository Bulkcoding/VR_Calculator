const fs = require('fs');
const path = require('path');

const PACKAGE_JSON_PATH = path.join(__dirname, '..', '..', 'package.json');
const UPDATE_USER_AGENT = 'ReValue-SyncBridge-Updater';
const DEFAULT_CHECK_INTERVAL_MINUTES = 2;

function readAppPackage() {
  return JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
}

function normalizeVersion(value) {
  return String(value || '0.0.0').trim().replace(/^v/i, '');
}

function parseVersion(value) {
  return normalizeVersion(value)
    .split('.')
    .map((part) => Number.parseInt(part.replace(/[^0-9].*$/, ''), 10) || 0);
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  const max = Math.max(a.length, b.length);
  for (let index = 0; index < max; index += 1) {
    const diff = (a[index] || 0) - (b[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function getUpdateConfig() {
  const pkg = readAppPackage();
  const raw = pkg.revalueUpdate || {};
  const owner = String(raw.owner || '').trim();
  const repo = String(raw.repo || '').trim();
  const interval = Number(raw.checkIntervalMinutes);
  const currentVersion = normalizeVersion(pkg.version);

  return {
    currentVersion,
    currentVersionText: `v${currentVersion}`,
    owner,
    repo,
    enabled: Boolean(owner && repo),
    apiUrl: String(raw.apiUrl || `https://api.github.com/repos/${owner}/${repo}/releases/latest`).trim(),
    installerAssetPrefix: String(raw.installerAssetPrefix || 'ReValue Sync Bridge-').trim(),
    portableAssetPrefix: String(raw.portableAssetPrefix || 'ReValue-Sync-Bridge-Portable-').trim(),
    checkIntervalMinutes: Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_CHECK_INTERVAL_MINUTES,
  };
}

function isPortableRuntime(currentExePath = process.execPath) {
  const fileName = path.basename(currentExePath || '').toLowerCase();
  return fileName.includes('portable')
    || Boolean(process.env.PORTABLE_EXECUTABLE_DIR)
    || Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
}

function findReleaseAsset(assets, { prefix, portable }) {
  return assets.find((asset) => {
    const name = String(asset?.name || '');
    if (!name.toLowerCase().endsWith('.exe')) return false;
    if (!name.startsWith(prefix)) return false;
    return portable ? /portable/i.test(name) : !/portable/i.test(name);
  }) || null;
}

function parseReleaseNotes(body) {
  if (!body || typeof body !== 'string') return [];
  const lines = body.split('\n').map((line) => line.trim()).filter(Boolean);

  const bullets = lines
    .filter((line) => line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• '))
    .map((line) => cleanMarkdown(line.slice(2).trim()))
    .filter(Boolean)
    .slice(0, 8);

  if (bullets.length > 0) return bullets;

  return lines
    .filter((line) => line.length > 2 && !/^[#>|!|]/.test(line))
    .map(cleanMarkdown)
    .filter(Boolean)
    .slice(0, 5);
}

function cleanMarkdown(text) {
  return String(text || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .trim();
}

async function fetchLatestRelease(config) {
  const response = await fetch(config.apiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': UPDATE_USER_AGENT,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`업데이트 서버 응답이 올바르지 않습니다 (${response.status})`);
  }

  return response.json();
}

async function checkForUpdate(currentExePath = process.execPath) {
  const config = getUpdateConfig();
  if (!config.enabled) return null;

  const release = await fetchLatestRelease(config);
  const latestVersion = normalizeVersion(release?.tag_name);
  if (!latestVersion) return null;
  if (compareVersions(latestVersion, config.currentVersion) <= 0) return null;

  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const preferPortable = isPortableRuntime(currentExePath);
  const installerAsset = findReleaseAsset(assets, {
    prefix: config.installerAssetPrefix,
    portable: false,
  });
  const portableAsset = findReleaseAsset(assets, {
    prefix: config.portableAssetPrefix,
    portable: true,
  });
  const chosenAsset = preferPortable
    ? (portableAsset || installerAsset)
    : (installerAsset || portableAsset);

  if (!chosenAsset?.browser_download_url) return null;

  return {
    version: `v${latestVersion}`,
    downloadUrl: chosenAsset.browser_download_url,
    assetName: chosenAsset.name,
    isInstaller: chosenAsset === installerAsset,
    releaseNotes: parseReleaseNotes(release?.body),
  };
}

async function downloadFile(downloadUrl, destinationPath, onProgress) {
  const response = await fetch(downloadUrl, {
    headers: {
      Accept: 'application/octet-stream',
      'User-Agent': UPDATE_USER_AGENT,
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok || !response.body) {
    throw new Error(`업데이트 파일 다운로드에 실패했습니다 (${response.status})`);
  }

  const total = Number(response.headers.get('content-length') || 0);
  const reader = response.body.getReader();
  const stream = fs.createWriteStream(destinationPath);
  let received = 0;

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      const buffer = Buffer.from(chunk.value);
      received += buffer.length;
      stream.write(buffer);
      if (total > 0 && typeof onProgress === 'function') {
        onProgress(Math.min(100, Math.round((received / total) * 100)));
      }
    }
  } finally {
    await new Promise((resolve, reject) => {
      stream.end((error) => (error ? reject(error) : resolve()));
    });
  }
}

function buildUpdateScript({ downloadPath, currentExePath, isInstaller }) {
  const quotedDownloadPath = downloadPath.replaceAll('"', '""');
  const quotedCurrentExePath = currentExePath.replaceAll('"', '""');

  if (isInstaller) {
    return [
      '@echo off',
      'timeout /t 2 /nobreak >nul',
      `"${quotedDownloadPath}" /S`,
      'timeout /t 4 /nobreak >nul',
      `del "${quotedDownloadPath}"`,
      `start "" "${quotedCurrentExePath}"`,
      'del "%~f0"',
      '',
    ].join('\r\n');
  }

  return [
    '@echo off',
    'timeout /t 2 /nobreak >nul',
    `copy /Y "${quotedDownloadPath}" "${quotedCurrentExePath}" >nul`,
    `del "${quotedDownloadPath}"`,
    `start "" "${quotedCurrentExePath}"`,
    'del "%~f0"',
    '',
  ].join('\r\n');
}

async function prepareUpdate(info, options = {}) {
  const currentExePath = String(options.currentExePath || process.execPath || '').trim();
  if (!currentExePath) {
    throw new Error('현재 실행 파일 경로를 확인하지 못했습니다.');
  }

  const tempDir = path.join(require('os').tmpdir(), 'revalue-sync-bridge-updater');
  fs.mkdirSync(tempDir, { recursive: true });
  const downloadPath = path.join(tempDir, `revalue-sync-bridge-update-${path.basename(info.assetName || info.downloadUrl)}`);
  const scriptPath = path.join(tempDir, 'revalue-sync-bridge-updater.cmd');

  await downloadFile(info.downloadUrl, downloadPath, options.onProgress);
  fs.writeFileSync(scriptPath, buildUpdateScript({
    downloadPath,
    currentExePath,
    isInstaller: info.isInstaller,
  }), 'utf8');

  return { downloadPath, scriptPath };
}

module.exports = {
  compareVersions,
  getUpdateConfig,
  checkForUpdate,
  prepareUpdate,
};
