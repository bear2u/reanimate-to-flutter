// Long-running: creates a Flutter project and runs `flutter analyze` on generated widgets.
// Runs only with REANIMATE_FLUTTER_IT=1 (needs the Flutter SDK on PATH).
import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emitWidget, groupAnimations } from "./css2flutter";

const run = process.env.REANIMATE_FLUTTER_IT === "1";
const sh = (cmd: string[], cwd: string) => Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" });

test.skipIf(!run)("shouldGenerateDartThatPassesFlutterAnalyze", () => {
  const dir = mkdtempSync(join(tmpdir(), "css2flutter-it-"));
  expect(sh(["flutter", "create", "--platforms", "web", "-e", "--project-name", "it_app", "app"], dir).exitCode).toBe(0);
  const app = join(dir, "app");
  const t = (delay: number, iterations: number | null, keyframes: any[]) => ({ name: "m", target: "i", timing: { delay, duration: 600, iterations }, keyframes });
  const loop = [{ offset: 0, easing: "cubic-bezier(0.16, 1, 0.3, 1)", transform: "translate(0px)" }, { offset: 0.5, easing: "ease", transform: "translate(20px) rotate(10deg) scale(1.1)" }, { offset: 1, transform: "translate(0px)" }];
  const rise = [{ offset: 0, easing: "ease-out", opacity: "0", transform: "translateY(40px)" }, { offset: 1, opacity: "1", transform: "none" }];
  writeFileSync(join(app, "lib", "loop_motion.dart"), emitWidget(groupAnimations([t(-120, null, loop), t(0, null, loop)], "m"), "LoopMotion"));
  writeFileSync(join(app, "lib", "rise_motion.dart"), emitWidget(groupAnimations([t(0, 1, rise), t(120, 1, rise)], "m"), "RiseMotion"));
  const r = sh(["flutter", "analyze", "lib/loop_motion.dart", "lib/rise_motion.dart"], app);
  expect(r.stdout.toString() + r.stderr.toString()).toContain("No issues found!");
}, 300_000);
