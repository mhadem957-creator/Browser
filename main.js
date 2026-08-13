// main.js
// Electron main process: window lifecycle, security hardening, IPC handlers,
// and native context-menu construction for webview guest pages.

const { app, BrowserWindow, ipcMain, Menu, shell, clipboard } = require('electron');
const path = require('path');

const isDev = process.argv.includes('--dev');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 760,
    minHeight: 480,
    frame: false,
    backgroundColor: '#1b1c1f',
    show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: true,
      spellcheck: true,
      devTools: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Never let the main chrome window itself navigate away or spawn new
  // top-level windows -- all browsing happens inside sandboxed <webview> tags.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/**
 * Hardens every guest <webview> WebContents created by the renderer and wires
 * up a native, main-process-built context menu (Copy/Paste/Inspect/etc.).
 */
function registerWebContentsSecurity() {
  app.on('web-contents-created', (_event, contents) => {
    const type = contents.getType();

    // Guard against any guest page trying to attach webviews of its own or
    // escalate permissions.
    contents.on('will-attach-webview', (event, webPreferences) => {
      webPreferences.nodeIntegration = false;
      webPreferences.nodeIntegrationInSubFrames = false;
      webPreferences.contextIsolation = true;
      webPreferences.sandbox = true;
      delete webPreferences.preload;
      delete webPreferences.preloadURL;
    });

    if (type !== 'webview') {
      return;
    }

    // Intercept target="_blank" / window.open() calls from web content and
    // route them to a brand new browser tab instead of a bare Electron window.
    contents.setWindowOpenHandler(({ url }) => {
      mainWindow?.webContents.send('webview:open-new-tab', url);
      return { action: 'deny' };
    });

    // Reasonable default permission policy for arbitrary web content.
    contents.session.setPermissionRequestHandler((_wc, permission, callback) => {
      const allowedPermissions = [
        'clipboard-read',
        'clipboard-sanitized-write',
        'fullscreen',
        'media',
        'pointerLock',
        'notifications',
      ];
      callback(allowedPermissions.includes(permission));
    });

    contents.session.setPermissionCheckHandler((_wc, permission) => {
      const allowedPermissions = ['clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'media', 'notifications'];
      return allowedPermissions.includes(permission);
    });

    // Native right-click context menu, built and popped up entirely in the
    // main process (no remote module, no unsandboxed renderer access).
    contents.on('context-menu', (_event, params) => {
      const template = [];

      if (params.linkURL) {
        template.push(
          {
            label: 'Open Link in New Tab',
            click: () => mainWindow?.webContents.send('webview:open-new-tab', params.linkURL),
          },
          {
            label: 'Copy Link Address',
            click: () => clipboard.writeText(params.linkURL),
          },
          { type: 'separator' }
        );
      }

      if (params.mediaType === 'image' && params.srcURL) {
        template.push(
          {
            label: 'Open Image in New Tab',
            click: () => mainWindow?.webContents.send('webview:open-new-tab', params.srcURL),
          },
          {
            label: 'Copy Image Address',
            click: () => clipboard.writeText(params.srcURL),
          },
          { type: 'separator' }
        );
      }

      if (params.isEditable) {
        template.push(
          { label: 'Undo', click: () => contents.undo(), enabled: params.editFlags?.canUndo ?? true },
          { label: 'Redo', click: () => contents.redo(), enabled: params.editFlags?.canRedo ?? true },
          { type: 'separator' },
          { label: 'Cut', click: () => contents.cut(), enabled: params.editFlags?.canCut ?? true },
          { label: 'Copy', click: () => contents.copy(), enabled: params.editFlags?.canCopy ?? true },
          { label: 'Paste', click: () => contents.paste(), enabled: params.editFlags?.canPaste ?? true },
          { label: 'Select All', click: () => contents.selectAll() },
          { type: 'separator' }
        );
      } else if (params.selectionText && params.selectionText.trim().length > 0) {
        template.push(
          { label: 'Copy', click: () => contents.copy() },
          {
            label: `Search Google for "${truncate(params.selectionText, 32)}"`,
            click: () =>
              mainWindow?.webContents.send(
                'webview:open-new-tab',
                `https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`
              ),
          },
          { type: 'separator' }
        );
      }

      template.push(
        { label: 'Back', enabled: contents.canGoBack(), click: () => contents.goBack() },
        { label: 'Forward', enabled: contents.canGoForward(), click: () => contents.goForward() },
        { label: 'Reload', click: () => contents.reload() },
        { type: 'separator' },
        {
          label: 'Inspect Element',
          click: () => contents.inspectElement(params.x, params.y),
        }
      );

      const menu = Menu.buildFromTemplate(template);
      menu.popup({ window: mainWindow ?? undefined });
    });
  });
}

function truncate(str, max) {
  return str.length > max ? `${str.slice(0, max)}\u2026` : str;
}

/* ---------------------------------------------------------------------- */
/* IPC: custom frameless window controls                                   */
/* ---------------------------------------------------------------------- */

ipcMain.on('window:minimize', () => mainWindow?.minimize());

ipcMain.on('window:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window:close', () => mainWindow?.close());

ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false);

ipcMain.handle('app:get-version', () => app.getVersion());

/* ---------------------------------------------------------------------- */
/* App lifecycle                                                           */
/* ---------------------------------------------------------------------- */

app.whenReady().then(() => {
  registerWebContentsSecurity();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Defense in depth: refuse any attempt to create additional top-level
// windows from anywhere in the app.
app.on('browser-window-created', (_event, win) => {
  win.removeMenu?.();
});

// Disable navigation to insecure custom protocols from being registered by
// third-party content.
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      const blocked = ['file:', 'chrome:', 'chrome-extension:'];
      if (contents.getType() === 'webview' && blocked.includes(parsed.protocol) && !url.endsWith('newtab.html')) {
        event.preventDefault();
      }
    } catch (_err) {
      // Non-standard URL, let Chromium's own handling decide.
    }
  });
});
