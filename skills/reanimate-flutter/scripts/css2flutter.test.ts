import { describe, expect, test } from "bun:test";
import { curveFor, dartTweenSequence, groupAnimations, parseTransform, segments } from "./css2flutter";

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

// the reanimate.niazmorshed.dev logo mark, as inspect.json reports it
const OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const MARK_KEYFRAMES = [
  { offset: 0, easing: OUT, transform: "translate(0px)" },
  { offset: 0.12, easing: OUT, transform: "translate(0px)" },
  { offset: 0.5, easing: OUT, transform: "translate(20px)" },
  { offset: 0.62, easing: OUT, transform: "translate(20px)" },
  { offset: 1, easing: OUT, transform: "translate(0px)" },
];

describe("segments", () => {
  test("shouldSplitKeyframesIntoWeightedSegmentsPerChangingProperty", () => {
    const cubic = "Cubic(0.16, 1.0, 0.3, 1.0)";
    expect(segments(MARK_KEYFRAMES)).toEqual({
      tx: [
        { weight: 12, from: 0, to: 0, curve: null },
        { weight: 38, from: 0, to: 20, curve: cubic },
        { weight: 12, from: 20, to: 20, curve: null },
        { weight: 38, from: 20, to: 0, curve: cubic },
      ],
    });
  });
  test("shouldIncludeOpacityAndUseTheStartKeyframeEasing", () => {
    const s = segments([
      { offset: 0, easing: "ease-in", opacity: "0", transform: "translateY(40px)" },
      { offset: 1, easing: "linear", opacity: "1", transform: "none" },
    ]);
    expect(s.opacity).toEqual([{ weight: 100, from: 0, to: 1, curve: "Curves.easeIn" }]);
    expect(s.ty).toEqual([{ weight: 100, from: 40, to: 0, curve: "Curves.easeIn" }]);
    expect(s.tx).toBeUndefined();
  });
});

describe("dartTweenSequence", () => {
  test("shouldEmitTweenSequenceWithConstantTweenForHolds", () => {
    expect(dartTweenSequence(segments(MARK_KEYFRAMES).tx!)).toBe(
      [
        "TweenSequence<double>([",
        "  TweenSequenceItem(tween: ConstantTween<double>(0.0), weight: 12.0),",
        "  TweenSequenceItem(tween: Tween<double>(begin: 0.0, end: 20.0).chain(CurveTween(curve: const Cubic(0.16, 1.0, 0.3, 1.0))), weight: 38.0),",
        "  TweenSequenceItem(tween: ConstantTween<double>(20.0), weight: 12.0),",
        "  TweenSequenceItem(tween: Tween<double>(begin: 20.0, end: 0.0).chain(CurveTween(curve: const Cubic(0.16, 1.0, 0.3, 1.0))), weight: 38.0),",
        "])",
      ].join("\n"),
    );
  });
});

const anim = (target: string, delay: number, duration: number, iterations: number | null, keyframes = MARK_KEYFRAMES) => ({
  kind: "CSSAnimation", name: "mark", target,
  timing: { delay, duration, iterations, direction: "normal", easing: "linear", fill: "none" },
  keyframes,
});

describe("groupAnimations", () => {
  test("shouldGiveInfiniteLoopsOneControllerAndAPhasePerElement", () => {
    const g = groupAnimations([anim("i", -240, 2400, null), anim("i", -120, 2400, null), anim("i", 0, 2400, null)], "mark");
    expect(g).toEqual({
      name: "mark", periodMs: 2400, repeat: true, reverse: false, keyframes: MARK_KEYFRAMES,
      elements: [{ target: "i", shift: 0.1 }, { target: "i", shift: 0.05 }, { target: "i", shift: 0 }],
    });
  });

  test("shouldGiveFiniteStaggerAnIntervalPerElementOverTheWholeRun", () => {
    const g = groupAnimations([anim(".card", 0, 600, 1), anim(".card", 120, 600, 1), anim(".card", 240, 600, 1)], "mark");
    expect(g.periodMs).toBe(840);
    expect(g.repeat).toBe(false);
    expect(g.elements).toEqual([
      { target: ".card", interval: [0, 0.714286] },
      { target: ".card", interval: [0.142857, 0.857143] },
      { target: ".card", interval: [0.285714, 1] },
    ]);
  });
});
