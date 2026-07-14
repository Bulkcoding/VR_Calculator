const { spawn } = require('child_process');
const path = require('path');
const { ensureElectronBinary } = require('./electronBinary');

async function main() {
  const binaryPath = await ensureElectronBinary();
  const appDir = path.resolve(__dirname, '..');
  const extraArgs = process.argv.slice(2);
  const args = extraArgs.length > 0 ? extraArgs : ['.'];

  const child = spawn(binaryPath, args, {
    cwd: appDir,
    stdio: 'inherit',
    windowsHide: false,
  });

  child.on('close', (code, signal) => {
    if (code === null) {
      console.error(`${binaryPath} exited with signal ${signal}`);
      process.exit(1);
      return;
    }

    process.exit(code);
  });
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
