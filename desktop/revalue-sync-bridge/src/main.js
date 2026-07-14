const { spawnSync } = require('child_process');
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { BROKERS, findBroker } = require('./services/brokers');
const { parseDeepLink } = require('./services/deepLink');
const { lookupPublicIp } = require('./services/publicIp');
const { sendStarted, sendFailed, sendCompleted } = require('./services/bridgeCallbackClient');
const { getKisHoldings } = require('./services/kisClient');
const { getTossHoldings } = require('./services/tossClient');
const updateService = require('./services/updateService');


let mainWindow = null;
let autoStartQueued = false;
const state = {
  selectedBroker: 'toss',
  launchRequest: null,
  publicIp: null,
  holdings: [],
  logs: [],
  status: 'ready',
  lastSyncAt: null,
  update: createInitialUpdateState(),
};
let store = null;
let updateCheckTimer = null;
let updateCheckPromise = null;
let notifiedUpdateVersion = null;

const lock = app.requestSingleInstanceLock();
if (!lock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const deepLink = argv.find((arg) => arg.startsWith('revalue://'));
    if (deepLink) {
      state.launchRequest = parseDeepLink(deepLink);
      if (state.launchRequest?.broker) {
        state.selectedBroker = findBroker(state.launchRequest.broker).id;
      }
      addLog('웹에서 요청 수신');
      sendState();
      autoStartSync();
    }

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  store = createStore(app.getPath('userData'));
  importLegacyCredentials();
  const persisted = store.read();
  state.selectedBroker = persisted.selectedBroker || 'toss';
  state.launchRequest = parseDeepLink(process.argv.find((arg) => arg.startsWith('revalue://')));
  if (state.launchRequest?.broker) {
    state.selectedBroker = findBroker(state.launchRequest.broker).id;
  }

  registerProtocol();
  createWindow();
  await refreshPublicIp();

  addLog('응용프로그램 실행');
  if (state.launchRequest) {
    addLog('웹에서 요청 수신');
  }

  autoStartSync();
  startUpdatePolling();


  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
  }
});


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1122,
    height: 796,
    minWidth: 820,
    minHeight: 560,
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    frame: false,
    title: 'ReValue Sync Bridge',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.webContents.on('did-finish-load', () => sendState());
  mainWindow.on('maximize', () => sendState());
  mainWindow.on('unmaximize', () => sendState());
}

function createInitialUpdateState() {
  const config = updateService.getUpdateConfig();
  const enabled = app.isPackaged && config.enabled;
  return {
    configured: enabled,
    currentVersion: config.currentVersionText,
    available: false,
    latestVersion: '',
    releaseNotes: [],
    isChecking: false,
    isDownloading: false,
    downloadProgress: 0,
    downloadUrl: '',
    isInstaller: false,
    statusText: enabled
      ? '업데이트 확인 대기'
      : (config.enabled ? '개발 모드에서는 비활성화' : '업데이트 서버 미설정'),
    lastCheckedAt: null,
  };
}

function buildUpdateState() {
  return {
    configured: state.update.configured,
    currentVersion: state.update.currentVersion,
    available: state.update.available,
    latestVersion: state.update.latestVersion,
    releaseNotes: [...state.update.releaseNotes],
    isChecking: state.update.isChecking,
    isDownloading: state.update.isDownloading,
    downloadProgress: state.update.downloadProgress,
    statusText: state.update.statusText,
    lastCheckedAt: state.update.lastCheckedAt,
  };
}



function registerProtocol() {
  if (process.defaultApp) {
    app.setAsDefaultProtocolClient('revalue', process.execPath, [path.resolve(process.argv[1])]);
    return;
  }

  app.setAsDefaultProtocolClient('revalue');
}

function createStore(userDataPath) {
  const filePath = path.join(userDataPath, 'bridge-store.json');
  const defaults = {
    selectedBroker: 'toss',
    credentials: {},
  };

  return {
    read() {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return { ...defaults, ...JSON.parse(raw) };
      } catch {
        return { ...defaults };
      }
    },
    write(next) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf8');
    },
  };
}

function importLegacyCredentials() {
  if (process.platform !== 'win32') {
    return;
  }

  const persisted = store.read();
  const existing = persisted.credentials || {};
  if (Object.keys(existing).length > 0) {
    return;
  }

  const scriptPath = path.join(__dirname, '..', 'scripts', 'read-legacy-credentials.ps1');
  const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
    encoding: 'utf8',
    windowsHide: true,
  });

  if (result.status !== 0 || !result.stdout.trim()) {
    return;
  }

  try {
    const imported = JSON.parse(result.stdout.trim());
    if (!imported || typeof imported !== 'object' || Object.keys(imported).length === 0) {
      return;
    }

    persisted.credentials = { ...existing, ...imported };
    store.write(persisted);
  } catch {
  }
}

