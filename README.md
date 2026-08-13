# ElectronBrowser

A secure, multi-tab desktop web browser built with Electron, vanilla JS, HTML, and CSS. No frontend framework, no bundler required — clone and run.

## Features

- **Dynamic multi-tab system** — open, close (`Ctrl/Cmd+W`), switch (`Ctrl/Cmd+Tab`), and middle-click-close tabs, each backed by its own isolated `<webview>` guest.
- **Smart omnibox** — type a URL and it navigates directly; type anything else and it searches Google.
- **Full navigation controls** — Back, Forward, Reload/Stop, Home, all synced live to the active tab.
- **Native right-click context menu** — Copy/Cut/Paste, Select All, Undo/Redo, Open Link in New Tab, Copy Link/Image Address, Inspect Element — built in the main process, not the DOM.
- **Security-first architecture** — `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` everywhere, a locked-down `preload.js` bridge, a strict `Content-Security-Policy`, and a main-process `setWindowOpenHandler`/permission policy guarding every guest page.
- **Custom frameless dark UI** — Chrome-style tab strip, rounded omnibox, window controls, and a local new-tab page.
- **Full media support** — HTML5 video/audio, fullscreen, clipboard, and other standard web platform APIs work inside tabs out of the box.

## Folder Structure

```
electron-browser/
├── .github/
│   └── workflows/
│       └── build.yml        # CI: builds .exe/.dmg/.AppImage on release publish
├── build/
│   ├── icon.png              # Source app icon (auto-converted per platform)
│   └── icon.ico               # Windows icon
├── assets/                    # Reserved for extra static assets
├── index.html                 # App shell: titlebar, tab strip, toolbar
├── styles.css                 # Dark theme
├── renderer.js                 # Tab state, omnibox logic, UI sync
├── newtab.html                 # Local home / new-tab page
├── main.js                     # Main process: windows, IPC, security, context menu
├── preload.js                  # contextBridge: the only main<->renderer bridge
├── package.json
├── .gitignore
└── README.md
```

## Getting Started (local development)

Requires Node.js 18+.

```bash
npm install
npm start        # or: npm run dev  (opens DevTools)
```

## Building Standalone Binaries

Binaries are produced with [electron-builder](https://www.electron.build/) and written to `dist/`.

```bash
# Build for your current OS
npm run dist

# Build for a specific target (cross-compiling has platform limitations —
# building macOS .dmg files requires running on macOS)
npm run dist:win     # -> dist/*.exe (NSIS installer)
npm run dist:mac     # -> dist/*.dmg
npm run dist:linux   # -> dist/*.AppImage
```

The app icon is auto-generated for each platform from `build/icon.png`. Swap that file (and `build/icon.ico`) with your own branding before shipping.

## Automated Releases (GitHub Actions)

`.github/workflows/build.yml` runs on every **published GitHub Release** (or manually via `workflow_dispatch`), building on `windows-latest`, `macos-latest`, and `ubuntu-latest` in parallel and uploading the resulting `.exe`, `.dmg`, and `.AppImage` as both release assets and workflow artifacts.

To use it:
1. Push this repo to GitHub.
2. Draft a new Release (e.g. tag `v1.0.0`) and publish it.
3. The workflow runs automatically and attaches installers to that release. No extra secrets needed — it uses the default `GITHUB_TOKEN`.

## Security Model

- Every `<webview>` runs with `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`.
- `preload.js` exposes only a narrow, whitelisted API (`window.electronAPI`) via `contextBridge` — no raw `ipcRenderer`, `require`, or Node globals reach the page.
- `window.open()` / `target="_blank"` from any web page is intercepted in the main process and redirected into a new sandboxed tab instead of an uncontrolled BrowserWindow.
- The native context menu is built and popped up entirely in the main process; the renderer never receives elevated privileges to perform clipboard/inspect actions itself.
- A strict `Content-Security-Policy` is set on the app shell (`index.html`) itself.

## License

MIT
