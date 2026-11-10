import { describe, expect, test } from "bun:test";
import { curveFor, parseTransform } from "./css2flutter";

describe("curveFor", () => {
  test("shouldMapCubicBezierToFlutterCubic", () => {
    expect(curveFor("cubic-bezier(0.16, 1, 0.3, 1)")).toBe("Cubic(0.16, 1.0, 0.3, 1.0)");
  });

  test("shouldMapCssKeywordsToFlutterCurves", () => {
    expect(curveFor("linear")).toBe("Curves.linear");
    expect(curveFor("ease")).toBe("Curves.ease");
    expect(curveFor("ease-in")).toBe("Curves.easeIn");
    expect(curveFor("ease-out")).toBe("Curves.easeOut");
    expect(curveFor("ease-in-out")).toBe("Curves.easeInOut");
  });

  test("shouldRejectUnsupportedEasingWithAHint", () => {
    expect(() => curveFor("steps(4, end)")).toThrow(/unsupported easing "steps\(4, end\)".*mapping\.md/);
  });
});

describe("parseTransform", () => {
  test("shouldReturnIdentityForNone", () => {
    expect(parseTransform("none")).toEqual({ tx: 0, ty: 0, scale: 1, rotate: 0 });
  });

  test("shouldReadTranslateFunctions", () => {
    expect(parseTransform("translate(20px)")).toEqual({ tx: 20, ty: 0, scale: 1, rotate: 0 });
    expect(parseTransform("translate(10px, 5px)")).toEqual({ tx: 10, ty: 5, scale: 1, rotate: 0 });
    expect(parseTransform("translateX(-8px)")).toEqual({ tx: -8, ty: 0, scale: 1, rotate: 0 });
    expect(parseTransform("translateY(40px)")).toEqual({ tx: 0, ty: 40, scale: 1, rotate: 0 });
  });

  test("shouldReadScaleAndRotateInEveryAngleUnit", () => {
    expect(parseTransform("scale(0.5)").scale).toBe(0.5);
    expect(parseTransform("rotate(90deg)").rotate).toBeCloseTo(Math.PI / 2);
    expect(parseTransform("rotate(1rad)").rotate).toBeCloseTo(1);
    expect(parseTransform("rotate(0.25turn)").rotate).toBeCloseTo(Math.PI / 2);
    expect(parseTransform("translateY(10px) scale(1.2) rotate(-45deg)")).toEqual({ tx: 0, ty: 10, scale: 1.2, rotate: -Math.PI / 4 });
  });

  test("shouldDecomposeComputedMatrix", () => {
    expect(parseTransform("matrix(1, 0, 0, 1, 18.9784, 0)")).toEqual({ tx: 18.9784, ty: 0, scale: 1, rotate: 0 });
    const c = Math.cos(Math.PI / 6) * 2, s = Math.sin(Math.PI / 6) * 2;
    const t = parseTransform(`matrix(${c}, ${s}, ${-s}, ${c}, 3, 4)`);
    expect(t.tx).toBe(3);
    expect(t.ty).toBe(4);
    expect(t.scale).toBeCloseTo(2);
    expect(t.rotate).toBeCloseTo(Math.PI / 6);
  });
});