function readCredentials(brokerId = state.selectedBroker) {
  const persisted = store.read();
  return persisted.credentials?.[brokerId] || null;
}

function saveCredentials({ brokerId, appKey, secretInput, accountNo }) {
  const persisted = store.read();
  const existing = persisted.credentials?.[brokerId] || null;
  const secret = secretInput && secretInput !== '****'
    ? secretInput
    : existing?.appSecret || '';

  if (!appKey || !accountNo || !secret) {
    throw new Error('API Key, Secret Key, 계좌번호를 모두 입력해 주세요.');
  }

  persisted.credentials = persisted.credentials || {};
  persisted.credentials[brokerId] = {
    appKey,
    appSecret: secret,
    accountNo,
  };
  persisted.selectedBroker = brokerId;
  store.write(persisted);
  state.selectedBroker = brokerId;
  addLog(`${findBroker(brokerId).name} 인증 정보를 저장했습니다.`);
  sendState();
}

function deleteCredentials(brokerId) {
  const persisted = store.read();
  if (persisted.credentials?.[brokerId]) {
    delete persisted.credentials[brokerId];
    store.write(persisted);
  }
  addLog(`${findBroker(brokerId).name} 저장 키를 삭제했습니다.`);
  sendState();
}

function serializeCredentials(brokerId = state.selectedBroker) {
  const credential = readCredentials(brokerId);
  if (!credential) {
    return {
      brokerId,
      appKey: '',
      accountNo: '',
      secretMasked: false,
      secretPlaceholder: '',
      statusText: '미등록',
    };
  }

  return {
    brokerId,
    appKey: credential.appKey || '',
    accountNo: credential.accountNo || '',
    secretMasked: Boolean(credential.appSecret),
    secretPlaceholder: credential.appSecret ? '****' : '',
    statusText: '완료',
  };
}

function buildState() {
  return {
    selectedBroker: state.selectedBroker,
    launchRequest: state.launchRequest,
    publicIp: state.publicIp,
    holdings: state.holdings,
    logs: state.logs,
    status: state.status,
    lastSyncAt: state.lastSyncAt,
    update: buildUpdateState(),
    brokers: BROKERS,
    credentials: serializeCredentials(),
    windowIsMaximized: mainWindow?.isMaximized() ?? false,
  };
}

function sendState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('bridge:state', buildState());
}

function addLog(message) {
  state.logs.unshift({
    time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
    message,
  });
  sendState();
}

async function refreshPublicIp() {
  try {
    state.publicIp = await lookupPublicIp();
    addLog(`현재 공인 IP 확인: ${state.publicIp}`);
  } catch (error) {
    state.publicIp = `확인 실패: ${formatError(error)}`;
    addLog(`공인 IP 조회 실패: ${formatError(error)}`);
  }
}

function startUpdatePolling() {
  if (!state.update.configured) return;

  const config = updateService.getUpdateConfig();
  void checkForUpdates({ silent: true });

  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
  }

  updateCheckTimer = setInterval(() => {
    void checkForUpdates({ silent: true });
  }, config.checkIntervalMinutes * 60 * 1000);
}

async function checkForUpdates(options = {}) {
  const silent = Boolean(options.silent);
  if (!state.update.configured) {
    sendState();
    return buildState();
  }

  if (updateCheckPromise) {
    return updateCheckPromise;
  }

  state.update.isChecking = true;
  state.update.statusText = '업데이트 확인 중…';
  sendState();

  updateCheckPromise = (async () => {
    try {
      const info = await updateService.checkForUpdate(process.execPath);
      state.update.lastCheckedAt = new Date().toISOString();

      if (!info) {
        state.update.available = false;
        state.update.latestVersion = '';
        state.update.releaseNotes = [];
        state.update.downloadProgress = 0;
        state.update.downloadUrl = '';
        state.update.isInstaller = false;
        state.update.statusText = '최신 버전을 사용 중입니다.';
        return buildState();
      }

      state.update.available = true;
      state.update.latestVersion = info.version;
      state.update.releaseNotes = Array.isArray(info.releaseNotes) ? info.releaseNotes : [];
      state.update.downloadProgress = 0;
      state.update.downloadUrl = info.downloadUrl;
      state.update.isInstaller = Boolean(info.isInstaller);
      state.update.statusText = `${info.version} 업데이트가 준비되었습니다.`;

      if (notifiedUpdateVersion !== info.version) {
        notifiedUpdateVersion = info.version;
        addLog(`새 앱 업데이트 감지: ${info.version}`);
      }

      return buildState();
    } catch (error) {
      state.update.lastCheckedAt = new Date().toISOString();
      state.update.statusText = `업데이트 확인 실패: ${formatError(error)}`;
      if (!silent) {
        addLog(state.update.statusText);
      }
      return buildState();
    } finally {
      state.update.isChecking = false;
      sendState();
      updateCheckPromise = null;
    }
  })();

  return updateCheckPromise;
}

