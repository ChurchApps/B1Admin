import {
  boolArg,
  defaultStackNames,
  failText,
  getArg,
  inferDeployRepo,
  latestWorkflowRunId,
  printJson,
  relativeToRoot,
  requireEnvironmentDir,
  resolveEnvironmentDir,
  rootDir,
  runCommandJson,
  runNodeJson,
} from "./installer-common.mjs";
import fs from "node:fs";
import path from "node:path";

function dispatchArgs(environment, environmentDirArg, repo, previewOnly, dryRun) {
  const args = [
    `--environment=${environment}`,
    `--region=${getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1")}`,
    `--deployment-source=${getArg("deployment-source", "api-repo")}`,
    `--b1admin-repo=${getArg("b1admin-repo", "ChurchApps/B1Admin")}`,
    `--b1admin-ref=${getArg("b1admin-ref", "main")}`,
    `--api-repo=${getArg("api-repo", "ChurchApps/Api")}`,
    `--api-ref=${getArg("api-ref", "main")}`,
    `--run-api-migrations=${boolArg("run-api-migrations", true) ? "true" : "false"}`,
    `--api-migration-runner=${getArg("api-migration-runner", "data-api")}`,
    `--verify-http-after-deploy=${boolArg("verify-http-after-deploy", true) ? "true" : "false"}`,
    `--sync-app-config-secret=${boolArg("sync-app-config-secret", true) ? "true" : "false"}`,
    `--preview-only=${previewOnly ? "true" : "false"}`,
    `--dry-run=${dryRun ? "true" : "false"}`,
    "--output=json",
  ];

  if (environmentDirArg) args.push(`--environment-dir=${environmentDirArg}`);
  if (repo) args.push(`--repo=${repo}`);
  if (boolArg("skip-gh-auth-check")) args.push("--skip-gh-auth-check=true");
  return args;
}

function verifyArgs(environment) {
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const stackNames = defaultStackNames(environment);
  return [
    `--region=${region}`,
    `--backend-stack-name=${getArg("backend-stack-name", stackNames.backend)}`,
    `--frontend-stack-name=${getArg("frontend-stack-name", stackNames.frontend)}`,
    "--check-http=true",
    "--output=json",
  ];
}

