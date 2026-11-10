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
});
