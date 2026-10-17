import { afterEach, expect, it, vi } from "vitest";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { saveBackupFile } from "./backupFile";

// Native proxies have no own methods to spy on in a Node test process.
vi.mock("@capacitor/filesystem", async (original) => ({
  ...(await original<typeof import("@capacitor/filesystem")>()),
  Filesystem: { writeFile: vi.fn() },
}));
vi.mock("@capacitor/share", () => ({ Share: { share: vi.fn() } }));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("exports JSON through app-private cache and the Android chooser", async () => {
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);
  const write = vi
    .spyOn(Filesystem, "writeFile")
    .mockResolvedValue({ uri: "file:///cache/backups/test.json" });
  const share = vi
    .spyOn(Share, "share")
    .mockResolvedValue({ activityType: "Documents" });
  const result = await saveBackupFile("test.json", '{"schemaVersion":2}');
  expect(write).toHaveBeenCalledWith({
    path: "backups/test.json",
    data: '{"schemaVersion":2}',
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    recursive: true,
  });
  expect(share).toHaveBeenCalledWith({
    files: ["file:///cache/backups/test.json"],
    dialogTitle: "Save or share SplitLeb backup",
  });
  expect(result).toBe("shared");
});

it("does not report a canceled Android chooser as a saved backup", async () => {
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);
  vi.spyOn(Filesystem, "writeFile").mockResolvedValue({
    uri: "file:///cache/backups/test.json",
  });
  vi.spyOn(Share, "share").mockRejectedValue(new Error("Share canceled"));
  expect(await saveBackupFile("test.json", "{}")).toBe("canceled");
});

it("does not claim successful sharing when Android reports no selected destination", async () => {
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);
  vi.spyOn(Filesystem, "writeFile").mockResolvedValue({
    uri: "file:///cache/backups/test.json",
  });
  vi.spyOn(Share, "share").mockResolvedValue({ activityType: "" });
  expect(await saveBackupFile("test.json", "{}")).toBe("closed");
});

it("propagates actual write errors instead of reporting success", async () => {
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);
  vi.spyOn(Filesystem, "writeFile").mockRejectedValue(new Error("Disk full"));
  const share = vi.spyOn(Share, "share");
  await expect(saveBackupFile("test.json", "{}")).rejects.toThrow("Disk full");
  expect(share).not.toHaveBeenCalled();
});

it("keeps the browser JSON download and releases its object URL", async () => {
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(false);
  const link = { href: "", download: "", click: vi.fn() };
  vi.stubGlobal("document", { createElement: () => link });
  const release = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:backup");
  vi.stubGlobal("window", { setTimeout: (callback: () => void) => callback() });
  expect(await saveBackupFile("test.json", "{}")).toBe("downloaded");
  expect(link.download).toBe("test.json");
  expect(link.href).toBe("blob:backup");
  expect(link.click).toHaveBeenCalledOnce();
  expect(release).toHaveBeenCalledWith("blob:backup");
});
