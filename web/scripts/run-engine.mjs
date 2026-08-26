/**
 * Start the Python memory engine from inside web/.
 *
 * The engine is a separate process holding the SQLite memory; the Next app is
 * only its face. Two terminals:  `pnpm engine`  and  `pnpm dev`.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const win = process.platform === "win32";
const venv = path.join(root, ".venv", win ? "Scripts/python.exe" : "bin/python");
const python = existsSync(venv) ? venv : win ? "python" : "python3";

if (!existsSync(venv)) {
  console.warn(
    `no venv at ${venv} — falling back to "${python}".\n` +
      `if this fails: cd .. && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt`,
  );
}

const port = process.env.PRECEDENT_PORT ?? "8787";
console.log(`starting memory engine on http://127.0.0.1:${port}  (cwd ${root})`);

const child = spawn(python, ["-m", "uvicorn", "precedent.server:app", "--port", port], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
