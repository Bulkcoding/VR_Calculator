const sectionMeta = {
  'holding-list': {
    title: 'Holding List',
    subtitle: '연동된 보유주식 미리보기와 가져오기를 처리합니다.',
  },
  'sync-history': {
    title: 'Sync History',
    subtitle: '동기화 로그만 모아서 확인합니다.',
  },
  settings: {
    title: 'Settings',
    subtitle: '증권사 연동 정보, 공인 IP, 앱 업데이트를 관리합니다.',
  },
};

const state = {
  activeSection: 'holding-list',
  selectedBroker: 'toss',
  credentials: null,
  secretMasked: false,
  status: 'ready',
  publicIp: '확인 중…',
  holdings: [],
  logs: [],
  lastSyncAt: null,
  update: defaultUpdateState(),
  windowIsMaximized: false,
  brokerDropdownOpen: false,
};


const refs = {
  pageTitle: document.getElementById('pageTitle'),
  pageSubtitle: document.getElementById('pageSubtitle'),
  statusPill: document.getElementById('statusPill'),
  titleStatus: document.getElementById('titleStatus'),
  navItems: [...document.querySelectorAll('.nav-item')],
  sections: [...document.querySelectorAll('.section')],
  syncButton: document.getElementById('syncButton'),
  saveButton: document.getElementById('saveButton'),
  deleteButton: document.getElementById('deleteButton'),
  checkUpdateButton: document.getElementById('checkUpdateButton'),
  applyUpdateButton: document.getElementById('applyUpdateButton'),
  brokerSelectField: document.querySelector('.broker-select-field'),
  brokerSelectButton: document.getElementById('brokerSelectButton'),
  brokerSelectLabel: document.getElementById('brokerSelectLabel'),
  brokerSelectMenu: document.getElementById('brokerSelectMenu'),
  appKeyInput: document.getElementById('appKeyInput'),
  secretInput: document.getElementById('secretInput'),
  accountNoInput: document.getElementById('accountNoInput'),
  publicIpText: document.getElementById('publicIpText'),
  credentialStatus: document.getElementById('credentialStatus'),
  currentVersionText: document.getElementById('currentVersionText'),
  latestVersionBadge: document.getElementById('latestVersionBadge'),
  updateStatusText: document.getElementById('updateStatusText'),
  updateNotes: document.getElementById('updateNotes'),
  updateLastCheckedText: document.getElementById('updateLastCheckedText'),
  holdingCount: document.getElementById('holdingCount'),
  lastSyncText: document.getElementById('lastSyncText'),
  holdingsBody: document.getElementById('holdingsBody'),
  logText: document.getElementById('logText'),
  minimizeButton: document.getElementById('minimizeButton'),
  maximizeButton: document.getElementById('maximizeButton'),
  closeButton: document.getElementById('closeButton'),
  dialogBackdrop: document.getElementById('dialogBackdrop'),
  dialogIcon: document.getElementById('dialogIcon'),
  dialogTitle: document.getElementById('dialogTitle'),
  dialogMessage: document.getElementById('dialogMessage'),
  dialogCloseButton: document.getElementById('dialogCloseButton'),
};

function defaultUpdateState() {
  return {
    configured: false,
    currentVersion: '-',
    available: false,
    latestVersion: '',
    releaseNotes: [],
    isChecking: false,
    isDownloading: false,
    downloadProgress: 0,
    statusText: '업데이트 정보 없음',
    lastCheckedAt: null,
  };
}



bootstrap().catch((error) => {
  console.error(error);
});

async function bootstrap() {
  bindEvents();
  const initial = await window.bridgeApp.getState();
  applyState(initial);
  window.bridgeApp.onState((next) => applyState(next));
}

