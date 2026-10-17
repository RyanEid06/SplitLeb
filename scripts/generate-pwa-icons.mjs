import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

// Derive every icon from the approved, unmodified master; no image dependencies.
const source = readFileSync("public/splitleb-logo.png");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
try {
  const page = await browser.newPage();
  const icons = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = "data:image/png;base64," + base64;
    await image.decode();
    const master = document.createElement("canvas");
    master.width = image.width;
    master.height = image.height;
    const pixels = master.getContext("2d");
    pixels.drawImage(image, 0, 0);
    const data = pixels.getImageData(0, 0, image.width, image.height).data;
    // Fit every nontransparent pixel inside the maskable 40% radius safe zone.
    let radius = 0;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        if (data[(y * image.width + x) * 4 + 3] > 0) {
          radius = Math.max(
            radius,
            Math.hypot(x + 0.5 - image.width / 2, y + 0.5 - image.height / 2),
          );
        }
      }
    }
    return [
      { size: 32, name: "splitleb-favicon-32.png" },
      { size: 192, name: "splitleb-icon-192.png" },
      { size: 512, name: "splitleb-icon-512.png" },
      { size: 512, name: "splitleb-icon-maskable-512.png", maskable: true },
    ].map(({ size, name, maskable }) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      const scale = maskable
        ? (size * 0.38) / radius
        : size / Math.max(image.width, image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(
        image,
        (size - width) / 2,
        (size - height) / 2,
        width,
        height,
      );
      return { name, png: canvas.toDataURL("image/png").split(",")[1] };
    });
  }, source.toString("base64"));
  mkdirSync("public/icons", { recursive: true });
  for (const { name, png } of icons) {
    writeFileSync(`public/icons/${name}`, Buffer.from(png, "base64"));
    console.log(`created public/icons/${name}`);
  }
} finally {
  await browser.close();
}
