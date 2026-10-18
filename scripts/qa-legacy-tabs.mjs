import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { fullBackup } from "../src/storage/fixtures/fullBackup.ts";

// Real original-V1 connection remains open while promoted UI loads on the same
// isolated origin. Worker/cache behavior is covered separately by qa:pwa.
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
try {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const oldTab = await context.newPage();
  await context.route("https://localhost/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const extension = extname(path);
    const root = resolve(
      route.request().frame().page() === oldTab
        ? "output/playwright/v1-dist"
        : "dist",
    );
    const file = resolve(root, "." + (extension ? path : "/index.html"));
    assert.ok(file.startsWith(root + sep));
    await route.fulfill({
      body: await readFile(file),
      contentType:
        {
          ".js": "text/javascript",
          ".css": "text/css",
          ".png": "image/png",
          ".svg": "image/svg+xml",
        }[extension] || "text/html",
    });
  });
  await oldTab.goto("https://localhost/history");
  await oldTab.waitForFunction(async () =>
    (await indexedDB.databases()).some(
      (db) => db.name === "splitleb-local-db" && db.version === 2,
    ),
  );
  const backup = fullBackup();
  await oldTab.evaluate(async (backup) => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("splitleb-local-db");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const tx = db.transaction(["bills", "savedGroups"], "readwrite");
    for (const bill of backup.bills) tx.objectStore("bills").put(bill);
    for (const group of backup.groups) tx.objectStore("savedGroups").put(group);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, backup);
  for (const path of ["/", "/history", "/groups"]) {
    const tab = await context.newPage();
    await tab.goto("https://localhost" + path);
    await tab
      .getByRole("alert")
      .filter({ hasText: "Close other SplitLeb tabs or windows" })
      .waitFor({ timeout: 10000 })
      .catch(async (error) => {
        console.error({
          path,
          alerts: await tab.getByRole("alert").allTextContents(),
          loading: await tab.getByRole("status").allTextContents(),
        });
        throw error;
      });
    console.log("PASS blocked original-V1 tab guidance on " + path);
    await tab.close();
  }
  await oldTab.close();
  const retry = await context.newPage();
  await retry.goto("https://localhost/");
  await retry.getByText("Saved group 0", { exact: true }).waitFor();
  assert.equal(await retry.getByRole("alert").count(), 0);
  const records = await retry.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("splitleb-local-db");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const all = (name) =>
      new Promise((resolve, reject) => {
        const r = db.transaction(name).objectStore(name).getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    const result = {
      version: db.version,
      bills: await all("bills"),
      groups: await all("savedGroups"),
    };
    db.close();
    return result;
  });
  assert.equal(records.version, 3);
  const byId = (a, b) => a.id.localeCompare(b.id);
  assert.deepEqual(records.bills.sort(byId), backup.bills.sort(byId));
  assert.deepEqual(records.groups.sort(byId), backup.groups.sort(byId));
  console.log(
    "PASS closing original V1 allows upgrade/reload with all 18 bills and 3 groups unchanged",
  );
  await writeFile(
    "output/production-switch/legacy-tabs-results.json",
    JSON.stringify({
      passed: true,
      routes: ["/", "/history", "/groups"],
      preservedBills: 18,
      preservedGroups: 3,
    }),
  );
} finally {
  await browser.close();
}
