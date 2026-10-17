import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { chromium } from "playwright";

// Mechanical density derivation only. Never modifies the approved master.
const res = "android/app/src/main/res";
const source = readFileSync("public/splitleb-logo.png").toString("base64");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
try {
  const page = await browser.newPage();
  const resources = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = "data:image/png;base64," + base64;
    await image.decode();
    const master = document.createElement("canvas");
    master.width = image.width;
    master.height = image.height;
    const ctx = master.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    let radius = 0;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        if (pixels[(y * image.width + x) * 4 + 3]) {
          const distance = Math.hypot(x + 0.5 - image.width / 2, y + 0.5 - image.height / 2);
          radius = Math.max(
            radius,
            distance,
          );
        }
      }
    }
    function png(size, fraction, backgroundShape) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const context = canvas.getContext("2d");
      if (backgroundShape) {
        context.fillStyle = "#A5E6B8";
        context.beginPath();
        if (backgroundShape === "round")
          context.arc(size / 2, size / 2, size * 0.49, 0, Math.PI * 2);
        else context.roundRect(size * 0.01, size * 0.01, size * 0.98, size * 0.98, size * 0.21);
        context.fill();
        context.clip();
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      const scale = (size * fraction) / radius;
      const width = image.width * scale,
        height = image.height * scale;
      context.drawImage(
        image,
        (size - width) / 2,
        (size - height) / 2,
        width,
        height,
      );
      return canvas.toDataURL("image/png").split(",")[1];
    }
    const files = [];
    // The approved emblem sits within the tile's central safe area. The tile
    // fills the 72dp launcher viewport while the mint background fills its mask.
    const adaptiveWidth = 72;
    for (const [density, scale] of [
      ["mdpi", 1],
      ["hdpi", 1.5],
      ["xhdpi", 2],
      ["xxhdpi", 3],
      ["xxxhdpi", 4],
    ]) {
      files.push({
        path: `mipmap-${density}/ic_launcher.png`,
        png: png(48 * scale, radius / image.width, "rounded"),
      });
      files.push({
        path: `mipmap-${density}/ic_launcher_round.png`,
        png: png(48 * scale, radius / image.width, "round"),
      });
      // Emblem inside Android's 66/108 dp safe circle; mint fills to the mask.
      files.push({
        path: `mipmap-${density}/ic_launcher_foreground.png`,
        png: png(108 * scale, radius / image.width * adaptiveWidth / 108, false),
      });
    }
    files.push({
      path: "drawable-nodpi/splash_icon.png",
      png: png(288, 0.3, false),
    });
    return files;
  }, source);
  // Remove only exact, generated Capacitor placeholder resources.
  for (const entry of readdirSync(res, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      /^drawable(?:-(?:land|port)-(?:[a-z]+))?$/.test(entry.name)
    ) {
      const path = join(res, entry.name, "splash.png");
      if (readdirSync(join(res, entry.name)).includes("splash.png"))
        unlinkSync(path);
    }
  }
  for (const path of [
    "drawable-v24/ic_launcher_foreground.xml",
    "drawable/ic_launcher_background.xml",
  ]) {
    // These two exact paths are the generated Android grid/robot placeholders.
    if (existsSync(join(res, path))) unlinkSync(join(res, path));
  }
  for (const file of resources) {
    const path = join(res, file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, Buffer.from(file.png, "base64"));
    console.log(path);
  }
} finally {
  await browser.close();
}
