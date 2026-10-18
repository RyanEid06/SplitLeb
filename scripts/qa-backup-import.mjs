import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fullBackup } from "../src/storage/fixtures/fullBackup.ts";

// Production web asset integration in Chromium with isolated synthetic storage.
// Optionally pass the original JSON backup path; it is never modified/logged.
const backup = process.argv[2]
  ? JSON.parse(await readFile(process.argv[2], "utf8"))
  : fullBackup();
assert.equal(backup.bills.length, 18);
assert.equal(backup.groups.length, 3);
const root = resolve(process.env.SPLITLEB_BACKUP_ASSETS || "dist");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
try {
  for (const scenario of [
    "fresh",
    "v1-bills-only",
    "v2-bills-only",
    "v2-missing-indexes",
    "refresh-failure",
    "file-read-failure",
  ]) {
    const context = await browser.newContext({ serviceWorkers: "block" });
    try {
      await context.route("https://localhost/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/seed")
          return route.fulfill({
            body: "<html></html>",
            contentType: "text/html",
          });
        const extension = extname(path);
        const file = resolve(root, "." + (extension ? path : "/index.html"));
        assert.ok(file.startsWith(root + sep));
        await route.fulfill({
          body: await readFile(file),
          contentType:
            {
              ".js": "text/javascript",
              ".css": "text/css",
              ".png": "image/png",
            }[extension] || "text/html",
        });
      });
      const page = await context.newPage();
      const diagnostics = [];
      page.on("console", (message) => {
        if (message.type() === "error") diagnostics.push(message.text());
      });
      await page.goto("https://localhost/seed");
      const legacyBill = {
        ...backup.bills[0],
        id: "qa-existing-bill",
        note: "Preserve local history",
      };
      const legacyGroup = { ...backup.groups[0], id: "qa-existing-group" };
      const legacy = scenario.startsWith("v");
      if (legacy)
        await page.evaluate(
          async ({ scenario, legacyBill, legacyGroup }) => {
            await new Promise((resolve, reject) => {
              const request = indexedDB.open(
                "splitleb-local-db",
                scenario.startsWith("v1") ? 1 : 2,
              );
              request.onupgradeneeded = () => {
                request.result
                  .createObjectStore("bills", { keyPath: "id" })
                  .put(legacyBill);
                if (scenario === "v2-missing-indexes")
                  request.result
                    .createObjectStore("savedGroups", { keyPath: "id" })
                    .put(legacyGroup);
              };
              request.onsuccess = () => {
                request.result.close();
                resolve();
              };
              request.onerror = () => reject(request.error);
            });
          },
          { scenario, legacyBill, legacyGroup },
        );
      await page.goto("https://localhost/history");
      await page
        .getByLabel("Choose backup file")
        .waitFor({ state: "attached" });
      if (scenario === "refresh-failure")
        await page.evaluate(() => {
          IDBObjectStore.prototype.index = function () {
            throw new DOMException("Injected refresh failure", "NotFoundError");
          };
        });
      if (scenario === "file-read-failure")
        await page.evaluate(() => {
          File.prototype.text = async function () {
            throw new DOMException("Injected read failure", "NotReadableError");
          };
        });
      page.on("dialog", (dialog) => dialog.accept());
      const select = () =>
        page.getByLabel("Choose backup file").setInputFiles({
          name: "backup.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(backup)),
        });
      await select();
      if (scenario === "file-read-failure") {
        await page
          .getByRole("alert")
          .filter({ hasText: "Could not read this file" })
          .waitFor();
        assert.ok(
          diagnostics.some(
            (d) => d.includes("file-read") && d.includes("NotReadableError"),
          ),
        );
      } else {
        await page
          .getByRole("status")
          .filter({
            hasText: "Imported 18 bills and 3 groups. Skipped 0 duplicates.",
          })
          .waitFor();
        if (scenario === "refresh-failure") {
          await page
            .getByRole("alert")
            .filter({
              hasText:
                "Your backup was imported, but the list could not refresh",
            })
            .waitFor();
          assert.ok(diagnostics.some((d) => d.includes("refresh")));
        } else {
          await select();
          await page
            .getByRole("status")
            .filter({
              hasText: "Imported 0 bills and 0 groups. Skipped 21 duplicates.",
            })
            .waitFor();
        }
      }
      const records = await page.evaluate(async () => {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open("splitleb-local-db");
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const result = await Promise.all(
          ["bills", "savedGroups"].map(
            (name) =>
              new Promise((resolve, reject) => {
                const request = db.transaction(name).objectStore(name).getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
              }),
          ),
        );
        db.close();
        return result;
      });
      const failed = scenario === "file-read-failure";
      assert.equal(records[0].length, (failed ? 0 : 18) + (legacy ? 1 : 0));
      assert.equal(
        records[1].length,
        (failed ? 0 : 3) + (scenario === "v2-missing-indexes" ? 1 : 0),
      );
      if (legacy)
        assert.deepEqual(
          records[0].find((b) => b.id === legacyBill.id),
          legacyBill,
        );
      if (scenario === "v2-missing-indexes")
        assert.deepEqual(
          records[1].find((g) => g.id === legacyGroup.id),
          legacyGroup,
        );
      console.log("PASS backup import " + scenario);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
