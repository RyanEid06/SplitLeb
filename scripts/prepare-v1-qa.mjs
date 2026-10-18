import { execFileSync } from "node:child_process";
import { mkdirSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";

// Reconstruct the immutable production source; never check out or change main.
const baseline = "e0ccf8067ec5bcaca122d2d57a5e2d6afcb24064";
const root = realpathSync(process.cwd());
const source = resolve(root, "output/playwright/v1-source");
const output = resolve(root, "output/playwright/v1-dist");
if (![source, output].every((path) => path.startsWith(root + sep)))
  throw new Error("QA paths must stay inside the repository");
mkdirSync(source, { recursive: true });
const archive = execFileSync("git", ["archive", "--format=tar", baseline], {
  maxBuffer: 32 * 1024 * 1024,
});
execFileSync("tar", ["-xf", "-", "-C", source], { input: archive });
execFileSync(
  process.execPath,
  [
    resolve(root, "node_modules/vite/bin/vite.js"),
    "build",
    "--outDir",
    output,
    "--emptyOutDir",
  ],
  { cwd: source, stdio: "inherit" },
);
console.log("Prepared production V1 " + baseline + " at " + output);
