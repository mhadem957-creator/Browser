import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../models/browser_tab.dart';
import '../utils/new_tab_page.dart';
import '../utils/omnibox.dart';
import '../widgets/tab_switcher_sheet.dart';

class BrowserScreen extends StatefulWidget {
  const BrowserScreen({super.key});

  @override
  State<BrowserScreen> createState() => _BrowserScreenState();
}

class _BrowserScreenState extends State<BrowserScreen> {
  final List<BrowserTab> _tabs = [];
  int _activeIndex = 0;
  int _tabCounter = 0;

  final TextEditingController _addressController = TextEditingController();
  final FocusNode _addressFocusNode = FocusNode();

  BrowserTab get _activeTab => _tabs[_activeIndex];

  @override
  void initState() {
    super.initState();
    _addressFocusNode.addListener(() {
      if (_addressFocusNode.hasFocus) {
        _addressController.selection = TextSelection(
          baseOffset: 0,
          extentOffset: _addressController.text.length,
        );
      } else {
        _syncAddressBar();
      }
    });
    _createTab(activate: true);
  }

  @override
  void dispose() {
    _addressController.dispose();
    _addressFocusNode.dispose();
    super.dispose();
  }

  void _createTab({String? url, bool activate = true}) {
    final tab = BrowserTab(id: 'tab-${++_tabCounter}');
    tab.onChanged = () {
      if (mounted) {
        setState(() {});
        if (identical(tab, _activeTab)) _syncAddressBar();
      }
    };

    setState(() {
      _tabs.add(tab);
      if (activate) _activeIndex = _tabs.length - 1;
    });

    if (url == null) {
      tab.loadHome();
    } else {
      tab.loadUrl(url);
    }

    if (activate) _syncAddressBar();
  }

  void _closeTab(int index) {
    if (_tabs.length == 1) {
      // Never let the last tab disappear entirely — replace it with a fresh
      // home tab instead of leaving the user with no browser surface.
      setState(() {
        _tabs.removeAt(index);
      });
      _createTab(activate: true);
      return;
    }

    setState(() {
      final wasActive = index == _activeIndex;
      _tabs.removeAt(index);
      if (wasActive) {
        _activeIndex = index.clamp(0, _tabs.length - 1);
      } else if (index < _activeIndex) {
        _activeIndex -= 1;
      }
    });
    _syncAddressBar();
  }

  void _switchTab(int index) {
    setState(() => _activeIndex = index);
    _syncAddressBar();
  }

  void _syncAddressBar() {
    if (_addressFocusNode.hasFocus) return;
    final tab = _activeTab;
    _addressController.text = tab.url == homeUrl ? '' : tab.url;
  }

  void _navigate(String rawInput) {
    final resolved = Omnibox.resolve(rawInput);
    if (resolved.isEmpty) {
      _activeTab.loadHome();
    } else {
      _activeTab.loadUrl(resolved);
    }
    _addressFocusNode.unfocus();
  }

  void _goHome() => _activeTab.loadHome();

  void _goBack() {
    if (_activeTab.canGoBack) _activeTab.controller.goBack();
  }

  void _goForward() {
    if (_activeTab.canGoForward) _activeTab.controller.goForward();
  }

  void _reload() {
    _activeTab.controller.reload();
  }

  void _openTabSwitcher() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => TabSwitcherSheet(
        tabs: _tabs,
        activeIndex: _activeIndex,
        onSelect: _switchTab,
        onClose: _closeTab,
        onNewTab: () => _createTab(activate: true),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (_activeTab.canGoBack) {
          _activeTab.controller.goBack();
        } else if (_tabs.length > 1) {
          _closeTab(_activeIndex);
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF1B1C1F),
        body: SafeArea(
          child: Column(
            children: [
              _buildOmnibox(),
              Expanded(
                child: IndexedStack(
                  index: _activeIndex,
                  children: [
                    for (final tab in _tabs) WebViewWidget(controller: tab.controller),
                  ],
                ),
              ),
              _buildBottomBar(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOmnibox() {
    final tab = _activeTab;
    final isSecure = tab.url.startsWith('https://');
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
      child: Container(
        height: 44,
        decoration: BoxDecoration(
          color: const Color(0xFF26282C),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: _addressFocusNode.hasFocus ? const Color(0xFF8AB4F8) : Colors.transparent,
          ),
        ),
        child: Row(
          children: [
            const SizedBox(width: 14),
            Icon(
              tab.url == homeUrl
                  ? Icons.home_outlined
                  : (isSecure ? Icons.lock_outline : Icons.info_outline),
              size: 16,
              color: const Color(0xFF9AA0A6),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _addressController,
                focusNode: _addressFocusNode,
                style: const TextStyle(color: Colors.white, fontSize: 14.5),
                cursorColor: const Color(0xFF8AB4F8),
                decoration: const InputDecoration(
                  isDense: true,
                  border: InputBorder.none,
                  hintText: 'Search Google or type a URL',
                  hintStyle: TextStyle(color: Color(0xFF9AA0A6)),
                ),
                keyboardType: TextInputType.url,
                textInputAction: TextInputAction.go,
                onSubmitted: _navigate,
              ),
            ),
            tab.isLoading
                ? const Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation(Color(0xFF8AB4F8)),
                      ),
                    ),
                  )
                : IconButton(
                    icon: const Icon(Icons.refresh, size: 18, color: Color(0xFF9AA0A6)),
                    onPressed: _reload,
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar() {
    final tab = _activeTab;
    return Container(
      height: 52,
      decoration: const BoxDecoration(
        color: Color(0xFF202124),
        border: Border(top: BorderSide(color: Color(0xFF3C3D40), width: 1)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back),
            color: tab.canGoBack ? Colors.white : const Color(0xFF55565A),
            onPressed: tab.canGoBack ? _goBack : null,
          ),
          IconButton(
            icon: const Icon(Icons.arrow_forward),
            color: tab.canGoForward ? Colors.white : const Color(0xFF55565A),
            onPressed: tab.canGoForward ? _goForward : null,
          ),
          IconButton(
            icon: const Icon(Icons.home_outlined),
            color: Colors.white,
            onPressed: _goHome,
          ),
          InkWell(
            borderRadius: BorderRadius.circular(6),
            onTap: _openTabSwitcher,
            child: Container(
              width: 30,
              height: 24,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white, width: 1.4),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                '${_tabs.length}',
                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Colors.white),
            color: const Color(0xFF303134),
            onSelected: (value) {
              switch (value) {
                case 'new_tab':
                  _createTab(activate: true);
                  break;
                case 'close_tab':
                  _closeTab(_activeIndex);
                  break;
              }
            },
            itemBuilder: (context) => const [
              PopupMenuItem(
                value: 'new_tab',
                child: Text('New Tab', style: TextStyle(color: Colors.white)),
              ),
              PopupMenuItem(
                value: 'close_tab',
                child: Text('Close Tab', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
