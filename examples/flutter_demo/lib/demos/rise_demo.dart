// Three cards rising in with a 120 ms stagger, built on the generated RiseMotion widget.
import 'package:flutter/material.dart';

import '../rise_motion.dart';

class GradientCard extends StatelessWidget {
  const GradientCard(this.from, this.to, {super.key});
  final Color from, to;

  @override
  Widget build(BuildContext context) => Container(
        width: 200,
        height: 260,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          // CSS linear-gradient(160deg, …): from the top-left, slightly off vertical
          gradient: LinearGradient(begin: const Alignment(-0.36, -1), end: const Alignment(0.36, 1), colors: [from, to]),
        ),
      );
}

/// The cards plus a Replay button that calls the generated widget's restart().
class RiseDemo extends StatefulWidget {
  const RiseDemo({super.key});

  @override
  State<RiseDemo> createState() => _RiseDemoState();
}

class _RiseDemoState extends State<RiseDemo> {
  final _motion = GlobalKey<RiseMotionState>();

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      FittedBox(
        child: SizedBox(
          width: 648,
          height: 300,
          child: Center(
            child: RiseMotion(
              key: _motion,
              layout: (children) => Row(mainAxisSize: MainAxisSize.min, children: [
                for (var i = 0; i < children.length; i++) ...[if (i > 0) const SizedBox(width: 24), children[i]],
              ]),
              children: const [
                GradientCard(Color(0xFF4F46E5), Color(0xFF9333EA)),
                GradientCard(Color(0xFF0EA5E9), Color(0xFF22C55E)),
                GradientCard(Color(0xFFF97316), Color(0xFFEF4444)),
              ],
            ),
          ),
        ),
      ),
      const SizedBox(height: 16),
      FilledButton.icon(
        onPressed: () => _motion.currentState?.restart(),
        icon: const Icon(Icons.replay),
        label: const Text('Replay'),
      ),
    ]);
  }
}
