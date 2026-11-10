import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { curveFor, dartTweenSequence, emitWidget, groupAnimations, parseTransform, segments } from "./css2flutter";

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

describe("emitWidget", () => {
  test("shouldEmitALoopingMotionWidgetWithPhasesAndARestartHook", () => {
    const g = groupAnimations([anim("i", -240, 2400, null), anim("i", -120, 2400, null), anim("i", 0, 2400, null)], "mark");
    const dart = emitWidget(g, "MarkMotion");
    expect(dart).toContain("class MarkMotion extends StatefulWidget {");
    expect(dart).toContain("class MarkMotionState extends State<MarkMotion> with SingleTickerProviderStateMixin {");
    expect(dart).toContain("duration: const Duration(milliseconds: 2400)");
    expect(dart).toContain("void restart() => _controller..reset()..repeat();");
    expect(dart).toContain("static const List<double> _shift = [0.1, 0.05, 0.0];");
    expect(dart).toContain("double _t(int i) => (_controller.value + _shift[i]) % 1.0;");
    expect(dart).toContain("static final Animatable<double> _tx = TweenSequence<double>([");
    expect(dart).toContain("w = Transform.translate(offset: Offset(_tx.transform(t), 0.0), child: w);");
    expect(dart).not.toContain("_ty");
    expect(dart).not.toContain("Opacity(");
  });

  test("shouldEmitAFiniteStaggerWithAnIntervalPerElement", () => {
    const rise = [
      { offset: 0, easing: "ease-out", opacity: "0", transform: "translateY(40px)" },
      { offset: 1, easing: "ease-out", opacity: "1", transform: "none" },
    ];
    const g = groupAnimations([anim(".card", 0, 600, 1, rise), anim(".card", 120, 600, 1, rise)], "mark");
    const dart = emitWidget(g, "RiseMotion");
    expect(dart).toContain("void restart() => _controller..reset()..forward();");
    expect(dart).toContain("static const List<Interval> _interval = [Interval(0.0, 0.833333), Interval(0.166667, 1.0)];");
    expect(dart).toContain("double _t(int i) => _interval[i].transform(_controller.value);");
    expect(dart).not.toContain("_shift");
    expect(dart).toContain("w = Transform.translate(offset: Offset(0.0, _ty.transform(t)), child: w);");
    expect(dart).toContain("w = Opacity(opacity: _opacity.transform(t).clamp(0.0, 1.0), child: w);");
  });
});

describe("CLI", () => {
  const cli = (args: string[]) => Bun.spawnSync(["bun", join(import.meta.dir, "css2flutter.ts"), ...args], { stderr: "pipe", stdout: "pipe" });
  const inspectFile = () => {
    const dir = mkdtempSync(join(tmpdir(), "css2flutter-"));
    const file = join(dir, "inspect.json");
    writeFileSync(file, JSON.stringify({ animations: [anim("i", -240, 2400, null), anim("i", 0, 2400, null)] }));
    return { dir, file };
  };

  test("shouldWriteTheWidgetForTheNamedAnimation", () => {
    const { dir, file } = inspectFile();
    const out = join(dir, "mark_motion.dart");
    const r = cli(["--inspect", file, "--name", "mark", "--widget", "MarkMotion", "--out", out]);
    expect(r.exitCode).toBe(0);
    expect(readFileSync(out, "utf8")).toContain("class MarkMotion extends StatefulWidget {");
  });

  test("shouldListTheAvailableNamesWhenTheNameIsUnknown", () => {
    const { file } = inspectFile();
    const r = cli(["--inspect", file, "--name", "rise", "--widget", "RiseMotion"]);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain('no animation named "rise" in inspect.json; found: mark');
  });
});
