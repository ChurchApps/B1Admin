import fs from "node:fs";
import path from "node:path";
import {
  boolArg,
  failText,
  getArg,
  printJson,
  relativeToRoot,
  rootDir,
} from "./installer-common.mjs";

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveAppUrl(environment, deploymentRoot) {
  const explicit = getArg("app-url");
  if (explicit) return explicit.replace(/\/$/, "");
  const summaryFile = path.resolve(rootDir, deploymentRoot, environment, "deployment-summary.json");
  const summary = readJsonIfExists(summaryFile);
  return String(summary?.resolved?.frontendAppUrl || "").replace(/\/$/, "");
}

async function hideChatWidgets(page) {
  await page.addInitScript(() => {
    const css = `
      div[aria-label="Open SuperBee chat"],
      div[aria-label="Open Bez chat"],
      div[aria-label="Open Doc chat"] { display: none !important; }
    `;
    const inject = () => {
      if (document.head && !document.getElementById("__installer-hide-chat__")) {
        const style = document.createElement("style");
        style.id = "__installer-hide-chat__";
        style.textContent = css;
        document.head.appendChild(style);
      }
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject);
    else inject();
  });
}

async function runBrowserSmoke({ appUrl, email, password, churchName, route, headed, timeoutMs, screenshotFile }) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext();
  const page = await context.newPage();
  const steps = [];

  try {
    await hideChatWidgets(page);
    await page.goto(`${appUrl}/login?forceLogin=1`, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    steps.push({ name: "open login", ok: true, detail: page.url() });

    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: "visible", timeout: timeoutMs });
    await emailInput.fill(email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    steps.push({ name: "submit credentials", ok: true, detail: email });

    const churchDialog = page.locator('[role="dialog"]').filter({ hasText: "Select a Church" });
    await Promise.race([
      churchDialog.waitFor({ state: "visible", timeout: timeoutMs }).catch(() => {}),
      page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: timeoutMs }).catch(() => {}),
    ]);

    if (await churchDialog.isVisible().catch(() => false)) {
      const preferredChurch = churchName
        ? page.locator('[role="dialog"] h3', { hasText: churchName }).first()
        : page.locator('[role="dialog"] h3').first();
      await preferredChurch.click({ timeout: timeoutMs });
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: timeoutMs });
      steps.push({ name: "select church", ok: true, detail: churchName || "first listed church" });
    } else {
      steps.push({ name: "select church", ok: true, skipped: true, detail: "not prompted" });
    }

    await page.goto(`${appUrl}${route}`, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.locator("#primaryNavButton").waitFor({ state: "visible", timeout: timeoutMs });
    steps.push({ name: "load authenticated page", ok: true, detail: page.url() });

    if (screenshotFile) {
      fs.mkdirSync(path.dirname(screenshotFile), { recursive: true });
      await page.screenshot({ path: screenshotFile, fullPage: true });
      steps.push({ name: "capture screenshot", ok: true, detail: relativeToRoot(screenshotFile) });
    }

    return {
      ok: true,
      finalUrl: page.url(),
      steps,
    };
  } catch (error) {
    if (screenshotFile) {
      fs.mkdirSync(path.dirname(screenshotFile), { recursive: true });
      await page.screenshot({ path: screenshotFile, fullPage: true }).catch(() => {});
    }
    return {
      ok: false,
      finalUrl: page.url(),
      steps,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  } finally {
    await browser.close();
  }
}

function renderMarkdown(result) {
  const lines = [
    `# Browser Smoke: ${result.environment}`,
    "",
    `- Status: ${result.ok ? "ok" : "failed"}`,
    `- App URL: \`${result.appUrl}\``,
    `- Route: \`${result.route}\``,
    `- Evidence file: \`${result.outputFile}\``,
    `- Screenshot: \`${result.screenshotFile || ""}\``,
    "",
    "## Steps",
    "",
  ];

  result.steps.forEach((step) => {
    lines.push(`- ${step.skipped ? "SKIP" : step.ok ? "OK" : "FAIL"}: ${step.name} - ${step.detail || ""}`);
  });

  if (result.errors?.length > 0) {
    lines.push("", "## Errors", "");
    result.errors.forEach((error) => lines.push(`- ${error}`));
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const environment = getArg("environment", "staging");
  const outputMode = getArg("output", "text").toLowerCase();
  const deploymentRoot = getArg("deployment-root", "deployment");
  const evidenceDir = path.resolve(rootDir, deploymentRoot, environment);
  const outputFile = path.resolve(rootDir, getArg("output-file", path.join(deploymentRoot, environment, "browser-smoke.json")));
  const screenshotFile = boolArg("screenshot", true)
    ? path.resolve(rootDir, getArg("screenshot-file", path.join(deploymentRoot, environment, "browser-smoke.png")))
    : "";
  const appUrl = resolveAppUrl(environment, deploymentRoot);
  const email = getArg("email", getArg("first-admin-email"));
  const password = getArg("password", getArg("first-admin-password"));
  const churchName = getArg("church-name", getArg("first-church-name"));
  const route = getArg("route", "/people");
  const timeoutMs = Number(getArg("timeout-ms", "30000"));
  const dryRun = boolArg("dry-run", false);

  if (!appUrl) failText("--app-url is required, or deployment/<environment>/deployment-summary.json must contain resolved.frontendAppUrl.", outputMode);
  if (!email) failText("--email or firstAdminEmail in --customer-file is required.", outputMode);
  if (!password) failText("--password or firstAdminPassword in --customer-file is required.", outputMode);

  let smoke = {
    ok: true,
    finalUrl: "",
    steps: [
      { name: "dry run", ok: true, detail: "Browser was not launched." },
    ],
  };

  if (!dryRun) {
    smoke = await runBrowserSmoke({
      appUrl,
      email,
      password,
      churchName,
      route,
      headed: boolArg("headed", false),
      timeoutMs,
      screenshotFile,
    });
  }

  const result = {
    ok: smoke.ok,
    environment,
    appUrl,
    route,
    email,
    churchName: churchName || "",
    outputFile: relativeToRoot(outputFile),
    screenshotFile: screenshotFile ? relativeToRoot(screenshotFile) : "",
    generatedAt: new Date().toISOString(),
    finalUrl: smoke.finalUrl,
    steps: smoke.steps,
    errors: smoke.errors || [],
  };

  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(result, null, 2)}\n`);

  if (outputMode === "json") {
    printJson(result);
  } else if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(renderMarkdown(result));
  } else {
    console.log(`Browser smoke ${result.ok ? "ok" : "failed"}: ${environment}`);
    console.log(`Evidence: ${result.outputFile}`);
  }

  process.exit(result.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
