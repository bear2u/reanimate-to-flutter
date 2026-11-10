import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "./serve";

test("shouldServeIndexAndWasmWithTheRightContentType", async () => {
  const dir = mkdtempSync(join(tmpdir(), "serve-"));
  writeFileSync(join(dir, "index.html"), "<p>hi</p>");
  writeFileSync(join(dir, "canvaskit.wasm"), new Uint8Array([0, 97, 115, 109]));
  const server = startServer(dir, 0);
  try {
    const index = await fetch(new URL("/", server.url));
    expect(await index.text()).toBe("<p>hi</p>");
    const wasm = await fetch(new URL("/canvaskit.wasm", server.url));
    expect(wasm.headers.get("content-type")).toBe("application/wasm");
    expect((await fetch(new URL("/missing.js", server.url))).status).toBe(404);
  } finally {
    server.stop(true);
  }
});
