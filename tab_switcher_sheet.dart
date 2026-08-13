import 'package:flutter/material.dart';

import '../models/browser_tab.dart';
import '../utils/new_tab_page.dart';

/// Modal bottom sheet listing all open tabs, letting the user switch to or
/// close any of them, or open a fresh one.
class TabSwitcherSheet extends StatelessWidget {
  const TabSwitcherSheet({
    super.key,
    required this.tabs,
    required this.activeIndex,
    required this.onSelect,
    required this.onClose,
    required this.onNewTab,
  });

  final List<BrowserTab> tabs;
  final int activeIndex;
  final ValueChanged<int> onSelect;
  final ValueChanged<int> onClose;
  final VoidCallback onNewTab;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.7),
        decoration: const BoxDecoration(
          color: Color(0xFF202124),
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
              child: Row(
                children: [
                  Text(
                    '${tabs.length} ${tabs.length == 1 ? 'Tab' : 'Tabs'}',
                    style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const Spacer(),
                  TextButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop();
                      onNewTab();
                    },
                    icon: const Icon(Icons.add, size: 18, color: Color(0xFF8AB4F8)),
                    label: const Text('New Tab', style: TextStyle(color: Color(0xFF8AB4F8))),
                  ),
                ],
              ),
            ),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: tabs.length,
                itemBuilder: (context, index) {
                  final tab = tabs[index];
                  final isActive = index == activeIndex;
                  final subtitle = tab.url == homeUrl ? 'New Tab' : tab.url;
                  return ListTile(
                    selected: isActive,
                    selectedTileColor: const Color(0xFF303134),
                    leading: CircleAvatar(
                      backgroundColor: const Color(0xFF303134),
                      child: Icon(
                        tab.url == homeUrl ? Icons.home_outlined : Icons.public,
                        size: 18,
                        color: const Color(0xFF9AA0A6),
                      ),
                    ),
                    title: Text(
                      tab.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white, fontSize: 14),
                    ),
                    subtitle: Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Color(0xFF9AA0A6), fontSize: 12),
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.close, size: 18, color: Color(0xFF9AA0A6)),
                      onPressed: () => onClose(index),
                    ),
                    onTap: () {
                      Navigator.of(context).pop();
                      onSelect(index);
                    },
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
