// Shows Dart files bundled as assets: tabs per file, light syntax colouring, line numbers, copy and download.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'download.dart';

class SourceFile {
  const SourceFile(this.path, this.label);

  /// Asset path, also the file's path in the project (see pubspec.yaml › flutter › assets).
  final String path;

  /// What the file is, shown as a badge on the tab.
  final String label;

  String get name => path.split('/').last;
}

class SourceView extends StatefulWidget {
  const SourceView({super.key, required this.files});
  final List<SourceFile> files;

  @override
  State<SourceView> createState() => _SourceViewState();
}

class _SourceViewState extends State<SourceView> {
  late final Future<List<String>> _texts = Future.wait(widget.files.map((f) => rootBundle.loadString(f.path)));
  int _selected = 0;

  static const _bg = Color(0xFF111118);
  static const _border = Color(0xFF26262F);

  void _toast(String message) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), duration: const Duration(seconds: 2)));

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<String>>(
      future: _texts,
      builder: (context, snap) {
        if (!snap.hasData) return const Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator());
        final texts = snap.data!;
        final file = widget.files[_selected];
        final text = texts[_selected];
        return Container(
          decoration: BoxDecoration(color: _bg, borderRadius: BorderRadius.circular(12), border: Border.all(color: _border)),
          clipBehavior: Clip.antiAlias,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            // file tabs + actions
            Container(
              decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _border))),
              padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                runSpacing: 6,
                children: [
                  Wrap(spacing: 4, runSpacing: 4, children: [
                    for (var i = 0; i < widget.files.length; i++)
                      _Tab(file: widget.files[i], selected: i == _selected, onTap: () => setState(() => _selected = i)),
                  ]),
                  Wrap(spacing: 4, children: [
                    TextButton.icon(
                      style: TextButton.styleFrom(foregroundColor: Colors.white70),
                      onPressed: () async {
                        await Clipboard.setData(ClipboardData(text: text));
                        _toast('Copied ${file.name} to the clipboard');
                      },
                      icon: const Icon(Icons.copy, size: 16),
                      label: const Text('Copy'),
                    ),
                    FilledButton.tonalIcon(
                      onPressed: () {
                        downloadText(file.name, text);
                        _toast('Downloaded ${file.name}');
                      },
                      icon: const Icon(Icons.download, size: 16),
                      label: Text(file.name),
                    ),
                  ]),
                ],
              ),
            ),
            // code
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 420),
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: _Code(text),
                ),
              ),
            ),
          ]),
        );
      },
    );
  }
}

class _Tab extends StatelessWidget {
  const _Tab({required this.file, required this.selected, required this.onTap});
  final SourceFile file;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF26262F) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(file.name,
              style: TextStyle(
                  fontFamily: 'JetBrainsMono', fontSize: 13, color: selected ? Colors.white : Colors.white60)),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
            decoration: BoxDecoration(color: const Color(0x334F46E5), borderRadius: BorderRadius.circular(4)),
            child: Text(file.label, style: const TextStyle(fontSize: 11, color: Color(0xFFA5B4FC))),
          ),
        ]),
      ),
    );
  }
}

/// Line numbers + coloured Dart.
class _Code extends StatelessWidget {
  const _Code(this.text);
  final String text;

  static const _mono = TextStyle(
    fontFamily: 'JetBrainsMono',
    fontSize: 12.5,
    height: 1.55,
    color: Color(0xFFE4E4E7),
    fontFeatures: [FontFeature.disable('calt'), FontFeature.disable('liga')], // show => as typed
  );

  @override
  Widget build(BuildContext context) {
    final lines = text.trimRight().split('\n');
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(
        [for (var i = 1; i <= lines.length; i++) '$i'].join('\n'),
        textAlign: TextAlign.right,
        style: _mono.copyWith(color: const Color(0xFF52525B)),
      ),
      const SizedBox(width: 16),
      SelectableText.rich(TextSpan(style: _mono, children: _highlight(lines.join('\n')))),
    ]);
  }
}

const _keywords = {
  'import', 'class', 'extends', 'with', 'const', 'final', 'static', 'late', 'void', 'return', 'super', 'this',
  'required', 'for', 'if', 'else', 'in', 'var', 'new', 'override', 'true', 'false', 'null', 'extension', 'on',
  'double', 'int', 'bool', 'String', 'async', 'await',
};

final _token = RegExp(r"(//[^\n]*)|('(?:[^'\\\n]|\\.)*')|(@\w+)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)");

List<TextSpan> _highlight(String src) {
  const comment = TextStyle(color: Color(0xFF6B7280), fontStyle: FontStyle.italic);
  const string = TextStyle(color: Color(0xFF86EFAC));
  const annotation = TextStyle(color: Color(0xFFFCD34D));
  const number = TextStyle(color: Color(0xFFFDBA74));
  const keyword = TextStyle(color: Color(0xFFC4B5FD));
  const type = TextStyle(color: Color(0xFF7DD3FC));
  final spans = <TextSpan>[];
  var at = 0;
  for (final m in _token.allMatches(src)) {
    if (m.start > at) spans.add(TextSpan(text: src.substring(at, m.start)));
    final t = m[0]!;
    final TextStyle? style = m[1] != null
        ? comment
        : m[2] != null
            ? string
            : m[3] != null
                ? annotation
                : m[4] != null
                    ? number
                    : _keywords.contains(t)
                        ? keyword
                        : RegExp(r'^_?[A-Z]').hasMatch(t)
                            ? type
                            : null;
    spans.add(TextSpan(text: t, style: style));
    at = m.end;
  }
  if (at < src.length) spans.add(TextSpan(text: src.substring(at)));
  return spans;
}