function renderMarkdown(result) {
  const lines = [
    `# Installer Deploy: ${result.environment}`,
    "",
    `- Action: ${result.action}`,
    `- Environment dir: \`${result.environmentDir}\``,
    `- Private deploy repo: \`${result.deployRepo || "<missing>"}\``,
    `- Preview only: ${result.previewOnly ? "yes" : "no"}`,
    `- Run id: ${result.runId || "<not watched>"}`,
  ];

  if (result.dispatch?.dispatchCommand) {
    lines.push(`- Dispatch command: \`${result.dispatch.dispatchCommand}\``);
  }

  if (result.followUp.length > 0) {
    lines.push("", "## Follow Up", "");
    result.followUp.forEach((line) => lines.push(`- ${line}`));
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const environment = getArg("environment", "staging");
  const environmentDirArg = getArg("environment-dir");
  const outputMode = getArg("output", "text").toLowerCase();
  const repo = inferDeployRepo(getArg("repo"));
  const environmentDir = resolveEnvironmentDir(environment, environmentDirArg);
  const dryRun = boolArg("dry-run", false);
  const confirm = boolArg("confirm", false);
  const previewOnly = boolArg("preview-only", !confirm);
  const watch = boolArg("watch", false);
  const downloadEvidence = boolArg("download-evidence", false);
  const verify = boolArg("verify", false);
  const writeEvidence = boolArg("write-evidence", true);
  const deploymentRoot = getArg("deployment-root", "deployment");
  let observation = null;

  try {
    requireEnvironmentDir(environmentDir);
  } catch (error) {
    failText(error instanceof Error ? error.message : String(error), outputMode);
  }

  const preflight = runNodeJson("scripts/installer-preflight.mjs", [
    `--environment=${environment}`,
    ...(environmentDirArg ? [`--environment-dir=${environmentDirArg}`] : []),
    ...(repo ? [`--repo=${repo}`] : []),
    ...(boolArg("skip-github-repo-check") ? ["--skip-github-repo-check=true"] : []),
    ...(boolArg("skip-aws-check") ? ["--skip-aws-check=true"] : []),
    "--output=json",
  ]);
  if (!preflight.ok) {
    failText("Installer preflight is blocked. Run `yarn installer:preflight -- --output=markdown` for details.", outputMode, { preflight: preflight.parsed });
  }

  const dispatch = runNodeJson("scripts/dispatch-github-aws-deploy.mjs", dispatchArgs(environment, environmentDirArg, repo, previewOnly, dryRun));
  if (!dispatch.ok || !dispatch.parsed?.ok) {
    failText(dispatch.stderr.trim() || "GitHub deploy dispatch failed.", outputMode, { dispatch: dispatch.parsed });
  }

  let runId = "";
  const followUp = [];
  if (!dryRun) {
    try {
      runId = latestWorkflowRunId(repo);
    } catch {
      runId = "";
    }
  }

  if (watch && runId) {
    const args = ["run", "watch", runId, "--compact", "--exit-status"];
    if (repo) args.push("--repo", repo);
    const watched = runCommandJson("gh", args);
    if (!watched.ok) {
      failText(watched.stderr.trim() || `Workflow run ${runId} did not finish cleanly.`, outputMode);
    }
  } else if (runId) {
    followUp.push(`Observe the run: yarn installer:observe -- --environment=${environment}${repo ? ` --repo=${repo}` : ""} --deployment-root=${deploymentRoot} --run-id=${runId} --watch=true --download-evidence=true --verify=${previewOnly ? "false" : "true"} --output=markdown`);
  }

  if (downloadEvidence && runId) {
    const observed = runNodeJson("scripts/installer-observe.mjs", [
      `--environment=${environment}`,
      ...(repo ? [`--repo=${repo}`] : []),
      `--deployment-root=${deploymentRoot}`,
      `--run-id=${runId}`,
      "--watch=false",
      "--download-evidence=true",
      `--verify=${verify && !previewOnly ? "true" : "false"}`,
      "--output=json",
    ]);
    observation = observed.parsed;
    if (!observed.ok || !observed.parsed?.ok) {
      followUp.push(observed.stderr.trim() || `Evidence observe did not complete automatically. Run: yarn installer:observe -- --environment=${environment}${repo ? ` --repo=${repo}` : ""} --deployment-root=${deploymentRoot} --run-id=${runId} --download-evidence=true --verify=${verify && !previewOnly ? "true" : "false"} --output=markdown`);
    }
  } else if (runId) {
    followUp.push(`Download evidence later: yarn installer:observe -- --environment=${environment}${repo ? ` --repo=${repo}` : ""} --deployment-root=${deploymentRoot} --run-id=${runId} --download-evidence=true --verify=false --output=markdown`);
  }

  let verification = observation?.verification || null;
  if (verify && !previewOnly && !verification) {
    const verifyRun = runNodeJson("scripts/verify-split-stack.mjs", verifyArgs(environment));
    verification = verifyRun.parsed;
    if (!verifyRun.ok) {
      failText("Post-deploy verification failed.", outputMode, { verification });
    }
  } else if (!previewOnly) {
    followUp.push(`Verify after the workflow succeeds: yarn installer:observe -- --environment=${environment}${repo ? ` --repo=${repo}` : ""} --deployment-root=${deploymentRoot}${runId ? ` --run-id=${runId}` : ""} --download-evidence=true --verify=true --output=markdown`);
  }

  const result = {
    ok: true,
    action: dryRun ? "validated" : previewOnly ? "preview-dispatched" : "deploy-dispatched",
    environment,
    environmentDir: relativeToRoot(environmentDir),
    deployRepo: repo,
    previewOnly,
    dryRun,
    deploymentRoot: relativeToRoot(path.resolve(rootDir, deploymentRoot)),
    runId,
    dispatch: dispatch.parsed,
    observation,
    verification,
    followUp,
  };

  if (writeEvidence && !dryRun) {
    const evidenceFile = path.resolve(rootDir, deploymentRoot, environment, previewOnly ? "last-preview-dispatch.json" : "last-deploy-dispatch.json");
    fs.mkdirSync(path.dirname(evidenceFile), { recursive: true });
    fs.writeFileSync(evidenceFile, `${JSON.stringify({
      ...result,
      evidenceFile: relativeToRoot(evidenceFile),
      writtenAt: new Date().toISOString(),
    }, null, 2)}\n`);
    result.dispatchEvidenceFile = relativeToRoot(evidenceFile);
  }

  if (outputMode === "json") {
    printJson(result);
  } else if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(renderMarkdown(result));
  } else {
    console.log(`Installer deploy: ${result.action}`);
    console.log(`Environment: ${environment}`);
    if (runId) console.log(`Run id: ${runId}`);
    followUp.forEach((line) => console.log(`- ${line}`));
  }
}

main();
