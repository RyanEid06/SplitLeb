import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.argv[2] || "http://127.0.0.1:5174";
await mkdir("output/playwright", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const evidence = [];
const check = (name) => {
  evidence.push(name);
  console.log("PASS " + name);
};
async function noOverflow(label) {
  const dimensions = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
    width: innerWidth,
  }));
  assert.ok(
    dimensions.root <= dimensions.width && dimensions.body <= dimensions.width,
    label + " overflow " + JSON.stringify(dimensions),
  );
}
async function axe(label) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  await writeFile(
    "output/playwright/axe-" + label + ".json",
    JSON.stringify(result.violations, null, 2),
  );
  assert.equal(
    result.violations.length,
    0,
    label +
      ": " +
      result.violations
        .map((issue) => issue.id + " " + issue.nodes.map((node) => node.target))
        .join("; "),
  );
}
async function readRecords() {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("splitleb-local-db");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = (name) =>
      new Promise((resolve, reject) => {
        const request = db.transaction(name).objectStore(name).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    const data = {
      bills: await read("bills"),
      groups: await read("savedGroups"),
    };
    db.close();
    return data;
  });
}
try {
  await page.goto(base);
  await page.getByRole("heading", { name: /Good company/ }).waitFor();
  assert.equal(await page.locator("main").count(), 1);
  assert.equal(
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link")
      .count(),
    4,
  );
  await axe("home");
  check("Home: one landmark, four accessible phone destinations, axe clean");
  await page
    .getByRole("link", { name: "New bill", exact: true })
    .first()
    .click();
  await page.getByLabel("Name", { exact: true }).fill("Ryan");
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Jad");
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await axe("new-bill");
  await page.getByRole("button", { name: "Start splitting" }).click();
  await page
    .getByRole("heading", { name: "Shared bill", exact: true })
    .waitFor();
  const workspace = page.url();
  await page.getByLabel("Item", { exact: true }).fill("Dinner");
  await page.getByLabel("Unit price", { exact: true }).fill("10.01");
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByRole("button", { name: "Split Dinner", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await axe("assignment");
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.ok(
    await page
      .getByRole("button", { name: "Split Dinner", exact: true })
      .evaluate((element) => element === document.activeElement),
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("link", { name: "History", exact: true })
    .first()
    .click();
  assert.equal(page.url(), workspace);
  check(
    "Dirty navigation is cancelled without losing the receipt; dialog Escape restores focus",
  );
  await page.getByRole("button", { name: "Review bill", exact: true }).click();
  await page.getByRole("heading", { name: "Review & settle" }).waitFor();
  assert.ok((await page.getByText("$5.01", { exact: true }).count()) > 0);
  assert.ok((await page.getByText("$5.00", { exact: true }).count()) > 0);
  await page
    .getByLabel("Paid amount for Ryan", { exact: true })
    .pressSequentially("10.01");
  assert.equal(
    await page.getByLabel("Paid amount for Ryan", { exact: true }).inputValue(),
    "10.01",
    "Typing decimal payments must preserve the decimal point",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Mark settled", exact: true }).click();
  await page.getByText("Settled", { exact: true }).waitFor();
  const saved = (await readRecords()).bills[0];
  assert.equal(saved.payments[0].amountCents, 1001);
  assert.equal(saved.status, "settled");
  await page.reload();
  await page.getByLabel("Paid amount for Ryan", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Paid amount for Ryan", { exact: true }).inputValue(),
    "10.01",
  );
  await axe("review");
  check("Cent remainder and edited payment survive Mark settled and reload");
  await page.getByRole("button", { name: /Ryan/ }).first().click();
  await noOverflow("Expanded review");
  const reviewUrl = page.url();
  await page.getByRole("link", { name: "Groups", exact: true }).click();
  await page.getByLabel("New group", { exact: true }).fill("Dinner crew");
  await page.getByRole("button", { name: "Create group", exact: true }).click();
  await page.getByLabel("Add member", { exact: true }).fill("Ryan");
  await page.getByRole("button", { name: "Add member", exact: true }).click();
  await page.getByText("Member added.", { exact: true }).waitFor();
  await page.getByLabel("Add member", { exact: true }).fill("Jad");
  await page.getByRole("button", { name: "Add member", exact: true }).click();
  await page.locator(".group-member").filter({ hasText: "Jad" }).waitFor();
  await page
    .locator(".group-member")
    .filter({ hasText: "Jad" })
    .getByRole("button", { name: "Archive", exact: true })
    .click();
  await page.getByRole("button", { name: "Show archived (1)" }).click();
  await page
    .locator(".group-member")
    .filter({ hasText: "Jad" })
    .getByRole("button", { name: "Restore", exact: true })
    .click();
  await page
    .getByRole("link", { name: "New bill", exact: true })
    .last()
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Use a group" })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page.getByLabel("Group", { exact: true }).inputValue(),
    (await readRecords()).groups[0].id,
  );
  await page.getByRole("button", { name: "LBP", exact: true }).click();
  await page.getByRole("button", { name: "Start splitting" }).click();
  await page.getByLabel("Item", { exact: true }).fill("Lunch");
  await page.getByLabel("Unit price (k LBP)", { exact: true }).fill("630");
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByRole("button", { name: "Save bill", exact: true }).click();
  await page.getByText("Saved on this device", { exact: true }).waitFor();
  const groupBill = (await readRecords()).bills.find((bill) => bill.groupId);
  assert.equal(groupBill.items[0].unitPriceCents, 63000000);
  assert.ok(groupBill.people.every((person) => person.groupMemberId));
  const groupWorkspace = page.url();
  check(
    "Group member archive/restore, preselection, stable identity and k-LBP creation",
  );
  await page
    .getByRole("link", { name: "History", exact: true })
    .first()
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const download = await downloadPromise;
  await download.saveAs("output/playwright/roundtrip.json");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator('input[type="file"]')
    .setInputFiles("output/playwright/roundtrip.json");
  await page.getByText(/Imported 0 bills and 0 groups/).waitFor();
  assert.equal((await readRecords()).bills.length, 2);
  await axe("history");
  check("Backup export and duplicate import round trip preserve bills/groups");
  for (const width of [320, 360, 390, 412, 768, 1280, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/bills/new",
      "/groups",
      "/history",
      new URL(workspace).pathname,
      new URL(reviewUrl).pathname,
      new URL(groupWorkspace).pathname,
    ]) {
      await page.goto(base + route);
      await page.locator("h1").waitFor();
      await page.waitForTimeout(100);
      await noOverflow(width + " " + route);
      if (route === "/groups") {
        for (const name of ["Members", "Balances", "Stats", "Activity"]) {
          await page.getByRole("button", { name, exact: true }).click();
          await noOverflow(width + " group " + name);
        }
      }
    }
    await page.goto(base);
    await page.screenshot({
      path: "output/playwright/home-" + width + ".png",
      fullPage: true,
    });
    await page.goto(reviewUrl);
    await page.getByRole("heading", { name: "Review & settle" }).waitFor();
    await page.screenshot({
      path: "output/playwright/review-" + width + ".png",
      fullPage: true,
    });
    check("Responsive workflows: " + width + "px");
  }
  assert.deepEqual(errors, []);
  check("No browser runtime errors");
  await writeFile(
    "output/playwright/browser-results.json",
    JSON.stringify({ base, evidence, errors }, null, 2),
  );
} finally {
  await browser.close();
}
