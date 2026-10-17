import { Capacitor } from "@capacitor/core";

export async function saveBackupFile(
  filename: string,
  json: string,
): Promise<"downloaded" | "shared" | "canceled" | "closed"> {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const file = await Filesystem.writeFile({
      path: "backups/" + filename,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    try {
      const result = await Share.share({
        files: [file.uri],
        dialogTitle: "Save or share SplitLeb backup",
      });
      if (!result.activityType) return "closed";
    } catch (error) {
      if (error instanceof Error && error.message === "Share canceled")
        return "canceled";
      throw error;
    }
    return "shared";
  }
  const url = URL.createObjectURL(
    new Blob([json], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
