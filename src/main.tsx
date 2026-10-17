import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { registerServiceWorker } from "./serviceWorkerRegistration";
import { initializeAndroid } from "./platform/android";
import { router } from "./app/router";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
void initializeAndroid((destination) => {
  if (typeof destination === "number") void router.navigate(destination);
  else void router.navigate(destination);
});