function bindEvents() {
  refs.navItems.forEach((button) => {
    button.addEventListener('click', () => setActiveSection(button.dataset.section));
  });

  refs.brokerSelectButton.addEventListener('click', () => {
    setBrokerDropdownOpen(!state.brokerDropdownOpen);
  });

  refs.brokerSelectMenu.addEventListener('click', async (event) => {
    const option = event.target instanceof Element
      ? event.target.closest('[data-broker-id]')
      : null;
    if (!option) return;

    const nextBroker = option.dataset.brokerId;
    const next = await window.bridgeApp.selectBroker(nextBroker);
    setBrokerDropdownOpen(false);
    applyState(next);
  });

  document.addEventListener('click', (event) => {
    if (!refs.brokerSelectField.contains(event.target)) {
      setBrokerDropdownOpen(false);
    }
  });

  refs.secretInput.addEventListener('focus', () => {
    if (state.secretMasked) {
      refs.secretInput.value = '';
      state.secretMasked = false;
    }
  });

  refs.syncButton.addEventListener('click', async () => {
    refs.syncButton.disabled = true;
    try {
      await window.bridgeApp.startSync();
    } catch (error) {
      showDialog('error', '동기화 실패', error.message || '동기화에 실패했습니다.');
    } finally {
      refs.syncButton.disabled = false;
    }
  });

  refs.saveButton.addEventListener('click', async () => {
    try {
      const result = await window.bridgeApp.saveCredentials({
        brokerId: state.selectedBroker,
        appKey: refs.appKeyInput.value.trim(),
        secretInput: refs.secretInput.value.trim(),
        accountNo: refs.accountNoInput.value.trim(),
      });
      state.secretMasked = result.secretMasked;
      applyCredentials(result);
      showDialog('success', '인증 정보 저장', '현재 증권사 연동 정보를 저장했습니다.');
    } catch (error) {
      showDialog('error', '인증 정보 저장 실패', error.message || '인증 정보 저장에 실패했습니다.');
    }
  });

  refs.deleteButton.addEventListener('click', async () => {
    const result = await window.bridgeApp.deleteCredentials(state.selectedBroker);
    state.secretMasked = result.secretMasked;
    applyCredentials(result);
    showDialog('info', '인증 정보 삭제', '현재 증권사의 저장된 연동 정보를 지웠습니다.');
  });

  refs.checkUpdateButton.addEventListener('click', async () => {
    try {
      const next = await window.bridgeApp.checkForUpdates();
      applyState(next);
      if (!next.update?.available) {
        showDialog('info', '업데이트 확인', next.update?.statusText || '최신 버전을 사용 중입니다.');
      }
    } catch (error) {
      showDialog('error', '업데이트 확인 실패', error.message || '업데이트 확인에 실패했습니다.');
    }
  });

  refs.applyUpdateButton.addEventListener('click', async () => {
    try {
      await window.bridgeApp.applyUpdate();
    } catch (error) {
      showDialog('error', '업데이트 적용 실패', error.message || '업데이트 적용에 실패했습니다.');
    }
  });


  refs.minimizeButton.addEventListener('click', () => {
    window.bridgeApp.minimizeWindow();
  });

  refs.maximizeButton.addEventListener('click', async () => {
    await window.bridgeApp.toggleMaximizeWindow();
  });

  refs.closeButton.addEventListener('click', () => {
    window.bridgeApp.closeWindow();
  });

  refs.dialogCloseButton.addEventListener('click', hideDialog);
  refs.dialogBackdrop.addEventListener('click', (event) => {
    if (event.target === refs.dialogBackdrop) {
      hideDialog();
    }
  });
}

function setActiveSection(sectionId) {
  state.activeSection = sectionId;
  refs.navItems.forEach((button) => {
    button.classList.toggle('active', button.dataset.section === sectionId);
  });
  refs.sections.forEach((section) => {
    section.classList.toggle('active', section.dataset.section === sectionId);
  });

  const meta = sectionMeta[sectionId];
  refs.pageTitle.textContent = meta.title;
  refs.pageSubtitle.textContent = meta.subtitle;
}
function setBrokerDropdownOpen(open) {
  state.brokerDropdownOpen = Boolean(open);
  refs.brokerSelectButton.setAttribute('aria-expanded', state.brokerDropdownOpen ? 'true' : 'false');
  refs.brokerSelectMenu.classList.toggle('hidden', !state.brokerDropdownOpen);
}


function applyState(next) {
  state.selectedBroker = next.selectedBroker;
  state.status = next.status;
  state.publicIp = next.publicIp || '확인 중…';
  state.holdings = Array.isArray(next.holdings) ? next.holdings : [];
  state.logs = Array.isArray(next.logs) ? next.logs : [];
  state.lastSyncAt = next.lastSyncAt || null;
  state.credentials = next.credentials || null;
  state.secretMasked = Boolean(next.credentials?.secretMasked);
  state.update = next.update || defaultUpdateState();
  state.windowIsMaximized = Boolean(next.windowIsMaximized);

  renderBrokerOptions(next.brokers || []);
  applyCredentials(next.credentials || null);
  renderHeader();
  renderUpdate();
  renderHoldingList(next.brokers || []);
  renderLogs();
}

function renderBrokerOptions(brokers) {
  refs.brokerSelectMenu.innerHTML = brokers
    .map((broker) => {
      const selected = broker.id === state.selectedBroker;
      return `
        <button type="button" class="broker-select-option${selected ? ' active' : ''}" data-broker-id="${broker.id}" role="option" aria-selected="${selected ? 'true' : 'false'}">
          <span>${escapeHtml(broker.name)}</span>
          <span class="broker-select-option-check">${selected ? '✓' : ''}</span>
        </button>
      `;
    })
    .join('');

  const selectedBroker = brokers.find((broker) => broker.id === state.selectedBroker);
  refs.brokerSelectLabel.textContent = selectedBroker?.name || state.selectedBroker;
}


