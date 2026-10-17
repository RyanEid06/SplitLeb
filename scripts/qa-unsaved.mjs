import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const base = process.argv[2] || "http://127.0.0.1:4173";
async function offerUpdate() {
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("splitleb:update", {
        detail: { waiting: { postMessage() {} } },
      }),
    ),
  );
}
try {
  await page.goto(base + "/bills/new");
  await page.getByLabel("Name", { exact: true }).fill("Unadded person");
  await offerUpdate();
  assert.equal(
    await page
      .getByRole("button", { name: "Update", exact: true })
      .isDisabled(),
    true,
    "A person being typed must prevent update reload",
  );
  await page.getByLabel("Name", { exact: true }).fill("");
  await page.getByLabel(/Bill name/).fill("Unsaved setup");
  assert.equal(
    await page
      .getByRole("button", { name: "Update", exact: true })
      .isDisabled(),
    true,
    "Setup draft must prevent update reload",
  );
  for (const name of ["Ryan", "Maya"]) {
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByRole("button", { name: "Add person", exact: true }).click();
  }
  await page.getByRole("button", { name: "Start splitting" }).click();
  await page.getByLabel("Item", { exact: true }).fill("Unadded item");
  await offerUpdate();
  assert.equal(
    await page
      .getByRole("button", { name: "Update", exact: true })
      .isDisabled(),
    true,
    "Quick item draft must prevent update reload",
  );
  await page.getByLabel("Item", { exact: true }).fill("");
  await page.getByRole("button", { name: "Update", exact: true }).waitFor();
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll("button")].find(
        (button) => button.textContent === "Update",
      ).disabled,
  );
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await page
    .getByLabel("Item", { exact: true })
    .fill("Typed during activation");
  const url = page.url();
  await page.evaluate(() =>
    navigator.serviceWorker.dispatchEvent(new Event("controllerchange")),
  );
  assert.equal(page.url(), url);
  assert.equal(
    await page.getByLabel("Item", { exact: true }).inputValue(),
    "Typed during activation",
  );
  console.log(
    "PASS unsaved setup/person/item drafts and edits during activation prevent reload",
  );
} finally {
  await browser.close();
}
