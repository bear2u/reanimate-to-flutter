// Verification harness for reanimate-flutter: renders the motion widget alone, at the reference's position,
// so `capture.ts --clip …` records the same region as the reference. Web only (it uses dart:js_interop).
//
// Fill in the TODOs from the reference's inspect.json › nodes (CSS px at the capture viewport) and spec.md.
import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'package:flutter/widgets.dart';

import 'motion.dart'; // TODO: the file css2flutter.ts wrote

const background = Color(0xFFFFFFFF); // TODO: page background (inspect.json › nodes › body › background-color)
const origin = Offset(0, 0); // TODO: the animated container's left, top in the reference viewport
const size = Size(100, 100); // TODO: the container's width, height

final motionKey = GlobalKey<MotionState>(); // TODO: <WidgetName>State

void main() {
  // capture.ts --pre-js calls this so the clone starts its timeline at the same moment as the reference.
  globalContext['__reanimateRestart'] = (() => motionKey.currentState?.restart()).toJS;
  runApp(const Harness());
}

class Harness extends StatelessWidget {
  const Harness({super.key});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.ltr,
      child: ColoredBox(
        color: background,
        child: Stack(children: [
          Positioned(
            left: origin.dx,
            top: origin.dy,
            width: size.width,
            height: size.height,
            child: Motion( // TODO: <WidgetName>
              key: motionKey,
              children: const [], // TODO: one visual per animated element, in DOM order
            ),
          ),
        ]),
      ),
    );
  }
}