function applyCredentials(credentials) {
  const safe = credentials || {
    appKey: '',
    accountNo: '',
    secretPlaceholder: '',
    statusText: '미등록',
    secretMasked: false,
  };

  refs.appKeyInput.value = safe.appKey || '';
  refs.accountNoInput.value = safe.accountNo || '';
  refs.secretInput.value = safe.secretPlaceholder || '';
  refs.credentialStatus.textContent = safe.statusText || '미등록';
  state.secretMasked = Boolean(safe.secretMasked);
}

function renderHeader() {
  refs.statusPill.textContent = state.status;
  refs.titleStatus.textContent = state.status;
  refs.maximizeButton.textContent = state.windowIsMaximized ? '❐' : '□';
  refs.publicIpText.textContent = state.publicIp || '확인 중…';
  setBrokerDropdownOpen(state.brokerDropdownOpen);
}

function renderUpdate() {
  const update = state.update || defaultUpdateState();
  refs.currentVersionText.textContent = `현재 버전 ${update.currentVersion || '-'}`;
  refs.updateStatusText.textContent = update.statusText || '업데이트 확인 대기';
  refs.updateLastCheckedText.textContent = update.lastCheckedAt
    ? `마지막 확인: ${formatDateTime(update.lastCheckedAt)}`
    : '마지막 확인: -';

  if (!update.configured) {
    refs.latestVersionBadge.textContent = '비활성화';
  } else if (update.isDownloading) {
    refs.latestVersionBadge.textContent = `${update.downloadProgress}%`;
  } else if (update.available && update.latestVersion) {
    refs.latestVersionBadge.textContent = update.latestVersion;
  } else {
    refs.latestVersionBadge.textContent = '최신';
  }

  refs.checkUpdateButton.disabled = !update.configured || update.isChecking || update.isDownloading;
  refs.checkUpdateButton.textContent = update.isChecking ? '확인 중...' : '지금 확인';
  refs.applyUpdateButton.disabled = !update.configured || !update.available || update.isDownloading;
  refs.applyUpdateButton.textContent = update.isDownloading
    ? `다운로드 중... ${update.downloadProgress}%`
    : '업데이트 적용';

  if (Array.isArray(update.releaseNotes) && update.releaseNotes.length > 0) {
    refs.updateNotes.innerHTML = update.releaseNotes
      .map((note) => `<li>${escapeHtml(note)}</li>`)
      .join('');
    refs.updateNotes.classList.remove('hidden');
  } else {
    refs.updateNotes.innerHTML = '';
    refs.updateNotes.classList.add('hidden');
  }
}

function renderHoldingList() {
  refs.holdingCount.textContent = `총 ${state.holdings.length}개 종목`;
  refs.lastSyncText.textContent = state.lastSyncAt
    ? `마지막 동기화: ${formatDateTime(state.lastSyncAt)}`
    : '마지막 동기화: -';

  if (state.holdings.length === 0) {
    refs.holdingsBody.innerHTML = '<tr><td colspan="5" class="empty-cell">아직 불러온 보유주식이 없습니다.</td></tr>';
    return;
  }

  refs.holdingsBody.innerHTML = state.holdings.map((holding) => {
    const marketValue = holding.currentPrice == null ? null : holding.currentPrice * holding.quantity;
    return `
      <tr>
        <td>
          <div><strong>${escapeHtml(holding.name)}</strong></div>
          <div class="muted">${escapeHtml(holding.ticker)} · ${escapeHtml(holding.broker || state.selectedBroker)}</div>
        </td>
        <td>${formatNumber(holding.quantity)}</td>
        <td>${formatMoney(holding.avgPrice, holding.currency)}</td>
        <td>${formatMoney(holding.currentPrice, holding.currency)}</td>
        <td>${formatMoney(marketValue, holding.currency)}</td>
      </tr>
    `;
  }).join('');
}

function renderLogs() {
  refs.logText.value = state.logs
    .map((line) => `[${line.time}] ${line.message}`)
    .join('\n');
  refs.logText.scrollTop = 0;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 4 }).format(Number(value || 0));
}

function formatMoney(value, currency = 'KRW') {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'KRW' ? 0 : 2,
  }).format(Number(value));
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function showDialog(kind, title, message) {
  const variants = {
    error: { icon: '!', background: '#fee2e2', color: '#b91c1c' },
    success: { icon: '✓', background: '#dcfce7', color: '#166534' },
    info: { icon: 'i', background: '#dbeafe', color: '#1d4ed8' },
  };
  const variant = variants[kind] || variants.info;

  refs.dialogIcon.textContent = variant.icon;
  refs.dialogIcon.style.background = variant.background;
  refs.dialogIcon.style.color = variant.color;
  refs.dialogTitle.textContent = title;
  refs.dialogMessage.textContent = message;
  refs.dialogBackdrop.classList.remove('hidden');
  refs.dialogBackdrop.setAttribute('aria-hidden', 'false');
}

function hideDialog() {
  refs.dialogBackdrop.classList.add('hidden');
  refs.dialogBackdrop.setAttribute('aria-hidden', 'true');
}
