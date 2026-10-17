import { execFileSync } from "node:child_process";
import { mkdirSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";

// Reconstruct the immutable production source; never check out or change main.
const baseline = "0a1334ed44cde1ef1cb48550fef18a71356f41e1";
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
