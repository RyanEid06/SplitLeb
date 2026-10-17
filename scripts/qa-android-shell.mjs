import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

// Chromium integration proof of native JS paths, not Android WebView/device QA.
// Serve only packaged files by interception, even with browser networking offline.
const root = resolve("android/app/src/main/assets/public");
const profile = await mkdtemp(resolve("output/android-qa/native-profile-"));
const evidence = [];
const check = (name) => {
  evidence.push(name);
  console.log("PASS " + name);
};
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};
async function launch() {
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    viewport: { width: 390, height: 844 },
    headless: true,
  });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== "https://localhost")
      throw new Error("Unexpected external request: " + url.origin);
    const path = resolve(
      root,
      "." + (extname(url.pathname) ? url.pathname : "/index.html"),
    );
    assert.ok(path.startsWith(root + sep));
    await route.fulfill({
      body: await readFile(path),
      contentType: mime[extname(path)] || "application/octet-stream",
    });
  });
  await context.addInitScript(() => {
    window.androidBridge = {};
    window.__minimized = 0;
    window.Capacitor = {
      PluginHeaders: [
        {
          name: "App",
          methods: [
            { name: "addListener", rtype: "callback" },
            { name: "minimizeApp", rtype: "promise" },
          ],
        },
      ],
      nativeCallback(plugin, method, options, callback) {
        if (
          plugin === "App" &&
          method === "addListener" &&
          options.eventName === "backButton"
        )
          window.__androidBack = callback;
        else throw new Error("Unexpected native callback");
        return "test-back-listener";
      },
      async nativePromise(plugin, method) {
        if (plugin === "App" && method === "minimizeApp") {
          window.__minimized++;
          return;
        }
        throw new Error("Unexpected native promise");
      },
    };
  });
  await context.setOffline(true);
  return context;
}
let context = await launch();
try {
  let page = context.pages()[0];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("https://localhost/");
  await page.getByRole("heading", { name: /Good company/ }).waitFor();
  await page.waitForFunction(() => typeof window.__androidBack === "function");
  assert.equal(
    await page.evaluate(() => window.Capacitor.getPlatform()),
    "android",
  );
  assert.equal(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
    0,
  );
  assert.equal(
    await page.evaluate(async () => (await caches.keys()).length),
    0,
  );
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("splitleb:update", { detail: { waiting: {} } }),
    ),
  );
  assert.equal(
    await page.getByRole("button", { name: "Update", exact: true }).count(),
    0,
  );
  await page
    .getByText("You're offline. Your saved bills are here.", { exact: true })
    .waitFor();
  check(
    "Native environment cold-loads packaged assets offline without worker/cache/update UI",
  );

  await page
    .getByRole("link", { name: "New bill", exact: true })
    .first()
    .click();
  await page.getByLabel("Name", { exact: true }).fill("Offline person");
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.evaluate(() => window.__androidBack({ canGoBack: true }));
  assert.equal(new URL(page.url()).pathname, "/bills/new");
  await page.getByText("Offline person", { exact: true }).waitFor();
  check(
    "Native Back reaches the actual unsaved router confirmation and cancel preserves the form",
  );

  await page.getByLabel("Name", { exact: true }).fill("Second person");
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByRole("button", { name: "Start splitting" }).click();
  await page
    .getByRole("heading", { name: "Shared bill", exact: true })
    .waitFor();
  const billURL = page.url();
  await page.getByLabel("Item", { exact: true }).fill("Offline dinner");
  await page.getByLabel("Unit price", { exact: true }).fill("10.01");
  await page.getByLabel("Unit price", { exact: true }).press("Enter");
  await page
    .getByRole("button", { name: "Split Offline dinner", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.evaluate(() => window.__androidBack({ canGoBack: true }));
  await page.getByRole("dialog").waitFor({ state: "detached" });
  assert.equal(page.url(), billURL);
  check("Native Back cancels the real assignment dialog before navigating");
  await page.getByRole("button", { name: "Review bill", exact: true }).click();
  await page.getByRole("heading", { name: "Review & settle" }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();

  context = await launch();
  page = context.pages()[0];
  await page.goto(billURL);
  await page.getByLabel("Item 1 name", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Item 1 name", { exact: true }).inputValue(),
    "Offline dinner",
  );
  const names = await page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const request = indexedDB.open("splitleb-local-db");
      request.onsuccess = () => resolve(request.result);
    });
    const bills = await new Promise((resolve) => {
      const request = db.transaction("bills").objectStore("bills").getAll();
      request.onsuccess = () => resolve(request.result);
    });
    db.close();
    return bills[0].people.map((person) => person.name);
  });
  assert.deepEqual(names, ["Offline person", "Second person"]);
  check(
    "IndexedDB bill survives full persistent-browser close/reopen offline at native origin",
  );
  await page.getByRole("link", { name: "Home", exact: true }).first().click();
  await page.evaluate(() => window.__androidBack({ canGoBack: true }));
  assert.equal(await page.evaluate(() => window.__minimized), 1);
  check(
    "Native Home Back invokes background/minimize without destroying the app",
  );
  await writeFile(
    "output/android-qa/native-shell-results.json",
    JSON.stringify(
      {
        kind: "Chromium with mocked native bridge, not Android/device proof",
        evidence,
      },
      null,
      2,
    ),
  );
} finally {
  await context.close();
}
