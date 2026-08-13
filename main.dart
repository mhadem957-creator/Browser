import 'package:flutter/material.dart';

import 'screens/browser_screen.dart';

void main() {
  runApp(const ElectronBrowserMobileApp());
}

class ElectronBrowserMobileApp extends StatelessWidget {
  const ElectronBrowserMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ElectronBrowser',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF1B1C1F),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF8AB4F8),
          brightness: Brightness.dark,
        ),
      ),
      home: const BrowserScreen(),
    );
  }
}
