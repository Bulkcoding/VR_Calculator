const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');
const { ensureElectronBinary } = require('./electronBinary');

const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');
const packagingDir = path.join(appDir, '.packaging');
const prepackagedDir = path.join(packagingDir, 'win-unpacked');
const generatedPackagePath = path.join(prepackagedDir, 'resources', 'app', 'package.json');
const generatedIconPath = path.join(packagingDir, 'icon.ico');
const generatedSquarePngPath = path.join(packagingDir, 'icon-square.png');
const releaseDir = path.join(appDir, 'release');
const executableName = 'ReValue Sync Bridge.exe';

async function main() {
  const executablePath = await ensureElectronBinary();
  await prepareGeneratedIcon();
  preparePrepackagedApp(path.dirname(executablePath));
  runElectronBuilder();
  verifyArtifacts();
}

async function prepareGeneratedIcon() {
  const iconSource = getIconSourcePath();
  fs.mkdirSync(packagingDir, { recursive: true });
  generateSquarePng(iconSource, generatedSquarePngPath);
  const iconBuffer = await pngToIco(generatedSquarePngPath);
  fs.writeFileSync(generatedIconPath, iconBuffer);
}

function getIconSourcePath() {
  const candidates = [
    path.join(repoRoot, 'output', 'imagegen', 'revalue-icon-transparent.png'),
    path.join(repoRoot, 'public', 'branding', 'revalue-green.png'),
  ];

  const iconPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!iconPath) {
    throw new Error('Packaging icon source not found.');
  }

  return iconPath;
}

function generateSquarePng(sourcePath, destinationPath) {
  const powershellCommand = [
    'Add-Type -AssemblyName System.Drawing',
    `$src = '${escapeForPowerShell(sourcePath)}'`,
    `$dst = '${escapeForPowerShell(destinationPath)}'`,
    '$img = [System.Drawing.Image]::FromFile($src)',
    '$size = [Math]::Max($img.Width, $img.Height)',
    '$bmp = New-Object System.Drawing.Bitmap $size, $size',
    '$gfx = [System.Drawing.Graphics]::FromImage($bmp)',
    '$gfx.Clear([System.Drawing.Color]::Transparent)',
    '$gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic',
    '$gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality',
    '$gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality',
    '$x = [int](($size - $img.Width) / 2)',
    '$y = [int](($size - $img.Height) / 2)',
    '$gfx.DrawImage($img, $x, $y, $img.Width, $img.Height)',
    '$bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)',
    '$gfx.Dispose()',
    '$bmp.Dispose()',
    '$img.Dispose()',
  ].join('; ');

  const result = spawnSync('powershell', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    powershellCommand,
  ], {
    stdio: 'inherit',
  });

  if (result.status !== 0 || !fs.existsSync(destinationPath)) {
    throw new Error('Failed to generate square packaging icon.');
  }
}

function escapeForPowerShell(value) {
  return value.replace(/'/g, "''");
}

function preparePrepackagedApp(electronDistDir) {
  fs.rmSync(prepackagedDir, { recursive: true, force: true });
  fs.mkdirSync(prepackagedDir, { recursive: true });
  fs.cpSync(electronDistDir, prepackagedDir, { recursive: true, force: true });

  const stagedExecutablePath = path.join(prepackagedDir, 'electron.exe');
  const renamedExecutablePath = path.join(prepackagedDir, executableName);
  if (fs.existsSync(stagedExecutablePath)) {
    fs.renameSync(stagedExecutablePath, renamedExecutablePath);
  }

  fs.rmSync(path.join(prepackagedDir, 'resources', 'default_app.asar'), { force: true });

  const appResourcesDir = path.join(prepackagedDir, 'resources', 'app');
  fs.mkdirSync(appResourcesDir, { recursive: true });
  fs.cpSync(path.join(appDir, 'src'), path.join(appResourcesDir, 'src'), { recursive: true, force: true });
  fs.mkdirSync(path.join(appResourcesDir, 'scripts'), { recursive: true });
  fs.copyFileSync(
    path.join(appDir, 'scripts', 'read-legacy-credentials.ps1'),
    path.join(appResourcesDir, 'scripts', 'read-legacy-credentials.ps1')
  );

  const sourcePackage = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'));
  const runtimePackage = {
    name: sourcePackage.name,
    productName: sourcePackage.productName,
    version: sourcePackage.version,
    description: sourcePackage.description,
    main: sourcePackage.main,
    repository: sourcePackage.repository,
    revalueUpdate: sourcePackage.revalueUpdate,
  };
  fs.writeFileSync(generatedPackagePath, JSON.stringify(runtimePackage, null, 2), 'utf8');
}

function runElectronBuilder() {
  fs.rmSync(releaseDir, { recursive: true, force: true });

  const builderCommand = process.platform === 'win32'
    ? path.join(appDir, 'node_modules', '.bin', 'electron-builder.cmd')
    : path.join(appDir, 'node_modules', '.bin', 'electron-builder');
  const args = [
    '--win',
    'nsis',
    'portable',
    '--x64',
    '--publish',
    'never',
    '--projectDir',
    appDir,
    '--prepackaged',
    prepackagedDir,
  ];

  const result = spawnSync(builderCommand, args, {
    cwd: appDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
      ELECTRON_SKIP_BINARY_DOWNLOAD: '1',
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`electron-builder failed with exit code ${result.status}`);
  }
}

function verifyArtifacts() {
  if (!fs.existsSync(releaseDir)) {
    throw new Error('Release directory was not created.');
  }

  const files = fs.readdirSync(releaseDir).filter((file) => file.toLowerCase().endsWith('.exe'));
  if (files.length === 0) {
    throw new Error('No Windows executable artifacts were produced.');
  }

  console.log('Windows artifacts ready:');
  for (const file of files) {
    console.log(`- ${path.join(releaseDir, file)}`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
