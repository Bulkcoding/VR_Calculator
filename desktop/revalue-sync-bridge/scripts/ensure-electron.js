const { ensureElectronBinary } = require('./electronBinary');

ensureElectronBinary()
  .then((binaryPath) => {
    console.log(`Electron binary ready: ${binaryPath}`);
  })
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
