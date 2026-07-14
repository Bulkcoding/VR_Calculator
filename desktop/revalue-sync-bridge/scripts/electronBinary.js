const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { downloadArtifact } = require('@electron/get');
const extract = require('extract-zip');

const ELECTRON_VERSION = '37.10.3';
const platform = process.platform;
const arch = process.arch;
const rootDir = path.resolve(__dirname, '..');
const binaryRoot = path.join(rootDir, '.electron');
const distDir = path.join(binaryRoot, 'dist');
const markerPath = path.join(binaryRoot, 'version.json');

async function ensureElectronBinary() {
  const executablePath = getExecutablePath();
  if (isInstalled(executablePath)) {
    return executablePath;
  }

  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  const zipPath = await downloadArtifact({
    version: ELECTRON_VERSION,
    artifactName: 'electron',
    platform,
    arch,
    cacheRoot: path.join(binaryRoot, 'cache'),
  });

  await extractArchive(zipPath, distDir);
  fs.writeFileSync(markerPath, JSON.stringify({ version: ELECTRON_VERSION, platform, arch }, null, 2), 'utf8');

  if (!isInstalled(executablePath)) {
    throw new Error(`Electron binary install failed: ${executablePath}`);
  }

  return executablePath;
}

function isInstalled(executablePath) {
  try {
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    if (marker.version !== ELECTRON_VERSION || marker.platform !== platform || marker.arch !== arch) {
      return false;
    }
  } catch {
    return false;
  }

  return fs.existsSync(executablePath);
}

async function extractArchive(zipPath, destinationPath) {
  if (platform === 'win32') {
    execFileSync('powershell', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destinationPath.replace(/'/g, "''")}' -Force`,
    ], {
      stdio: 'inherit',
    });
    return;
  }

  await extract(zipPath, { dir: destinationPath });
}

function getExecutablePath() {
  switch (platform) {
    case 'win32':
      return path.join(distDir, 'electron.exe');
    case 'darwin':
      return path.join(distDir, 'Electron.app', 'Contents', 'MacOS', 'Electron');
    case 'linux':
      return path.join(distDir, 'electron');
    default:
      throw new Error(`Unsupported Electron platform: ${platform} (${os.release()})`);
  }
}

module.exports = {
  ELECTRON_VERSION,
  ensureElectronBinary,
  getExecutablePath,
};
