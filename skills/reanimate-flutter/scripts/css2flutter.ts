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
