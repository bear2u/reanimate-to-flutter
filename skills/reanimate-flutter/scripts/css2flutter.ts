// css2flutter.ts — turn the CSS / WAAPI animations reanimate found (inspect.json) into a Flutter motion widget.
// Bun + TypeScript, no dependencies.

const dartDouble = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

// Flutter's Curves.ease/easeIn/easeOut/easeInOut use the same control points as the CSS keywords.
const KEYWORD_CURVES: Record<string, string> = {
  linear: "Curves.linear",
  ease: "Curves.ease",
  "ease-in": "Curves.easeIn",
  "ease-out": "Curves.easeOut",
  "ease-in-out": "Curves.easeInOut",
};

/** A CSS easing as a Flutter Curve expression. */
export function curveFor(easing: string): string {
  const keyword = KEYWORD_CURVES[easing.trim()];
  if (keyword) return keyword;
  const m = easing.trim().match(/^cubic-bezier\(([^)]*)\)$/);
  if (m) return `Cubic(${m[1].split(",").map((s) => dartDouble(Number(s))).join(", ")})`;
  throw new Error(`unsupported easing "${easing}": write the curve by hand, see references/mapping.md`);
}

/** The parts of a 2D transform Flutter applies separately: translate (px), uniform scale, rotate (rad). */
export type Transform2D = { tx: number; ty: number; scale: number; rotate: number };

const px = (v: string) => parseFloat(v);

const ANGLE_TO_RAD: Record<string, number> = { deg: Math.PI / 180, rad: 1, turn: 2 * Math.PI, grad: Math.PI / 200 };
function radians(v: string): number {
  const m = v.match(/^(-?[\d.]+)([a-z]*)$/);
  if (!m) throw new Error(`unreadable angle: ${v}`);
  return parseFloat(m[1]) * (ANGLE_TO_RAD[m[2] || "deg"] ?? 1);
}

export function parseTransform(css: string): Transform2D {
  const t: Transform2D = { tx: 0, ty: 0, scale: 1, rotate: 0 };
  for (const [, fn, rawArgs] of css.matchAll(/([a-zA-Z]+)\(([^)]*)\)/g)) {
    const args = rawArgs.split(",").map((s) => s.trim());
    if (fn === "translate") { t.tx += px(args[0]); t.ty += args[1] ? px(args[1]) : 0; }
    else if (fn === "translateX") t.tx += px(args[0]);
    else if (fn === "translateY") t.ty += px(args[0]);
    else if (fn === "scale") t.scale *= parseFloat(args[0]);
    else if (fn === "rotate") t.rotate += radians(args[0]);
    else if (fn === "matrix") {
      // computed styles: a uniform scale + rotation + translation (skew is not representable here)
      const [a, b, , , e, f] = args.map(Number);
      t.tx += e; t.ty += f;
      t.scale *= Math.hypot(a, b);
      t.rotate += Math.atan2(b, a);
    }
  }
  return t;
}

export type Keyframe = { offset: number; easing?: string; transform?: string; opacity?: string | number };
/** One stretch between two keyframes: weight in percent of the iteration, curve null when the value holds. */
export type Segment = { weight: number; from: number; to: number; curve: string | null };
export type Prop = "tx" | "ty" | "scale" | "rotate" | "opacity";

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

function valuesOf(k: Keyframe): Partial<Record<Prop, number>> {
  const v: Partial<Record<Prop, number>> = {};
  if (k.transform !== undefined) Object.assign(v, parseTransform(k.transform));
  if (k.opacity !== undefined) v.opacity = Number(k.opacity);
  return v;
}

/** Keyframes → per-property segments, keeping only the properties that change. */
export function segments(keyframes: Keyframe[]): Partial<Record<Prop, Segment[]>> {
  const values = keyframes.map(valuesOf);
  const out: Partial<Record<Prop, Segment[]>> = {};
  for (const prop of ["tx", "ty", "scale", "rotate", "opacity"] as Prop[]) {
    if (!values.some((v) => v[prop] !== undefined)) continue;
    const segs: Segment[] = [];
    for (let i = 0; i + 1 < keyframes.length; i++) {
      const from = values[i][prop]!, to = values[i + 1][prop]!;
      const weight = round6((keyframes[i + 1].offset - keyframes[i].offset) * 100);
      segs.push({ weight, from, to, curve: from === to ? null : curveFor(keyframes[i].easing ?? "ease") });
    }
    if (segs.some((s) => s.curve !== null)) out[prop] = segs;
  }
  return out;
}

// `Curves.x` are already constants; constructed curves need `const` to stay cheap in a build method.
const constCurve = (curve: string) => (curve.startsWith("Curves.") ? curve : `const ${curve}`);

/** Segments → a Dart `TweenSequence<double>` expression. */
export function dartTweenSequence(segs: Segment[]): string {
  const items = segs.map((s) => {
    const tween = s.curve === null
      ? `ConstantTween<double>(${dartDouble(s.from)})`
      : `Tween<double>(begin: ${dartDouble(s.from)}, end: ${dartDouble(s.to)}).chain(CurveTween(curve: ${constCurve(s.curve)}))`;
    return `  TweenSequenceItem(tween: ${tween}, weight: ${dartDouble(s.weight)}),`;
  });
  return ["TweenSequence<double>([", ...items, "])"].join("\n");
}

