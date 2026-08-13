// renderer.js
// Runs with nodeIntegration disabled; the only privileged surface available
// is window.electronAPI, exposed via preload.js's contextBridge.

(() => {
  'use strict';

  const HOME_PAGE = new URL('newtab.html', window.location.href).href;
  const SEARCH_ENGINE_URL = 'https://www.google.com/search?q=';

  /** @type {Map<string, TabRecord>} */
  const tabs = new Map();
  let activeTabId = null;
  let tabCounter = 0;

  // --- DOM references -----------------------------------------------------
  const tabStrip = document.getElementById('tab-strip');
  const webviewContainer = document.getElementById('webview-container');
  const addressBar = document.getElementById('address-bar');
  const securityIcon = document.getElementById('security-icon');

  const backBtn = document.getElementById('back-btn');
  const forwardBtn = document.getElementById('forward-btn');
  const reloadBtn = document.getElementById('reload-btn');
  const reloadIcon = document.getElementById('reload-icon');
  const stopIcon = document.getElementById('stop-icon');
  const homeBtn = document.getElementById('home-btn');
  const newTabBtn = document.getElementById('new-tab-btn');
  const bookmarkBtn = document.getElementById('bookmark-btn');
  const bookmarkIcon = document.getElementById('bookmark-icon');

  const minBtn = document.getElementById('min-btn');
  const maxBtn = document.getElementById('max-btn');
  const closeBtn = document.getElementById('close-btn');

  const defaultFaviconMarkup = document.getElementById('default-favicon-svg').outerHTML;
  const defaultFaviconDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(
    defaultFaviconMarkup.replace('id="default-favicon-svg"', '')
  )}`;

  const bookmarks = new Set(); // stores URLs, in-memory only

  /**
   * @typedef {Object} TabRecord
   * @property {string} id
   * @property {HTMLElement} webview
   * @property {HTMLElement} tabEl
   * @property {HTMLElement} titleEl
   * @property {HTMLImageElement} faviconEl
   * @property {string} title
   * @property {string} url
   * @property {boolean} isLoading
   */

  // -------------------------------------------------------------------------
  // Omnibox / smart address resolution
  // -------------------------------------------------------------------------

  function looksLikeUrl(text) {
    if (/\s/.test(text)) return false;
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(text)) return true; // explicit scheme
    if (/^localhost(:\d+)?(\/.*)?$/i.test(text)) return true;
    if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(text)) return true; // IPv4
    // domain.tld[/path][:port]
    return /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/.test(text);
  }

  function resolveOmniboxInput(rawInput) {
    const text = rawInput.trim();
    if (!text) return HOME_PAGE;

    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(text)) {
      return text; // already has a scheme
    }
    if (looksLikeUrl(text)) {
      return `https://${text}`;
    }
    return `${SEARCH_ENGINE_URL}${encodeURIComponent(text)}`;
  }

  // -------------------------------------------------------------------------
  // Tab lifecycle
  // -------------------------------------------------------------------------

  function createTab(url, { activate = true } = {}) {
    const id = `tab-${++tabCounter}`;
    const targetUrl = url || HOME_PAGE;

    const webview = document.createElement('webview');
    webview.setAttribute('src', targetUrl);
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('partition', 'persist:browsing');
    webview.setAttribute('webpreferences', 'contextIsolation=yes, sandbox=yes, nodeIntegration=no');
    webview.className = 'browser-webview hidden-tab';
    webview.id = id;
    webviewContainer.appendChild(webview);

    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.tabId = id;

    const faviconEl = document.createElement('img');
    faviconEl.className = 'tab-favicon';
    faviconEl.src = defaultFaviconDataUrl;
    faviconEl.alt = '';

    const titleEl = document.createElement('span');
    titleEl.className = 'tab-title';
    titleEl.textContent = 'New Tab';

    const closeEl = document.createElement('button');
    closeEl.className = 'tab-close';
    closeEl.title = 'Close Tab';
    closeEl.textContent = '\u00D7';

    tabEl.append(faviconEl, titleEl, closeEl);
    tabStrip.appendChild(tabEl);

    /** @type {TabRecord} */
    const record = {
      id,
      webview,
      tabEl,
      titleEl,
      faviconEl,
      title: 'New Tab',
      url: targetUrl,
      isLoading: true,
    };
    tabs.set(id, record);

    tabEl.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) return;
      setActiveTab(id);
    });
    closeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(id);
    });
    tabEl.addEventListener('auxclick', (e) => {
      if (e.button === 1) closeTab(id); // middle-click closes tab
    });

    attachWebviewListeners(record);

    if (activate) setActiveTab(id);
    return id;
  }

  function attachWebviewListeners(record) {
    const { webview } = record;

    webview.addEventListener('did-start-loading', () => {
      record.isLoading = true;
      record.faviconEl.classList.add('loading');
      if (record.id === activeTabId) updateReloadStopButton(true);
    });

    webview.addEventListener('did-stop-loading', () => {
      record.isLoading = false;
      record.faviconEl.classList.remove('loading');
      if (record.id === activeTabId) {
        updateReloadStopButton(false);
        updateNavButtons(record);
      }
    });

    webview.addEventListener('page-title-updated', (e) => {
      record.title = e.title || record.url;
      record.titleEl.textContent = record.title;
      record.titleEl.title = record.title;
    });

    webview.addEventListener('page-favicon-updated', (e) => {
      if (e.favicons && e.favicons.length > 0) {
        record.faviconEl.src = e.favicons[0];
      } else {
        record.faviconEl.src = defaultFaviconDataUrl;
      }
    });

    webview.addEventListener('did-navigate', (e) => {
      record.url = e.url;
      if (record.id === activeTabId) {
        syncAddressBar(record);
        updateNavButtons(record);
      }
    });

    webview.addEventListener('did-navigate-in-page', (e) => {
      record.url = e.url;
      if (record.id === activeTabId) {
        syncAddressBar(record);
        updateNavButtons(record);
      }
    });

    webview.addEventListener('did-fail-load', (e) => {
      // -3 is a benign "aborted" (e.g. user navigated away mid-load).
      if (e.errorCode === -3) return;
      if (e.isMainFrame) {
        record.isLoading = false;
        record.title = 'Page failed to load';
        record.titleEl.textContent = record.title;
      }
    });

    webview.addEventListener('dom-ready', () => {
      if (record.id === activeTabId) updateNavButtons(record);
    });
  }

  function setActiveTab(id) {
    const record = tabs.get(id);
    if (!record) return;

    if (activeTabId && tabs.has(activeTabId)) {
      const prev = tabs.get(activeTabId);
      prev.webview.classList.add('hidden-tab');
      prev.tabEl.classList.remove('active');
    }

    activeTabId = id;
    record.webview.classList.remove('hidden-tab');
    record.tabEl.classList.add('active');
    record.tabEl.scrollIntoView({ inline: 'nearest', block: 'nearest' });

    syncAddressBar(record);
    updateNavButtons(record);
    updateReloadStopButton(record.isLoading);
    updateBookmarkIcon(record.url);
  }

  function closeTab(id) {
    const record = tabs.get(id);
    if (!record) return;

    const wasActive = id === activeTabId;
    const ids = Array.from(tabs.keys());
    const index = ids.indexOf(id);

    record.webview.remove();
    record.tabEl.remove();
    tabs.delete(id);

    if (tabs.size === 0) {
      createTab(HOME_PAGE, { activate: true });
      return;
    }

    if (wasActive) {
      const remaining = Array.from(tabs.keys());
      const nextIndex = Math.min(index, remaining.length - 1);
      setActiveTab(remaining[nextIndex]);
    }
  }

  function getActiveRecord() {
    return activeTabId ? tabs.get(activeTabId) : null;
  }

  // -------------------------------------------------------------------------
  // Toolbar sync helpers
  // -------------------------------------------------------------------------

  function syncAddressBar(record) {
    if (document.activeElement === addressBar) return; // don't clobber typing
    const displayUrl = record.url === HOME_PAGE || record.url.endsWith('newtab.html') ? '' : record.url;
    addressBar.value = displayUrl;
    updateSecurityIcon(record.url);
  }

  function updateSecurityIcon(url) {
    securityIcon.classList.remove('secure', 'insecure');
    if (url.startsWith('https://')) {
      securityIcon.classList.add('secure');
      securityIcon.title = 'Connection is secure';
    } else if (url.startsWith('http://')) {
      securityIcon.classList.add('insecure');
      securityIcon.title = 'Connection is not secure';
    } else {
      securityIcon.title = 'Local page';
    }
  }

  function updateNavButtons(record) {
    try {
      backBtn.disabled = !record.webview.canGoBack();
      forwardBtn.disabled = !record.webview.canGoForward();
    } catch (_err) {
      backBtn.disabled = true;
      forwardBtn.disabled = true;
    }
  }

  function updateReloadStopButton(isLoading) {
    reloadIcon.style.display = isLoading ? 'none' : '';
    stopIcon.style.display = isLoading ? '' : 'none';
    reloadBtn.title = isLoading ? 'Stop' : 'Reload (Ctrl+R)';
  }

  function updateBookmarkIcon(url) {
    const isBookmarked = bookmarks.has(url);
    bookmarkIcon.querySelector('path').setAttribute('fill', isBookmarked ? 'currentColor' : 'none');
    bookmarkBtn.classList.toggle('active-toggle', isBookmarked);
    bookmarkBtn.title = isBookmarked ? 'Remove bookmark' : 'Bookmark this page';
  }

  // -------------------------------------------------------------------------
  // Navigation actions
  // -------------------------------------------------------------------------

  function navigateActiveTab(rawInput) {
    const record = getActiveRecord();
    if (!record) return;
    const url = resolveOmniboxInput(rawInput);
    loadUrlInWebview(record.webview, url);
  }

  function loadUrlInWebview(webview, url) {
    try {
      webview.loadURL(url);
    } catch (_err) {
      webview.src = url;
    }
  }

  function goHome() {
    const record = getActiveRecord();
    if (!record) return;
    loadUrlInWebview(record.webview, HOME_PAGE);
  }

  function goBack() {
    const record = getActiveRecord();
    if (record && record.webview.canGoBack()) record.webview.goBack();
  }

  function goForward() {
    const record = getActiveRecord();
    if (record && record.webview.canGoForward()) record.webview.goForward();
  }

  function reloadOrStop() {
    const record = getActiveRecord();
    if (!record) return;
    if (record.isLoading) {
      record.webview.stop();
    } else {
      record.webview.reload();
    }
  }

  function toggleBookmark() {
    const record = getActiveRecord();
    if (!record) return;
    if (bookmarks.has(record.url)) {
      bookmarks.delete(record.url);
    } else {
      bookmarks.add(record.url);
    }
    updateBookmarkIcon(record.url);
  }

  // -------------------------------------------------------------------------
  // Event wiring
  // -------------------------------------------------------------------------

  addressBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigateActiveTab(addressBar.value);
      addressBar.blur();
    } else if (e.key === 'Escape') {
      addressBar.blur();
      const record = getActiveRecord();
      if (record) syncAddressBar(record);
    }
  });
  addressBar.addEventListener('focus', () => addressBar.select());

  backBtn.addEventListener('click', goBack);
  forwardBtn.addEventListener('click', goForward);
  reloadBtn.addEventListener('click', reloadOrStop);
  homeBtn.addEventListener('click', goHome);
  bookmarkBtn.addEventListener('click', toggleBookmark);
  newTabBtn.addEventListener('click', () => createTab(HOME_PAGE, { activate: true }));

  minBtn.addEventListener('click', () => window.electronAPI.minimizeWindow());
  maxBtn.addEventListener('click', () => window.electronAPI.maximizeWindow());
  closeBtn.addEventListener('click', () => window.electronAPI.closeWindow());

  window.electronAPI.onWindowMaximizedChanged((isMaximized) => {
    maxBtn.title = isMaximized ? 'Restore' : 'Maximize';
    maxBtn.classList.toggle('is-maximized', isMaximized);
  });
  window.electronAPI.isWindowMaximized().then((isMaximized) => {
    maxBtn.title = isMaximized ? 'Restore' : 'Maximize';
  });

  window.electronAPI.onOpenNewTab((url) => createTab(url, { activate: true }));

  // --- Global keyboard shortcuts ---
  document.addEventListener('keydown', (e) => {
    const primary = e.ctrlKey || e.metaKey;
    if (!primary) {
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
      return;
    }

    switch (e.key.toLowerCase()) {
      case 't':
        e.preventDefault();
        createTab(HOME_PAGE, { activate: true });
        break;
      case 'w':
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
        break;
      case 'l':
        e.preventDefault();
        addressBar.focus();
        addressBar.select();
        break;
      case 'r':
        e.preventDefault();
        reloadOrStop();
        break;
      case 'tab': {
        e.preventDefault();
        const ids = Array.from(tabs.keys());
        if (ids.length < 2) break;
        const currentIndex = ids.indexOf(activeTabId);
        const delta = e.shiftKey ? -1 : 1;
        const nextIndex = (currentIndex + delta + ids.length) % ids.length;
        setActiveTab(ids[nextIndex]);
        break;
      }
      default:
        break;
    }
  });

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------

  createTab(HOME_PAGE, { activate: true });
})();
