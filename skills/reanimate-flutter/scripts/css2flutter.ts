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
  }
  return t;
}
