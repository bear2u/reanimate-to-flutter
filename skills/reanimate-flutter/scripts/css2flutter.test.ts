import { describe, expect, test } from "bun:test";
import { curveFor } from "./css2flutter";

describe("curveFor", () => {
  test("shouldMapCubicBezierToFlutterCubic", () => {
    expect(curveFor("cubic-bezier(0.16, 1, 0.3, 1)")).toBe("Cubic(0.16, 1.0, 0.3, 1.0)");
  });
});
