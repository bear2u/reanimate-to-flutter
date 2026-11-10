// serve.ts — serve a Flutter web build (build/web) so reanimate's capture.ts can record it.
//   bun serve.ts <build/web> [--port 5180]
import { existsSync, statSync } from "node:fs";
import { join, normalize, resolve, sep } from "node:path";

const TYPES: Record<string, string> = { wasm: "application/wasm", js: "text/javascript", mjs: "text/javascript", json: "application/json", html: "text/html" };

export function startServer(dir: string, port: number) {
  const root = resolve(dir);
  return Bun.serve({
    port,
    fetch(req) {
      const path = normalize(decodeURIComponent(new URL(req.url).pathname));
      let file = join(root, path);
      if (file !== root && !file.startsWith(root + sep)) return new Response("forbidden", { status: 403 });
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
      if (!existsSync(file)) return new Response("not found", { status: 404 });
      const type = TYPES[file.split(".").pop() ?? ""];
      return new Response(Bun.file(file), type ? { headers: { "content-type": type } } : undefined);
    },
  });
}

if (import.meta.main) {
  const dir = process.argv[2];
  if (!dir) { console.log("bun serve.ts <build/web> [--port 5180]"); process.exit(1); }
  const i = process.argv.indexOf("--port");
  const server = startServer(dir, i > 0 ? Number(process.argv[i + 1]) : 5180);
  console.log(`serving ${resolve(dir)} at ${server.url}`);
}
