import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { handleAndroidBack } from "./androidBack";

export async function initializeAndroid(
  navigate: (destination: number | string) => void,
) {
  if (!Capacitor.isNativePlatform()) return;
  await App.addListener("backButton", ({ canGoBack }) => {
    handleAndroidBack(canGoBack, navigate, () => void App.minimizeApp());
  });
}
