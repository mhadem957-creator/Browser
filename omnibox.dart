/// Smart address-bar resolution: decides whether user input is a URL to
/// navigate to directly, or plain text to search for.
class Omnibox {
  static const String searchEngineUrl = 'https://www.google.com/search?q=';

  static final RegExp _hasScheme = RegExp(r'^[a-zA-Z][a-zA-Z\d+\-.]*://');
  static final RegExp _localhost = RegExp(r'^localhost(:\d+)?(/.*)?$', caseSensitive: false);
  static final RegExp _ipv4 = RegExp(r'^(\d{1,3}\.){3}\d{1,3}(:\d+)?(/.*)?$');
  static final RegExp _domain = RegExp(r'^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(/\S*)?$');

  static bool looksLikeUrl(String text) {
    if (text.contains(RegExp(r'\s'))) return false;
    if (_hasScheme.hasMatch(text)) return true;
    if (_localhost.hasMatch(text)) return true;
    if (_ipv4.hasMatch(text)) return true;
    return _domain.hasMatch(text);
  }

  /// Resolves raw omnibox input into a URL that should be loaded.
  static String resolve(String rawInput) {
    final text = rawInput.trim();
    if (text.isEmpty) return '';

    if (_hasScheme.hasMatch(text)) {
      return text;
    }
    if (looksLikeUrl(text)) {
      return 'https://$text';
    }
    return '$searchEngineUrl${Uri.encodeComponent(text)}';
  }
}
