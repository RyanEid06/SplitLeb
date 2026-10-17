import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.splitleb.app",
  appName: "SplitLeb",
  webDir: "dist",
  backgroundColor: "#101714",
  loggingBehavior: "debug",
  // Keep this origin permanent: IndexedDB belongs to the installed app's origin.
  server: { hostname: "localhost", androidScheme: "https" },
  android: { backgroundColor: "#101714" },
  plugins: {
    SystemBars: {
      insetsHandling: "native",
      initialViewportFitValueHint: "auto",
      style: "DARK",
    },
  },
};

export default config;
