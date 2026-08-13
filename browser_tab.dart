import 'dart:ui' show Color;

import 'package:webview_flutter/webview_flutter.dart';

import '../utils/new_tab_page.dart';

/// Represents a single open browser tab: its own isolated [WebViewController]
/// plus the UI-facing state (title, url, loading/nav-history flags).
class BrowserTab {
  BrowserTab({required this.id}) : controller = WebViewController() {
    controller
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF1B1C1F))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (url) {
            isLoading = true;
            if (url != 'about:blank') {
              this.url = url;
            }
            onChanged?.call();
          },
          onPageFinished: (url) async {
            isLoading = false;
            if (url != 'about:blank') {
              this.url = url;
            }
            title = await controller.getTitle() ?? url;
            canGoBack = await controller.canGoBack();
            canGoForward = await controller.canGoForward();
            onChanged?.call();
          },
          onNavigationRequest: (request) => NavigationDecision.navigate,
          onWebResourceError: (error) {
            isLoading = false;
            onChanged?.call();
          },
        ),
      );
  }

  final String id;
  final WebViewController controller;

  String title = 'New Tab';
  String url = homeUrl;
  bool isLoading = false;
  bool canGoBack = false;
  bool canGoForward = false;

  /// Called by the owning screen whenever tab state changes, so it can
  /// trigger a rebuild without each tab needing its own ChangeNotifier.
  void Function()? onChanged;

  Future<void> loadHome() async {
    url = homeUrl;
    title = 'New Tab';
    await controller.loadHtmlString(newTabHtml);
  }

  Future<void> loadUrl(String targetUrl) async {
    await controller.loadRequest(Uri.parse(targetUrl));
  }

  Future<void> refreshNavState() async {
    canGoBack = await controller.canGoBack();
    canGoForward = await controller.canGoForward();
  }
}
