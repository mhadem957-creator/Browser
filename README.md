# ElectronBrowser Mobile (Flutter)

A companion mobile browser for Android and iOS, built with Flutter and
[`webview_flutter`](https://pub.dev/packages/webview_flutter). It mirrors the
desktop app's core ideas — multi-tab browsing, a smart omnibox, full nav
controls — in a native mobile UI (bottom toolbar + tab switcher sheet,
Chrome-style).

This folder ships only the Dart source and `pubspec.yaml`. The native
`android/` and `ios/` project folders are **generated on your machine** the
first time you set it up — that keeps the repo free of large, machine/SDK-
version-specific generated files.

## Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install) 3.22+ (includes Dart 3.3+)
- Android Studio (for Android) and/or Xcode (for iOS, macOS only)
- A connected device or emulator/simulator

Verify your setup:
```bash
flutter doctor
```

## One-time setup

From the repository root:

```bash
cd mobile
flutter create --platforms=android,ios --org com.example .
```

This generates `android/` and `ios/` next to the existing `lib/` and
`pubspec.yaml` **without overwriting them** (Flutter detects the existing
Dart project and only fills in the missing platform folders).

Then fetch dependencies:

```bash
flutter pub get
```

## Run it

```bash
flutter run
```

Pick a connected device/emulator when prompted, or pass `-d <deviceId>`.

## Project structure

```
mobile/
├── lib/
│   ├── main.dart                    # App entry point, dark theme
│   ├── models/
│   │   └── browser_tab.dart          # Wraps a WebViewController + tab state
│   ├── screens/
│   │   └── browser_screen.dart       # Omnibox, webview stack, bottom nav bar
│   ├── widgets/
│   │   └── tab_switcher_sheet.dart   # Bottom-sheet tab switcher
│   └── utils/
│       ├── omnibox.dart              # Smart URL-vs-search resolution
│       └── new_tab_page.dart         # Local embedded home/new-tab page
├── pubspec.yaml
└── analysis_options.yaml
```

## Features

- **Multi-tab** — each tab owns an independent `WebViewController`; switch via
  the tab-count button in the bottom bar, which opens a switcher sheet to
  select, close, or open new tabs.
- **Smart omnibox** — same URL-vs-search heuristic as the desktop app.
- **Nav controls** — Back / Forward / Home / Reload, all synced to the active
  tab's real navigation state (`canGoBack` / `canGoForward`).
- **Hardware back button** (Android) — goes back in-page first, then closes
  the tab if there's nowhere left to go.
- **Local new-tab page** — no network call needed to show a blank tab.

## Notes on permissions

- **Android**: `flutter create` automatically adds the `INTERNET` permission
  needed for `webview_flutter` to `android/app/src/main/AndroidManifest.xml`.
  No manual step required.
- **iOS**: HTTPS sites work out of the box. If you need to load plain `http://`
  sites during development, add an `NSAppTransportSecurity` exception to
  `ios/Runner/Info.plist`.

## Building release binaries

```bash
flutter build apk --release      # Android APK
flutter build appbundle --release # Android App Bundle (for Play Store)
flutter build ios --release       # iOS (requires macOS + Xcode + signing)
```
