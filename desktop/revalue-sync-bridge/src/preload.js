const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bridgeApp', {
  getState: () => ipcRenderer.invoke('bridge:get-state'),
  selectBroker: (brokerId) => ipcRenderer.invoke('bridge:select-broker', brokerId),
  saveCredentials: (payload) => ipcRenderer.invoke('bridge:save-credentials', payload),
  deleteCredentials: (brokerId) => ipcRenderer.invoke('bridge:delete-credentials', brokerId),
  lookupPublicIp: () => ipcRenderer.invoke('bridge:lookup-public-ip'),
  startSync: () => ipcRenderer.invoke('bridge:start-sync'),
  checkForUpdates: () => ipcRenderer.invoke('bridge:check-updates'),
  applyUpdate: () => ipcRenderer.invoke('bridge:apply-update'),
  minimizeWindow: () => ipcRenderer.invoke('bridge:window-minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('bridge:window-toggle-maximize'),
  closeWindow: () => ipcRenderer.invoke('bridge:window-close'),
  onState: (callback) => {
    const handler = (_event, value) => callback(value);
    ipcRenderer.on('bridge:state', handler);
    return () => ipcRenderer.removeListener('bridge:state', handler);
  },
});
