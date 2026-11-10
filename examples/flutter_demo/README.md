# reanimate-flutter demo

A Flutter web app showing the widgets that `skills/reanimate-flutter/scripts/css2flutter.ts` generated from reanimate captures. Each widget runs live, with its source next to it, and every file can be copied or downloaded.

| Panel | Generated widget | Usage |
|---|---|---|
| Logo mark: the reanimate.niazmorshed.dev nav logo, an infinite loop with per-element phases | [`lib/mark_motion.dart`](lib/mark_motion.dart) | [`lib/demos/mark_demo.dart`](lib/demos/mark_demo.dart) |
| Card stagger: three cards rising in, 120 ms apart, with Replay | [`lib/rise_motion.dart`](lib/rise_motion.dart) | [`lib/demos/rise_demo.dart`](lib/demos/rise_demo.dart) |

## Run

```sh
flutter run -d chrome
```

or build it and serve it with the skill's server:

```sh
flutter build web --release --no-web-resources-cdn
bun ../../skills/reanimate-flutter/scripts/serve.ts build/web --port 5190   # http://localhost:5190
```

## Regenerate the widgets

```sh
G=../../skills/reanimate-flutter/scripts/css2flutter.ts
bun $G --inspect <ref>/inspect.json --name mark --widget MarkMotion --out lib/mark_motion.dart
bun $G --inspect <ref>/inspect.json --name rise --widget RiseMotion --out lib/rise_motion.dart
```

`<ref>` is the reference directory written by reanimate's `capture.ts`.

## Files

- [`lib/source_view.dart`](lib/source_view.dart): the source panel (tabs, colouring, line numbers, copy, download).
- [`lib/download.dart`](lib/download.dart): browser download through `dart:js_interop`, with no extra packages.
- The sources are bundled as assets (`pubspec.yaml › flutter › assets`) so the page can show them.
- `fonts/JetBrainsMono.ttf` is the code font, converted from `site/video/assets/fonts/JetBrainsMono.woff2` (SIL OFL 1.1, [`fonts/OFL.txt`](fonts/OFL.txt)).
