import { createRoot } from "react-dom/client";
import App from "./App";
import { EnvironmentHelper } from "./helpers";
import { DateHelper } from "@churchapps/helpers";

import * as Sentry from "@sentry/react";

const originalGetDisplayDuration = DateHelper.getDisplayDuration;

DateHelper.getDisplayDuration = (d: Date) => {
  if (!d || isNaN(d.getTime())) {
    return "0s";
  }
  const seconds = Math.round((new Date().getTime() - d.getTime()) / 1000);
  if (isNaN(seconds) || seconds < 0) {
    return "0s";
  }
  return originalGetDisplayDuration(d);
};

Sentry.init({
  dsn: "https://0fa8dbad4eea6ffc6b2ffc157c43cff2@o4510432524107776.ingest.us.sentry.io/4510432531251200",
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true
});


EnvironmentHelper.init().then(() => {
  const root = createRoot(document.getElementById("root")!);
  //root.render(<React.StrictMode><App /></React.StrictMode>);
  root.render(<App />);
});
