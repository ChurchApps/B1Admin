import fs from "node:fs";
import path from "node:path";
import {
  boolArg,
  getArg,
  printJson,
  relativeToRoot,
  rootDir,
} from "./installer-common.mjs";

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read ${label} ${filePath}: ${message}`);
  }
}

function main() {
  const environment = getArg("environment", "staging");
  const outputMode = getArg("output", "text").toLowerCase();
  const deploymentRoot = getArg("deployment-root", "deployment");
  const environmentDir = path.resolve(rootDir, getArg("environment-dir", path.join("infrastructure", "environments", environment)));
  const summaryFile = path.resolve(rootDir, getArg("summary-file", path.join(deploymentRoot, environment, "deployment-summary.json")));
  const backendParametersFile = path.join(environmentDir, "backend-parameters.json");
  const write = boolArg("write", false);

  const summary = readJson(summaryFile, "deployment summary");
  const frontendAppUrl = String(summary?.resolved?.frontendAppUrl || "").replace(/\/$/, "");
  if (!frontendAppUrl) throw new Error(`Deployment summary does not contain resolved.frontendAppUrl: ${summaryFile}`);

  const params = readJson(backendParametersFile, "backend parameters");
  const before = {
    B1AdminRootUrl: params.B1AdminRootUrl || "",
    CorsOrigin: params.CorsOrigin || "",
  };
  const next = {
    B1AdminRootUrl: frontendAppUrl,
    CorsOrigin: frontendAppUrl,
  };
  const changed = before.B1AdminRootUrl !== next.B1AdminRootUrl || before.CorsOrigin !== next.CorsOrigin;

  if (write && changed) {
    params.B1AdminRootUrl = next.B1AdminRootUrl;
    params.CorsOrigin = next.CorsOrigin;
    fs.writeFileSync(backendParametersFile, `${JSON.stringify(params, null, 2)}\n`);
    // The saved deployment summary now describes a backend whose CORS/root URL
    // no longer match the desired parameters. Archive it, along with the deploy
    // dispatch evidence (observing the old run would just restore the stale
    // summary), so the guided runner walks commit -> deploy -> observe again
    // instead of treating the rollout as finished.
    fs.renameSync(summaryFile, `${summaryFile.replace(/\.json$/, "")}.pre-adopt.json`);
    const dispatchFile = path.join(path.dirname(summaryFile), "last-deploy-dispatch.json");
    if (fs.existsSync(dispatchFile)) {
      fs.renameSync(dispatchFile, path.join(path.dirname(summaryFile), "last-deploy-dispatch.pre-adopt.json"));
    }
  }

  const result = {
    ok: true,
    environment,
    changed,
    written: write && changed,
    frontendAppUrl,
    backendParametersFile: relativeToRoot(backendParametersFile),
    before,
    next,
    followUp: changed
      ? [
        "The saved deployment summary was archived because the backend must be redeployed with the new CORS/root URL.",
        "Run `yarn installer:run` again; it will commit and push the change, rerun the deploy, and observe it.",
      ]
      : [],
  };

  if (outputMode === "json") {
    printJson(result);
  } else if (outputMode === "markdown" || outputMode === "md") {
    const lines = [
      `# Adopt Frontend Origin: ${environment}`,
      "",
      `- Status: ${changed ? "updated" : "already current"}`,
      `- Written: ${result.written ? "yes" : "no"}`,
      `- Frontend app URL: \`${frontendAppUrl}\``,
      `- Backend parameters: \`${result.backendParametersFile}\``,
    ];
    if (result.followUp.length > 0) {
      lines.push("", "## Follow Up", "");
      result.followUp.forEach((item) => lines.push(`- ${item}`));
    }
    process.stdout.write(`${lines.join("\n")}\n`);
  } else {
    console.log(`Adopt frontend origin: ${changed ? "updated" : "already current"}`);
  }
}

main();
