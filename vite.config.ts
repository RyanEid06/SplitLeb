import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? filesIn(join(directory, entry.name))
      : [join(directory, entry.name)],
  );
}
export default defineConfig({
  server: { watch: { ignored: ["**/output/**", "**/.playwright-cli/**"] } },
  test: { include: ["src/**/*.test.{ts,tsx}"] },
  plugins: [
    react(),
    {
      name: "splitleb-offline-shell",
      apply: "build",
      closeBundle() {
        const files = filesIn("dist")
          .filter((file) => !file.replaceAll("\\", "/").endsWith("/sw.js"))
          .sort();
        const template = readFileSync("public/sw.js", "utf8");
        const digest = createHash("sha256").update(template);
        for (const file of files) digest.update(readFileSync(file));
        const buildId = digest.digest("hex").slice(0, 16);
        const urls = files.map(
          (file) => "/" + file.replaceAll("\\", "/").replace(/^dist\//, ""),
        );
        const digests = Object.fromEntries(
          files.map((file, index) => [
            urls[index],
            createHash("sha256").update(readFileSync(file)).digest("hex"),
          ]),
        );
        writeFileSync(
          "dist/sw.js",
          template
            .replace("__SPLITLEB_BUILD_ID__", buildId)
            .replace("__SPLITLEB_PRECACHE__", JSON.stringify(urls))
            .replace("__SPLITLEB_DIGESTS__", JSON.stringify(digests)),
        );
      },
    },
  ],
});
