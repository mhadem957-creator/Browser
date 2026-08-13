// preload.js
// Runs in an isolated world with Node access, but the renderer only ever
// sees the whitelisted, side-effect-scoped API below (contextIsolation: true,
// sandbox: true, nodeIntegration: false).

const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, ...args) => callback(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('electronAPI', {
  // --- Custom frameless window controls ---
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onWindowMaximizedChanged: (callback) => subscribe('window:maximized-changed', callback),

  // --- Cross-tab events originating from the main process ---
  // (e.g. target="_blank" links or "Open Link in New Tab" from the native
  // context menu, both intercepted in main.js for security.)
  onOpenNewTab: (callback) => subscribe('webview:open-new-tab', callback),

  // --- Misc ---
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  platform: process.platform,
});
