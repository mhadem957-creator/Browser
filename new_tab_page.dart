/// A self-contained HTML new-tab/home page, loaded into a fresh tab via
/// [WebViewController.loadHtmlString] so the app never needs network access
/// just to show a blank tab.
const String newTabHtml = r'''
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>New Tab</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; height: 100%;
    background: radial-gradient(circle at 50% 20%, #26282c 0%, #1b1c1f 60%);
    color: #e8eaed;
    font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;
    display: flex; align-items: center; justify-content: center;
  }
  .wrap { width: 100%; max-width: 420px; padding: 24px; text-align: center; }
  .logo {
    font-size: 30px; font-weight: 600; letter-spacing: -0.5px; margin-bottom: 22px;
    background: linear-gradient(135deg, #8ab4f8, #c58af9);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .hint { color: #9aa0a6; font-size: 13px; margin-bottom: 24px; }
  .shortcuts { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
  .shortcut { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 64px; color: #e8eaed; text-decoration: none; }
  .shortcut .icon { width: 44px; height: 44px; border-radius: 50%; background: #303134; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; }
  .shortcut span.label { font-size: 11px; color: #9aa0a6; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="logo">ElectronBrowser</div>
    <div class="hint">Use the address bar above to search or browse</div>
    <div class="shortcuts">
      <a class="shortcut" href="https://www.google.com"><span class="icon">G</span><span class="label">Google</span></a>
      <a class="shortcut" href="https://www.wikipedia.org"><span class="icon">W</span><span class="label">Wikipedia</span></a>
      <a class="shortcut" href="https://www.github.com"><span class="icon">Gh</span><span class="label">GitHub</span></a>
      <a class="shortcut" href="https://duckduckgo.com"><span class="icon">D</span><span class="label">DuckDuckGo</span></a>
    </div>
  </div>
</body>
</html>
''';

/// Sentinel URL used to represent "this tab is showing the local home page"
/// without needing an actual network address.
const String homeUrl = 'about:home';
