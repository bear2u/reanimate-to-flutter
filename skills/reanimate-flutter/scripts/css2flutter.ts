// css2flutter.ts — turn the CSS / WAAPI animations reanimate found (inspect.json) into a Flutter motion widget.
// Bun + TypeScript, no dependencies.

const dartDouble = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

/** A CSS easing as a Flutter Curve expression. */
export function curveFor(easing: string): string {
  const m = easing.trim().match(/^cubic-bezier\(([^)]*)\)$/);
  if (m) return `Cubic(${m[1].split(",").map((s) => dartDouble(Number(s))).join(", ")})`;
  throw new Error(`unsupported easing: ${easing}`);
}
