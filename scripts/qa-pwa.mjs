import { chromium } from "playwright";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

// Local-only test server: swaps builds on one origin without touching hosting.
let root = resolve("output/playwright/v1-dist");
let workerVariant = "";
const requests = [];
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    requests.push(path);
    const file = resolve(root, "." + (extname(path) ? path : "/index.html"));
    if (!file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    let body = await readFile(file);
    if (path === "/index.html" && workerVariant === "-mixed")
      body = Buffer.concat([body, Buffer.from("<!-- newer deployment -->")]);
    if (path === "/sw.js" && workerVariant) {
      let source = body
        .toString()
        .replace(
          /CACHE_PREFIX \+ "([a-f0-9]+)"/,
          'CACHE_PREFIX + "$1' + workerVariant + '"',
        );
      if (workerVariant === "-broken")
        source = source.replace(
          "const PRECACHE_URLS = [",
          'const PRECACHE_URLS = ["/assets/missing-qa.js",',
        );
      body = Buffer.from(source);
    }
    response
      .writeHead(200, {
        "content-type": types[extname(file)] || "application/octet-stream",
        "cache-control": "no-store",
      })
      .end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = "http://127.0.0.1:" + server.address().port;
await mkdir("output/playwright", { recursive: true });
const profile = resolve("output/playwright/pwa-profile-" + Date.now());
const launch = () =>
  chromium.launchPersistentContext(profile, {
    headless: true,
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  });
let context = await launch();
let page = await context.newPage();
const evidence = [];
const check = (name) => {
  evidence.push(name);
  console.log("PASS " + name);
};
const accept = () => page.once("dialog", (dialog) => dialog.accept());
async function records() {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("splitleb-local-db");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const get = (name) =>
      new Promise((resolve) => {
        const r = db.transaction(name).objectStore(name).getAll();
        r.onsuccess = () => resolve(r.result);
      });
    const result = {
      bills: await get("bills"),
      groups: await get("savedGroups"),
    };
    db.close();
    return result;
  });
}
async function addPeople(names) {
  for (const name of names) {
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByRole("button", { name: "Add person", exact: true }).click();
  }
}
try {
  // Build V1 data with the actual production UI, not a fabricated schema.
  await page.goto(base + "/bills/new");
  await page.getByLabel("Bill name", { exact: true }).fill("Legacy dinner");
  await addPeople(["Ryan", "Maya"]);
  await page
    .getByRole("button", { name: "Create bill workspace", exact: true })
    .click();
  await page.getByLabel("Item", { exact: true }).fill("Dinner");
  await page.getByLabel("Unit price", { exact: true }).fill("10.01");
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByRole("button", { name: "Save bill", exact: true }).click();
  await page.getByText("Saved.", { exact: true }).waitFor();
  const legacyWorkspace = new URL(page.url()).pathname;
  await page.goto(base + "/groups");
  await page.getByLabel("New group", { exact: true }).fill("Legacy crew");
  await page.getByRole("button", { name: "Create group", exact: true }).click();
  for (const name of ["Ryan", "Maya", "Archived friend"]) {
    await page.getByLabel("Add member", { exact: true }).fill(name);
    await page.getByRole("button", { name: "Add member", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Rename " + name, exact: true })
      .waitFor();
  }
  accept();
  await page
    .getByRole("row")
    .filter({
      has: page.getByRole("textbox", {
        name: "Rename Archived friend",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Archive", exact: true })
    .click();
  await page.getByText("Archived Archived friend.", { exact: true }).waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const v1 = await records();
  assert.equal(v1.bills[0].items[0].unitPriceCents, 1001);
  assert.ok(v1.groups[0].members[2].archivedAt);
  await writeFile(
    "output/playwright/production-created-records.json",
    JSON.stringify(v1, null, 2),
  );
  check("Actual V1 UI created saved bill, group and archived member");

  root = resolve("dist");
  await page.goto(base);
  await page.getByRole("heading", { name: /Good company/ }).waitFor();
  assert.deepEqual(await records(), v1);
  await page.getByRole("button", { name: "Update", exact: true }).waitFor();
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await page.waitForLoadState("domcontentloaded");
  await page.getByRole("heading", { name: /Good company/ }).waitFor();
  assert.deepEqual(await records(), v1);
  await page.waitForFunction(
    async () => !(await navigator.serviceWorker.getRegistration()).waiting,
  );
  check(
    "V1 to V2 on the same origin preserves every stored field and accepts waiting-worker update",
  );

  // Close the actual browser; reopen its persistent profile with the network off.
  await context.close();
  context = await launch();
  await context.setOffline(true);
  page = await context.newPage();
  await page.goto(base + legacyWorkspace);
  await page
    .getByRole("heading", { name: "Legacy dinner", exact: true })
    .waitFor();
  assert.deepEqual(await records(), v1);
  await page.goto(base + "/bills/new");
  await addPeople(["Offline Ryan", "Offline Maya"]);
  await page.getByRole("button", { name: "Start splitting" }).click();
  await page.getByLabel("Item", { exact: true }).fill("Offline lunch");
  await page.getByLabel("Unit price", { exact: true }).fill("4.01");
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByRole("button", { name: "Review bill", exact: true }).click();
  await page.getByRole("heading", { name: "Review & settle" }).waitFor();
  await page.getByRole("link", { name: "Groups", exact: true }).click();
  await page
    .getByRole("heading", { name: "Legacy crew", exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: "New bill", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Start splitting" }).click();
  await page
    .getByRole("heading", { name: "Shared bill", exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: "History", exact: true })
    .first()
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  await (await download).saveAs("output/playwright/offline-backup.json");
  assert.equal((await records()).bills.length, 3);
  check(
    "After browser close/reopen offline: deep-link bill, create, review, saved group bill, history and export work",
  );

  await context.setOffline(false);
  await page.goto(base + legacyWorkspace);
  await page.getByText("Note & bill options", { exact: true }).click();
  await page
    .getByLabel("Bill note", { exact: true })
    .fill("Keep this through update");
  const otherTab = await context.newPage();
  await otherTab.goto(base + "/history");
  const previousCache = await page.evaluate(async () =>
    (await caches.keys())
      .filter((name) => name.startsWith("splitleb-app-shell-"))
      .at(-1),
  );
  workerVariant = "-qa2";
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration()).update();
  });
  await page.getByRole("button", { name: "Update", exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Update", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page.getByLabel("Bill note", { exact: true }).inputValue(),
    "Keep this through update",
  );
  await page.getByRole("button", { name: "Save bill", exact: true }).click();
  await page
    .getByRole("button", { name: "Update", exact: true })
    .waitFor({ state: "visible" });
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll("button")].find(
        (element) => element.textContent === "Update",
      )?.disabled,
  );
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await page.waitForFunction(
    async () => !(await navigator.serviceWorker.getRegistration()).waiting,
  );
  await page
    .getByRole("heading", { name: "Legacy dinner", exact: true })
    .waitFor();
  assert.equal(
    (await records()).bills.find((bill) => bill.title === "Legacy dinner").note,
    "Keep this through update",
  );
  assert.ok((await page.evaluate(() => caches.keys())).includes(previousCache));
  await context.setOffline(true);
  await otherTab.reload();
  await otherTab
    .getByRole("heading", { name: "Bill history", exact: true })
    .waitFor();
  check(
    "Update waits for saved edits, preserves note and retains caches for another open tab",
  );

  await context.setOffline(false);
  workerVariant = "-broken";
  const failed = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const outcome = new Promise((resolve) =>
      registration.addEventListener(
        "updatefound",
        () => {
          const worker = registration.installing;
          worker.addEventListener("statechange", () => {
            if (worker.state === "redundant" || worker.state === "installed")
              resolve(worker.state);
          });
        },
        { once: true },
      ),
    );
    await registration.update();
    return outcome;
  });
  assert.equal(failed, "redundant");
  assert.equal(
    (await page.evaluate(() => caches.keys())).some((name) =>
      name.endsWith("-broken"),
    ),
    false,
  );
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("heading", { name: "Legacy dinner", exact: true })
    .waitFor();
  check(
    "Incomplete update rejects installation; previous offline shell and records remain usable",
  );
  await context.setOffline(false);
  workerVariant = "-mixed";
  const mixed = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const outcome = new Promise((resolve) =>
      registration.addEventListener(
        "updatefound",
        () => {
          const worker = registration.installing;
          worker.addEventListener("statechange", () => {
            if (worker.state === "redundant" || worker.state === "installed")
              resolve(worker.state);
          });
        },
        { once: true },
      ),
    );
    await registration.update();
    return outcome;
  });
  assert.equal(
    mixed,
    "redundant",
    "MIME-correct HTML from a different deployment must not publish a mixed cache",
  );
  assert.equal(
    (await page.evaluate(() => caches.keys())).some((name) =>
      name.endsWith("-mixed"),
    ),
    false,
  );
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("heading", { name: "Legacy dinner", exact: true })
    .waitFor();
  check(
    "Content hashes reject mixed-deployment HTML and retain the working offline build",
  );
  await writeFile(
    "output/playwright/pwa-results.json",
    JSON.stringify({ evidence, profile }, null, 2),
  );
} catch (error) {
  console.error(
    "PWA diagnostic",
    await page
      .evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        const cacheNames = await caches.keys();
        const entries = await Promise.all(
          cacheNames.map(async (name) => [
            name,
            (await (await caches.open(name)).keys()).map(
              (request) => request.url,
            ),
          ]),
        );
        return {
          active: registration?.active?.state,
          waiting: registration?.waiting?.state,
          installing: registration?.installing?.state,
          entries,
          body: document.body.innerText.slice(0, 700),
        };
      })
      .catch(() => null),
  );
  console.error("Requests", requests);
  throw error;
} finally {
  await context.close();
  await new Promise((done) => server.close(done));
}