async function applyUpdate() {
  if (!state.update.configured) {
    throw new Error('업데이트 서버가 설정되지 않았습니다.');
  }

  if (state.update.isDownloading) {
    return buildState();
  }

  let info = null;
  if (state.update.available && state.update.downloadUrl) {
    info = {
      version: state.update.latestVersion,
      downloadUrl: state.update.downloadUrl,
      isInstaller: state.update.isInstaller,
      releaseNotes: state.update.releaseNotes,
    };
  } else {
    info = await updateService.checkForUpdate(process.execPath);
  }

  if (!info) {
    state.update.available = false;
    state.update.latestVersion = '';
    state.update.releaseNotes = [];
    state.update.downloadUrl = '';
    state.update.isInstaller = false;
    state.update.statusText = '적용할 새 업데이트가 없습니다.';
    sendState();
    throw new Error('적용할 새 업데이트가 없습니다.');
  }

  state.update.available = true;
  state.update.latestVersion = info.version;
  state.update.releaseNotes = Array.isArray(info.releaseNotes) ? info.releaseNotes : [];
  state.update.downloadUrl = info.downloadUrl;
  state.update.isInstaller = Boolean(info.isInstaller);
  state.update.isDownloading = true;
  state.update.downloadProgress = 0;
  state.update.statusText = '업데이트 다운로드 중…';
  sendState();
  addLog(`업데이트 다운로드 시작: ${info.version}`);

  try {
    await updateService.prepareUpdate(info, {
      currentExePath: process.execPath,
      onProgress: (progress) => {
        state.update.downloadProgress = progress;
        state.update.statusText = `업데이트 다운로드 중… ${progress}%`;
        sendState();
      },
    });

    state.update.statusText = '업데이트 적용을 위해 앱을 다시 시작합니다.';
    sendState();
    addLog(`업데이트 적용 준비 완료: ${info.version}`);
    setTimeout(() => app.quit(), 150);
    return buildState();
  } catch (error) {
    state.update.isDownloading = false;
    state.update.downloadProgress = 0;
    state.update.statusText = `업데이트 실패: ${formatError(error)}`;
    sendState();
    addLog(state.update.statusText);
    throw error;
  }
}


function autoStartSync() {
  if (!state.launchRequest || autoStartQueued || !mainWindow) return;
  autoStartQueued = true;
  setTimeout(() => {
    startSync()
      .catch(() => undefined)
      .finally(() => {
        autoStartQueued = false;
      });
  }, 400);
}

function readAllCredentials() {
  const persisted = store.read();
  return persisted.credentials || {};
}

