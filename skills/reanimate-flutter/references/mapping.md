# Web motion → Flutter

## Easing

| Reference | Flutter |
|---|---|
| `linear` | `Curves.linear` |
| `ease` | `Curves.ease` (same control points: 0.25, 0.1, 0.25, 1) |
| `ease-in` / `ease-out` / `ease-in-out` | `Curves.easeIn` / `Curves.easeOut` / `Curves.easeInOut` (same control points as CSS) |
| `cubic-bezier(a, b, c, d)` | `Cubic(a, b, c, d)` |
| easeOutExpo `cubic-bezier(0.16,1,0.3,1)`, GSAP `expo.out` | `Cubic(0.16, 1.0, 0.3, 1.0)` (`Curves.easeOutExpo` is `Cubic(0.19, 1.0, 0.22, 1.0)`, close but not the same) |
| GSAP `power2.out` | `Cubic(0.33, 1.0, 0.68, 1.0)` (`Curves.easeOutCubic` is `Cubic(0.215, 0.61, 0.355, 1.0)`, not the same) |
| GSAP `back.out(1.7)` | not a cubic; `Curves.easeOutBack` (`Cubic(0.175, 0.885, 0.32, 1.275)`) is a close start, then fit it with `easing.ts` |
| `steps(n, end)` | `_Steps(n)`, a `Curve` whose `transformInternal(t) => (t * n).floor() / n` |
| `linear(…)` sampled curve | a `Curve` that interpolates the sampled points |
| Framer Motion / spring (overshoot, settle time from `easing.ts`) | `SpringSimulation(SpringDescription(mass: 1, stiffness: k, damping: c), from, to, velocity)` driven by `controller.animateWith(...)`; pick ζ from the overshoot and k from the settle time as in reanimate's `implementation.md` |

## Timing

| Reference | Flutter |
|---|---|
| `@keyframes` with offsets | `TweenSequence` with `weight` = offset gap in %; a hold is `ConstantTween` |
| per-keyframe `animation-timing-function` | the easing of the keyframe a segment **starts** at, as `.chain(CurveTween(curve: …))` |
| `animation-duration` | `AnimationController(duration: …)` |
| `animation-iteration-count: infinite` | `controller.repeat()` |
| `animation-direction: alternate` | `controller.repeat(reverse: true)` |
| stagger by `animation-delay` (finite) | one controller over `max(delay + duration)`, `Interval(delay / total, (delay + duration) / total)` per element |
| negative delays in a loop | one controller, phase `(-delay / duration) mod 1` added to `controller.value` per element |
| `animation-fill-mode: forwards` | the controller stays at 1.0 after `forward()` (default) |
| transition on hover | `MouseRegion` + `controller.forward()` / `reverse()`, or `AnimatedContainer` / `TweenAnimationBuilder` with the same duration and curve |
| scroll-linked (`animation-timeline: scroll()`, ScrollTrigger scrub) | `ScrollController` listener mapping offset → value with the two endpoints from `track.json`, or `ScrollPosition` in an `AnimatedBuilder` |
| enter-viewport trigger | `VisibilityDetector` (package) or a `ScrollController` check against the threshold measured from `track.json` |

## Properties

| CSS | Flutter |
|---|---|
| `translate`, `translateX/Y` | `Transform.translate(offset: Offset(x, y))` (logical px = CSS px) |
| `scale` | `Transform.scale(scale: s)` (centre origin); non-uniform: `Transform(transform: Matrix4.diagonal3Values(sx, sy, 1))` |
| `rotate` | `Transform.rotate(angle: rad)` |
| `transform-origin` | `alignment:` on the `Transform` (`Alignment(-1, -1)` = top left) or `origin:` |
| `opacity` | `Opacity` / `FadeTransition` (cheaper for a lone fade) |
| `clip-path: inset()` reveal | `ClipRect` + `Align(widthFactor: t)` or a custom `CustomClipper` |
| `border-radius`, `box-shadow`, `background` | `BoxDecoration(borderRadius:, boxShadow:, color: / gradient:)` |
| `filter: blur()` | `ImageFiltered(imageFilter: ImageFilter.blur(...))` |
| canvas / WebGL | `CustomPainter` or `FragmentProgram` (port the traced GLSL to Flutter's shader dialect) |

## Known differences (report them, do not chase them)

- **Start lag of one frame.** A Flutter `Ticker` starts counting at the first frame after `forward()` / `repeat()`, while CSS counts from the moment the animation starts. The clone trails by one frame. `compare.ts` auto-aligns it (`clone offset 1`) and it stays within the ±80 ms timing limit.
- **Anti-aliasing.** CanvasKit and Chrome rasterise edges differently. A few % of edge pixels differ on small shapes, even when position and timing are exact. Raise `--pixel-threshold` slightly (0.15) for pixel-faithful work before concluding the geometry is off.
- **Text.** Flutter shapes and lays out text itself, so line breaks and baselines can differ from the browser. For motion-faithful work, judge text by timing, not pixels. For pixel-faithful work, bundle the same font files.
