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
