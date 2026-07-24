import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getGithubCliReadiness } from "./lib/github-cli-readiness.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseGithubRepo(remoteUrl) {
  const match = String(remoteUrl || "").trim().match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/i);
  if (!match) return "";
  return `${match[1]}/${match[2]}`;
}

function resolveGithubRepo(explicitRepo = "") {
  if (explicitRepo) return explicitRepo;
  try {
    const remoteUrl = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 1024 * 1024,
    }).trim();
    return parseGithubRepo(remoteUrl);
  } catch {
    return "";
  }
}

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const bareFlag = `--${name}`;
  for (let index = 0; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
    if (arg === bareFlag) {
      const next = process.argv[index + 1];
      if (next !== undefined && !next.startsWith("--")) return next;
    }
  }
  const envName = name.toUpperCase().replace(/-/g, "_");
  return process.env[envName] ?? process.env[name.toUpperCase()] ?? fallback;
}

function hasArg(name) {
  const prefix = `--${name}=`;
  const bareFlag = `--${name}`;
  return process.argv.some((arg) => arg === bareFlag || arg.startsWith(prefix));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function runJsonNodeScript(scriptPath, args) {
  const result = execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  });
  return JSON.parse(result);
}

function runNodeScript(scriptPath, args) {
  try {
    execFileSync(process.execPath, [scriptPath, ...args], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    const stderr = error && typeof error === "object" && "stderr" in error ? String(error.stderr || "") : "";
    const message = error instanceof Error ? error.message : String(error);
    fail(stderr.trim() || message);
  }
}

function runGhWorkflow(args) {
  try {
    execFileSync("gh", args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      fail("GitHub CLI is not installed or not available on PATH.");
    }

    const stderr = error && typeof error === "object" && "stderr" in error ? String(error.stderr || "") : "";
    const message = error instanceof Error ? error.message : String(error);
    fail(`GitHub workflow dispatch failed: ${stderr.trim() || message}`);
  }
}

function ensureGhAuth() {
  const readiness = getGithubCliReadiness({
    cwd: rootDir,
    connectivityAction: "dispatching the workflow from here.",
  });

  if (!readiness.ok) {
    fail(readiness.blockers[0] || "GitHub CLI auth check failed.");
  }
}

function resolveEnvironmentDir(environment, explicitDir = "") {
  if (explicitDir) {
    return path.resolve(rootDir, explicitDir);
  }
  return path.join(rootDir, "infrastructure", "environments", environment);
}

function buildDispatchCommand(repo, workflowInputs) {
  const parts = ["gh", "workflow", "run", "deploy-aws-self-hosted.yml"];
  if (repo) {
    parts.push("--repo", shellQuote(repo));
  }
  Object.entries(workflowInputs).forEach(([key, value]) => {
    parts.push("-f", `${key}=${shellQuote(value)}`);
  });
  return parts.join(" ");
}

function buildGhRunCommand(repo, commandParts) {
  const parts = ["gh", "run", ...commandParts];
  if (repo) {
    parts.push("--repo", shellQuote(repo));
  }
  return parts.join(" ");
}

function buildFollowUpCommands(repo) {
  const listRuns = buildGhRunCommand(repo, ["list", "--workflow", "deploy-aws-self-hosted.yml", "--limit", "5"]);
  const latestRunIdExpr = "$(gh run list --workflow deploy-aws-self-hosted.yml --limit 1 --json databaseId --jq '.[0].databaseId'";
  const latestRunIdWithRepoExpr = repo
    ? `${latestRunIdExpr} --repo ${shellQuote(repo)})`
    : `${latestRunIdExpr})`;

  return {
    listRuns,
    watchLatestRun: `${buildGhRunCommand(repo, ["watch", latestRunIdWithRepoExpr, "--compact", "--exit-status"])}`,
    viewLatestRun: `${buildGhRunCommand(repo, ["view", latestRunIdWithRepoExpr])}`,
  };
}

function main() {
  const environment = getArg("environment", "staging");
  const environmentDirArg = getArg("environment-dir");
  const environmentDir = resolveEnvironmentDir(environment, environmentDirArg);
  const region = getArg("region", "us-east-1");
  const deploymentSource = getArg("deployment-source", "api-repo");
  const githubAuthMode = getArg("github-auth-mode", "oidc");
  const apiRepoPath = getArg("api-repo-path", "../Api");
  const b1adminRepo = getArg("b1admin-repo", "ChurchApps/B1Admin");
  const b1adminRef = getArg("b1admin-ref", "main");
  const apiRepo = getArg("api-repo", "ChurchApps/Api");
  const apiRef = getArg("api-ref", "main");
  const packageManifestFile = getArg("package-manifest-file");
  const backendArtifactSourceFile = getArg("backend-artifact-source-file");
  const migrationArtifactSourceFile = getArg("migration-artifact-source-file");
  const dependenciesLayerSourceFile = getArg("dependencies-layer-source-file");
  const runApiMigrations = getArg("run-api-migrations", "false");
  const apiMigrationAction = getArg("api-migration-action", "up");
  const apiMigrationModule = getArg("api-migration-module", "all");
  const apiMigrationRunner = getArg("api-migration-runner", "direct");
  const verifyHttpAfterDeploy = getArg("verify-http-after-deploy", "false");
  const previewOnly = getArg("preview-only", "false").toLowerCase() === "true";
  const outputMode = getArg("output", "text").toLowerCase();
  const dryRun = getArg("dry-run", "false").toLowerCase() === "true";
  const skipGhAuthCheck = getArg("skip-gh-auth-check", "false").toLowerCase() === "true";
  const repo = resolveGithubRepo(getArg("repo"));
  const syncGithubSecret = getArg("sync-github-secret", "true").toLowerCase() === "true";
  const explicitSyncAppConfigSecret = hasArg("sync-app-config-secret");
  const explicitSyncBootstrapAdminSecret = hasArg("sync-bootstrap-admin-secret");
  const secretFileExists = fs.existsSync(path.join(environmentDir, "app-config-secret.json"));
  const syncAppConfigSecret = explicitSyncAppConfigSecret
    ? getArg("sync-app-config-secret", "false").toLowerCase() === "true"
    : secretFileExists;
  const syncBootstrapAdminSecret = explicitSyncBootstrapAdminSecret
    ? getArg("sync-bootstrap-admin-secret", "false").toLowerCase() === "true"
    : false;
  const runBootstrapAdmin = getArg("run-bootstrap-admin", "false");

  const planArgs = [
    "scripts/plan-environment-deploy.mjs",
    `--environment=${environment}`,
    `--region=${region}`,
    `--deployment-source=${deploymentSource}`,
    `--github-auth-mode=${githubAuthMode}`,
    `--api-repo-path=${apiRepoPath}`,
    `--b1admin-repo=${b1adminRepo}`,
    `--b1admin-ref=${b1adminRef}`,
    `--api-repo=${apiRepo}`,
    `--api-ref=${apiRef}`,
    `--run-api-migrations=${runApiMigrations}`,
    `--sync-bootstrap-admin-secret=${syncBootstrapAdminSecret ? "true" : "false"}`,
    `--run-bootstrap-admin=${runBootstrapAdmin}`,
    `--api-migration-action=${apiMigrationAction}`,
    `--api-migration-module=${apiMigrationModule}`,
    `--api-migration-runner=${apiMigrationRunner}`,
    `--verify-http-after-deploy=${verifyHttpAfterDeploy}`,
    `--preview-only=${previewOnly ? "true" : "false"}`,
    `--sync-app-config-secret=${syncAppConfigSecret ? "true" : "false"}`,
    "--output=json",
  ];

  if (environmentDirArg) planArgs.push(`--environment-dir=${environmentDirArg}`);
  if (packageManifestFile) planArgs.push(`--package-manifest-file=${packageManifestFile}`);
  if (backendArtifactSourceFile) planArgs.push(`--backend-artifact-source-file=${backendArtifactSourceFile}`);
  if (migrationArtifactSourceFile) planArgs.push(`--migration-artifact-source-file=${migrationArtifactSourceFile}`);
  if (dependenciesLayerSourceFile) planArgs.push(`--dependencies-layer-source-file=${dependenciesLayerSourceFile}`);

  let plan;
  try {
    plan = runJsonNodeScript(planArgs[0], planArgs.slice(1));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not compute GitHub deploy plan: ${message}`);
  }

  if (!plan.githubActionsExecution?.ok) {
    const blockers = (plan.githubActionsExecution?.blockers || []).map((entry) => `- ${entry}`).join("\n");
    fail(`GitHub deploy is not ready yet.\n${blockers}`);
  }

  const workflowInputs = {
    ...(plan.workflowInputs || {}),
    preview_only: previewOnly ? "true" : "false",
  };

  const dispatchArgs = ["workflow", "run", "deploy-aws-self-hosted.yml"];
  if (repo) {
    dispatchArgs.push("--repo", repo);
  }
  Object.entries(workflowInputs).forEach(([key, value]) => {
    dispatchArgs.push("-f", `${key}=${value}`);
  });

  let secretSync = {
    attempted: false,
    performed: false,
    command: plan.githubSecretSyncCommand || "",
  };

  if (!skipGhAuthCheck) {
    ensureGhAuth();
  }

  if (syncGithubSecret && plan.githubSecretSyncCommand) {
    secretSync.attempted = true;
    const syncArgs = [
      "scripts/sync-github-app-config-secret.mjs",
      `--environment=${environment}`,
      `--secret-file=${plan.environmentDir}/app-config-secret.json`,
      "--output=json",
    ];
    if (environmentDirArg) syncArgs.push(`--environment-dir=${environmentDirArg}`);
    if (repo) syncArgs.push(`--repo=${repo}`);
    if (dryRun) syncArgs.push("--dry-run=true");
    if (skipGhAuthCheck) syncArgs.push("--skip-gh-auth-check=true");
    runNodeScript(syncArgs[0], syncArgs.slice(1));
    secretSync.performed = !dryRun;
  }

  if (!dryRun) {
    runGhWorkflow(dispatchArgs);
  }

  const result = {
    ok: true,
    action: dryRun ? "validated" : "dispatched",
    environment,
    workflowEnvironmentName: plan.workflowEnvironmentName,
    deploymentSource,
    previewOnly,
    syncAppConfigSecret,
    secretSync,
    dispatchCommand: buildDispatchCommand(repo, workflowInputs),
    followUpCommands: buildFollowUpCommands(repo),
    workflowInputs,
    blockers: [],
  };

  if (outputMode === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  console.log(dryRun ? "\nGitHub deploy validation complete." : "\nGitHub deploy dispatched.");
  console.log(`Environment: ${result.environment}`);
  console.log(`Workflow environment: ${result.workflowEnvironmentName}`);
  console.log(`Deployment source: ${result.deploymentSource}`);
  console.log(`Preview only: ${result.previewOnly ? "true" : "false"}`);
  if (secretSync.attempted) {
    console.log(`App-config GitHub secret sync: ${dryRun ? "validated" : "performed"}`);
  }
  console.log(`Dispatch command: ${result.dispatchCommand}`);
  console.log(`List recent runs: ${result.followUpCommands.listRuns}`);
  console.log(`Watch latest run: ${result.followUpCommands.watchLatestRun}`);
  console.log(`View latest run: ${result.followUpCommands.viewLatestRun}`);
}

main();
