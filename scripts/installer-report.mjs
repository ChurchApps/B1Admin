import fs from "node:fs";
import path from "node:path";
import {
  getArg,
  printJson,
  relativeToRoot,
  rootDir,
  runNodeJson,
} from "./installer-common.mjs";

function environmentsFromArg() {
  const value = getArg("environment", "all");
  if (value === "all") return ["staging", "prod"];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function verifyEvidence(environmentDir, checkHttp) {
  const backendOutputsFile = path.join(environmentDir, "backend-outputs.json");
  const frontendOutputsFile = path.join(environmentDir, "frontend-outputs.json");
  if (!fs.existsSync(backendOutputsFile) || !fs.existsSync(frontendOutputsFile)) return null;

  const verify = runNodeJson("scripts/verify-split-stack.mjs", [
    `--backend-outputs-file=${backendOutputsFile}`,
    `--frontend-outputs-file=${frontendOutputsFile}`,
    "--check-aws=false",
    `--check-http=${checkHttp ? "true" : "false"}`,
    "--output=json",
  ]);
  return verify.parsed || {
    ok: false,
    errors: [verify.stderr.trim() || verify.stdout.trim() || "verify-split-stack did not return JSON"],
  };
}

function collectEnvironment(environment, deploymentRoot, checkHttp) {
  const environmentDir = path.resolve(rootDir, deploymentRoot, environment);
  const summaryFile = path.join(environmentDir, "deployment-summary.json");
  const preflightPlanFile = path.join(environmentDir, "preflight-plan.md");
  const browserSmokeFile = path.join(environmentDir, "browser-smoke.json");
  const sourceMetadataFile = path.join(environmentDir, "source-metadata.json");
  const deployDispatchFile = path.join(environmentDir, "last-deploy-dispatch.json");
  const bootstrapAdminFile = path.join(environmentDir, "bootstrap-admin.json");
  const summary = readJsonIfExists(summaryFile);
  const browserSmoke = readJsonIfExists(browserSmokeFile);
  const sourceMetadata = readJsonIfExists(sourceMetadataFile);
  const deployDispatch = readJsonIfExists(deployDispatchFile);
  const bootstrapAdmin = readJsonIfExists(bootstrapAdminFile);
  const verification = verifyEvidence(environmentDir, checkHttp);
  const preflightPlan = readTextIfExists(preflightPlanFile);
  const inferredBrowserResult = browserSmoke
    ? browserSmoke.ok
      ? `passed: ${browserSmoke.method || "browser"} login${browserSmoke.selectedChurch ? `, ${browserSmoke.selectedChurch} selection` : ""}${browserSmoke.dashboardLoaded ? ", dashboard load" : ""}`
      : "browser smoke failed"
    : "not recorded";
  const inferredBootstrapMethod = bootstrapAdmin?.ok === true && bootstrapAdmin?.dryRun !== true
    ? "operator machine: installer:bootstrap-admin"
    : "not recorded";
  const runId = getArg(`${environment}-run-id`, getArg("run-id", deployDispatch?.runId || sourceMetadata?.githubActions?.runId || ""));
  const b1adminSha = getArg(`${environment}-b1admin-sha`, getArg("b1admin-sha", sourceMetadata?.b1admin?.sha || sourceMetadata?.b1adminSha || ""));
  const apiSha = getArg(`${environment}-api-sha`, getArg("api-sha", sourceMetadata?.api?.sha || sourceMetadata?.apiSha || ""));
  const browserResult = getArg(`${environment}-browser-result`, getArg("browser-result", inferredBrowserResult));
  const bootstrapMethod = getArg(`${environment}-bootstrap-method`, getArg("bootstrap-method", inferredBootstrapMethod));
  const evidenceArtifact = getArg(`${environment}-evidence-artifact`, `aws-${environment}-deployment-evidence`);

  const missing = [];
  if (!summary) missing.push(relativeToRoot(summaryFile));
  if (!verification) missing.push(relativeToRoot(path.join(environmentDir, "backend-outputs.json")), relativeToRoot(path.join(environmentDir, "frontend-outputs.json")));
  if (!runId) missing.push(`${environment} GitHub Actions run id`);
  if (!b1adminSha) missing.push(`${environment} B1Admin commit SHA`);
  if (!apiSha) missing.push(`${environment} Api commit SHA`);
  if (browserResult === "not recorded") missing.push(`${environment} browser login result`);
  if (bootstrapMethod === "not recorded") missing.push(`${environment} first-admin bootstrap method`);

  return {
    environment,
    environmentDir: relativeToRoot(environmentDir),
    summaryFile: relativeToRoot(summaryFile),
    preflightPlanFile: fs.existsSync(preflightPlanFile) ? relativeToRoot(preflightPlanFile) : "",
    browserSmokeFile: fs.existsSync(browserSmokeFile) ? relativeToRoot(browserSmokeFile) : "",
    hasPreflightPlan: Boolean(preflightPlan),
    browserSmoke,
    sourceMetadata,
    summary,
    verification,
    runId,
    b1adminSha,
    apiSha,
    browserResult,
    bootstrapMethod,
    evidenceArtifact,
    missing,
  };
}

function renderCheck(status, label, detail = "") {
  return `- ${status}: ${label}${detail ? ` - ${detail}` : ""}`;
}

function renderEnvironment(environment) {
  const summary = environment.summary || {};
  const verification = environment.verification || {};
  const lines = [
    `## ${environment.environment}`,
    "",
    renderCheck(environment.missing.length === 0 ? "OK" : "TODO", "Rollout record", environment.missing.length === 0 ? "complete" : `${environment.missing.length} item(s) missing`),
    renderCheck(environment.summary ? "OK" : "TODO", "Deployment summary", environment.summaryFile),
    renderCheck(verification.ok === true ? "OK" : verification ? "FAIL" : "TODO", "Installer verify result", verification ? `ok=${verification.ok === true ? "true" : "false"}` : "not available"),
    "",
    "### Recorded Values",
    "",
    `- GitHub Actions run id: \`${environment.runId || ""}\``,
    `- B1Admin commit SHA: \`${environment.b1adminSha || ""}\``,
    `- Api commit SHA: \`${environment.apiSha || ""}\``,
    `- API base URL: \`${summary.resolved?.apiBaseUrl || verification.resolved?.apiBaseUrl || ""}\``,
    `- Frontend URL: \`${summary.resolved?.frontendAppUrl || verification.resolved?.frontendAppUrl || ""}\``,
    `- Deployment evidence artifact: \`${environment.evidenceArtifact}\``,
    `- Browser login result: ${environment.browserResult}`,
    `- Browser smoke file: \`${environment.browserSmokeFile || ""}\``,
    `- First-admin bootstrap method: ${environment.bootstrapMethod}`,
  ];

  if (summary.stackNames) {
    lines.push(
      `- Backend stack: \`${summary.stackNames.backend || ""}\``,
      `- Frontend stack: \`${summary.stackNames.frontend || ""}\``,
    );
  }

  if (verification.checks?.length > 0) {
    lines.push("", "### Verification Checks", "");
    verification.checks.forEach((check) => {
      const status = check.skipped ? "SKIP" : check.ok ? "OK" : "FAIL";
      lines.push(renderCheck(status, check.name, check.detail));
    });
  }

  if (environment.missing.length > 0) {
    lines.push("", "### Missing Before Sign-Off", "");
    environment.missing.forEach((item) => lines.push(`- ${item}`));
  }

  return `${lines.join("\n")}\n`;
}

function renderMarkdown(result) {
  const completeCount = result.environments.filter((environment) => environment.missing.length === 0 && environment.verification?.ok === true).length;
  const lines = [
    "# B1Admin Deployment Report",
    "",
    `- Status: ${result.ok ? "complete" : "needs attention"}`,
    `- Generated at: ${result.generatedAt}`,
    `- Deployment evidence root: \`${result.deploymentRoot}\``,
    `- Complete environments: ${completeCount}/${result.environments.length}`,
    "",
  ];

  result.environments.forEach((environment) => {
    lines.push(renderEnvironment(environment).trimEnd(), "");
  });

  lines.push("## Sign-Off", "");
  result.environments.forEach((environment) => {
    const label = environment.environment === "prod" ? "Prod" : "Staging";
    lines.push(`- ${label} browser workflow tested by: `);
  });
  lines.push(
    "- Approved by: ",
    "- Notes: ",
    "",
  );

  return `${lines.join("\n").trimEnd()}\n`;
}

function main() {
  const outputMode = getArg("output", "text").toLowerCase();
  const deploymentRoot = getArg("deployment-root", "deployment");
  const checkHttp = getArg("check-http", "false").toLowerCase() === "true";
  const outputFile = path.resolve(rootDir, getArg("output-file", path.join(deploymentRoot, "deployment-report.md")));
  const write = getArg("write", "false").toLowerCase() === "true";
  const environments = environmentsFromArg().map((environment) => collectEnvironment(environment, deploymentRoot, checkHttp));

  const result = {
    ok: environments.every((environment) => environment.missing.length === 0 && environment.verification?.ok === true),
    generatedAt: new Date().toISOString(),
    deploymentRoot,
    outputFile: relativeToRoot(outputFile),
    environments,
  };

  const markdown = renderMarkdown(result);
  if (write) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, markdown);
  }

  if (outputMode === "json") {
    printJson({ ...result, markdown: write ? undefined : markdown });
  } else {
    process.stdout.write(markdown);
  }
}

main();