async function startSync() {
  const allCredentials = readAllCredentials();
  const requestedBrokerId = state.launchRequest?.broker ? findBroker(state.launchRequest.broker).id : null;
  const brokerIds = requestedBrokerId
    ? (allCredentials[requestedBrokerId] ? [requestedBrokerId] : [])
    : Object.keys(allCredentials);

  if (brokerIds.length === 0) {
    const error = requestedBrokerId
      ? new Error(`${findBroker(requestedBrokerId).name} 인증 정보가 없습니다. Settings에서 API Key, Secret Key, 계좌번호를 먼저 저장해 주세요.`)
      : new Error('저장된 증권사 인증 정보가 없습니다. Settings에서 API Key, Secret Key, 계좌번호를 등록해 주세요.');
    state.status = 'failed';
    addLog(`동기화 실패: ${formatError(error)}`);
    sendState();
    throw error;
  }

  state.status = 'running';
  state.holdings = [];
  sendState();
  addLog(requestedBrokerId
    ? `${findBroker(requestedBrokerId).name} API 조회 시작`
    : '등록된 모든 증권사 API 조회 시작');

  if (state.launchRequest) {
    try {
      await sendStarted(state.launchRequest);
    } catch (callbackError) {
      addLog(`시작 알림 전송 실패: ${formatError(callbackError)}`);
    }
  }

  const results = [];
  let hasError = false;

  for (const brokerId of brokerIds) {
    const credential = allCredentials[brokerId];
    if (!credential?.appKey || !credential?.appSecret || !credential?.accountNo) {
      addLog(`${findBroker(brokerId).name}: 인증 정보가 불완전하여 건너뜁니다.`);
      continue;
    }

    addLog(`${findBroker(brokerId).name} 조회 시작`);

    try {
      let holdings;
      if (brokerId === 'toss') {
        holdings = await getTossHoldings(credential, addLog);
      } else if (brokerId === 'kis') {
        holdings = await getKisHoldings(credential, addLog);
      } else {
        addLog(`${findBroker(brokerId).name}는 아직 Electron 실연동이 준비되지 않아 건너뜁니다.`);
        continue;
      }

      const brokerHolding = { brokerId, holdings, accountNo: credential.accountNo };
      results.push(brokerHolding);
      state.holdings.push(...holdings.map((h) => ({ ...h, broker: brokerId })));
      addLog(`${findBroker(brokerId).name} ${holdings.length}건 조회 완료`);
    } catch (brokerError) {
      hasError = true;
      const msg = formatError(brokerError);
      addLog(`${findBroker(brokerId).name} 조회 실패: ${msg}`);

      if (state.launchRequest) {
        try {
          await sendFailed(state.launchRequest, `[${findBroker(brokerId).name}] ${msg}`);
        } catch (callbackError) {
          addLog(`${findBroker(brokerId).name} 실패 상태 전송 실패: ${formatError(callbackError)}`);
        }
      }
    }
  }

  state.lastSyncAt = new Date().toISOString();

  if (results.length === 0) {
    state.status = 'failed';
    sendState();
    const error = new Error('모든 증권사 조회에 실패했습니다.');
    addLog(`동기화 실패: ${formatError(error)}`);
    sendState();
    throw error;
  }

  if (state.launchRequest) {
    try {
      const allHoldings = results.flatMap(({ brokerId, holdings, accountNo }) =>
        holdings.map((h) => ({
          ...h,
          broker: brokerId,
          accountNoMasked: maskAccountNo(accountNo),
        }))
      );
      const callbackBroker = results.length === 1 ? results[0].brokerId : 'multi';
      addLog(`전체 ${results.length}개 증권사 보유주식 ${allHoldings.length}건 웹 반영 요청 전송`);
      await sendCompleted(
        state.launchRequest,
        callbackBroker,
        null,
        allHoldings,
      );
      addLog('웹 DB 반영 완료');
    } catch (callbackError) {
      hasError = true;
      addLog(`웹 반영 실패: ${formatError(callbackError)}`);
    }
  } else {
    addLog('웹 요청 정보가 없어 로컬 미리보기만 갱신했습니다.');
  }

  state.status = hasError ? 'completed_with_errors' : 'completed';
  addLog(hasError
    ? `동기화 완료 (일부 증권사 실패: ${brokerIds.length - results.length}개)`
    : `동기화 완료 (${results.length}개 증권사, ${state.holdings.length}개 종목)`
  );
  sendState();
  return buildState();
}

function formatError(error) {
  if (!error) return '알 수 없는 오류';
  const messages = [];
  let current = error;
  while (current) {
    if (current.message && !messages.includes(current.message.trim())) {
      messages.push(current.message.trim());
    }
    current = current.cause;
  }
  return messages.join(' → ') || '알 수 없는 오류';
}

function maskAccountNo(value) {
  const raw = String(value || '').replace(/[^0-9A-Za-z]/g, '');
  return raw ? `**${raw.slice(-4)}` : null;
}

ipcMain.handle('bridge:get-state', async () => buildState());
ipcMain.handle('bridge:select-broker', async (_event, brokerId) => {
  state.selectedBroker = findBroker(brokerId).id;
  const persisted = store.read();
  persisted.selectedBroker = state.selectedBroker;
  store.write(persisted);
  sendState();
  return buildState();
});
ipcMain.handle('bridge:save-credentials', async (_event, payload) => {
  saveCredentials(payload);
  return serializeCredentials(payload.brokerId);
});
ipcMain.handle('bridge:delete-credentials', async (_event, brokerId) => {
  deleteCredentials(brokerId);
  return serializeCredentials(brokerId);
});
ipcMain.handle('bridge:lookup-public-ip', async () => {
  await refreshPublicIp();
  return state.publicIp;
});
ipcMain.handle('bridge:start-sync', async () => startSync());
ipcMain.handle('bridge:check-updates', async () => checkForUpdates());
ipcMain.handle('bridge:apply-update', async () => applyUpdate());
ipcMain.handle('bridge:window-minimize', async () => {
  mainWindow?.minimize();
  return true;
});
ipcMain.handle('bridge:window-toggle-maximize', async () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
  sendState();
  return mainWindow.isMaximized();
});
ipcMain.handle('bridge:window-close', async () => {
  mainWindow?.close();
  return true;
});
