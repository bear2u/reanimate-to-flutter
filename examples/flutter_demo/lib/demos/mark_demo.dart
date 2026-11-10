// Logo mark of reanimate.niazmorshed.dev, built on the generated MarkMotion widget.
import 'package:flutter/material.dart';

import '../mark_motion.dart';

const ink = Color(0xFF171717); // rgb(23, 23, 23)

/// One square of the mark (`.mark i`): 10×10, radius 2.5, its own opacity.
class MarkSquare extends StatelessWidget {
  const MarkSquare(this.opacity, {super.key});
  final double opacity;

  @override
  Widget build(BuildContext context) => Opacity(
        opacity: opacity,
        child: Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: ink, borderRadius: BorderRadius.circular(2.5)),
        ),
      );
}

/// The mark at its real size (30×14, squares 2 px from the top), as on the site.
class LogoMark extends StatelessWidget {
  const LogoMark({super.key});

  @override
  Widget build(BuildContext context) => SizedBox(
        width: 30,
        height: 14,
        child: MarkMotion(
          layout: (children) => Stack(children: [for (final c in children) Positioned(top: 2, left: 0, child: c)]),
          children: const [MarkSquare(0.15), MarkSquare(0.35), MarkSquare(1)],
        ),
      );
}

/// The mark at 6× (to see the phases and holds) and at real size next to the wordmark.
class MarkDemo extends StatelessWidget {
  const MarkDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Wrap(spacing: 48, runSpacing: 24, crossAxisAlignment: WrapCrossAlignment.center, children: [
      SizedBox(width: 180, height: 84, child: FittedBox(child: LogoMark())),
      Row(mainAxisSize: MainAxisSize.min, children: [
        LogoMark(),
        SizedBox(width: 10),
        Text('reanimate', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w500, color: ink)),
      ]),
    ]);
  }
}