/** One entry of inspect.json › animations. */
export type InspectAnimation = {
  kind?: string; name: string; target: string;
  timing: { delay: number; duration: number; iterations: number | null; direction?: string; easing?: string; fill?: string };
  keyframes: Keyframe[];
};
/** shift: phase of an infinite loop (0..1), interval: [begin, end] of a finite run as fractions of periodMs. */
export type Element = { target: string; shift?: number; interval?: [number, number] };
export type Group = { name: string; periodMs: number; repeat: boolean; reverse: boolean; keyframes: Keyframe[]; elements: Element[] };

const mod1 = (x: number) => round6(((x % 1) + 1) % 1);

/** All animations with one name → one AnimationController and a phase or interval per element. */
export function groupAnimations(animations: InspectAnimation[], name: string): Group {
  const list = animations.filter((a) => a.name === name);
  const first = list[0];
  const { duration, direction } = first.timing;
  const base = { name, reverse: direction === "alternate", keyframes: first.keyframes };
  if (first.timing.iterations === null) {
    return { ...base, periodMs: duration, repeat: true, elements: list.map((a) => ({ target: a.target, shift: mod1(-a.timing.delay / duration) })) };
  }
  const periodMs = Math.max(...list.map((a) => a.timing.delay + a.timing.duration));
  return {
    ...base, periodMs, repeat: false,
    elements: list.map((a) => ({ target: a.target, interval: [round6(a.timing.delay / periodMs), round6((a.timing.delay + a.timing.duration) / periodMs)] as [number, number] })),
  };
}

const indent = (text: string, by: string) => text.split("\n").map((l, i) => (i === 0 ? l : by + l)).join("\n");

/** A Dart value expression for `prop` at local time `t`, or the identity when it does not animate. */
function valueAt(segs: Partial<Record<Prop, Segment[]>>, prop: Prop, identity: string): string {
  return segs[prop] ? `_${prop}.transform(t)` : identity;
}

/**
 * One group → a self-contained Flutter widget file. Each child is one animated element in DOM order; the widget
 * applies the motion the way CSS composes it: opacity outside, then translate → rotate → scale (origin centre).
 */
export function emitWidget(group: Group, className: string): string {
  const segs = segments(group.keyframes);
  const props = (Object.keys(segs) as Prop[]);
  const sequences = props.map((p) => `  static final Animatable<double> _${p} = ${indent(dartTweenSequence(segs[p]!), "  ")};`);
  const shifts = group.elements.map((e) => dartDouble(e.shift ?? 0)).join(", ");
  const tx = valueAt(segs, "tx", "0.0"), ty = valueAt(segs, "ty", "0.0");
  const wraps: string[] = [];
  if (segs.scale) wraps.push("w = Transform.scale(scale: _scale.transform(t), child: w);");
  if (segs.rotate) wraps.push("w = Transform.rotate(angle: _rotate.transform(t), child: w);");
  if (segs.tx || segs.ty) wraps.push(`w = Transform.translate(offset: Offset(${tx}, ${ty}), child: w);`);
  if (segs.opacity) wraps.push("w = Opacity(opacity: _opacity.transform(t).clamp(0.0, 1.0), child: w);");
  const repeat = group.repeat ? (group.reverse ? "repeat(reverse: true)" : "repeat()") : "forward()";
  return `// Generated by reanimate-flutter (css2flutter.ts) from @keyframes ${group.name}. Edit freely.
import 'package:flutter/widgets.dart';

/// @keyframes ${group.name}: ${group.elements.length} element(s), ${group.periodMs} ms${group.repeat ? ", repeats" : ""}.
class ${className} extends StatefulWidget {
  const ${className}({super.key, required this.children, this.layout = _stack});

  /// One visual per animated element, in the reference's DOM order.
  final List<Widget> children;

  /// Lays out the animated children (default: a Stack, like absolutely positioned elements).
  final Widget Function(List<Widget> children) layout;

  static Widget _stack(List<Widget> children) => Stack(children: children);

  @override
  State<${className}> createState() => ${className}State();
}

class ${className}State extends State<${className}> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: ${group.periodMs}));

${sequences.join("\n\n")}

  /// Phase of each element in the loop (CSS negative delays), as a fraction of one iteration.
  static const List<double> _shift = [${shifts}];

  double _t(int i) => (_controller.value + _shift[i]) % 1.0;

  @override
  void initState() {
    super.initState();
    restart();
  }

  /// Starts the motion from t = 0, as the reference does on load.
  void restart() => _controller..reset()..${repeat};

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Widget _entry(int i, Widget child) {
    final t = _t(i);
    Widget w = child;
    ${wraps.join("\n    ")}
    return w;
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) => widget.layout([
        for (var i = 0; i < widget.children.length; i++) _entry(i, widget.children[i]),
      ]),
    );
  }
}
`;
}
