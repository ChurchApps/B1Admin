#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getArg, getBooleanArg } from "./lib/arg-utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deployScriptPath = path.join(rootDir, "infrastructure", "environments", "staging", "deploy-split-stack.sh");

function runNodeScript(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runShellScript(scriptPath, envOverrides = {}) {
  const result = spawnSync("bash", [scriptPath], {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, ...envOverrides },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function buildPlanArgs(options) {
  const args = [
    path.join(rootDir, "scripts", "plan-environment-deploy.mjs"),
    "--environment=staging",
    `--region=${options.region}`,
    `--deployment-source=${options.deploymentSource}`,
    `--api-repo-path=${options.apiRepoPath}`,
    `--sync-app-config-secret=${options.syncAppConfigSecret}`,
    `--sync-bootstrap-admin-secret=${options.syncBootstrapAdminSecret}`,
    `--run-api-migrations=${options.runApiMigrations}`,
    `--run-bootstrap-admin=${options.runBootstrapAdmin}`,
    `--api-migration-action=${options.apiMigrationAction}`,
    `--api-migration-module=${options.apiMigrationModule}`,
    `--verify-http-after-deploy=${options.verifyHttpAfterDeploy}`,
    "--output=json",
  ];

  if (options.packageManifestFile) args.push(`--package-manifest-file=${options.packageManifestFile}`);
  if (options.backendArtifactSourceFile) args.push(`--backend-artifact-source-file=${options.backendArtifactSourceFile}`);
  if (options.migrationArtifactSourceFile) args.push(`--migration-artifact-source-file=${options.migrationArtifactSourceFile}`);
  if (options.dependenciesLayerSourceFile) args.push(`--dependencies-layer-source-file=${options.dependenciesLayerSourceFile}`);

  return args;
}

function getPlan(options) {
  const result = spawnSync(process.execPath, buildPlanArgs(options), {
    cwd: rootDir,
    encoding: "utf8",
    env: process.env,
  });

  let parsed;
  try {
    parsed = JSON.parse(result.stdout || "{}");
  } catch {
    console.error("Could not parse staging deploy plan output.");
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(result.status ?? 1);
  }

  if (result.status !== 0) {
    console.error("Staging deploy plan found blockers.");
    if (parsed?.recommendedCommands?.primary) {
      console.error(`Primary next command: ${parsed.recommendedCommands.primary}`);
    }
    process.exit(result.status);
  }

  return parsed;
}

function buildDispatchArgs(options) {
  const args = [
    path.join(rootDir, "scripts", "dispatch-github-aws-deploy.mjs"),
    "--environment=staging",
    `--deployment-source=${options.deploymentSource}`,
    `--region=${options.region}`,
    `--sync-app-config-secret=${options.syncAppConfigSecret}`,
    `--sync-bootstrap-admin-secret=${options.syncBootstrapAdminSecret}`,
    `--run-api-migrations=${options.runApiMigrations}`,
    `--run-bootstrap-admin=${options.runBootstrapAdmin}`,
    `--api-migration-action=${options.apiMigrationAction}`,
    `--api-migration-module=${options.apiMigrationModule}`,
    `--verify-http-after-deploy=${options.verifyHttpAfterDeploy}`,
    `--dry-run=${options.dryRun}`,
    `--preview-only=${options.previewOnly}`,
  ];

  if (options.githubAuthMode !== "oidc") args.push(`--github-auth-mode=${options.githubAuthMode}`);
  if (options.repo) args.push(`--repo=${options.repo}`);
  if (options.apiRepo !== "ChurchApps/Api") args.push(`--api-repo=${options.apiRepo}`);
  if (options.apiRef !== "main") args.push(`--api-ref=${options.apiRef}`);
  if (options.packageManifestFile) args.push(`--package-manifest-file=${options.packageManifestFile}`);
  if (options.backendArtifactSourceFile) args.push(`--backend-artifact-source-file=${options.backendArtifactSourceFile}`);
  if (options.migrationArtifactSourceFile) args.push(`--migration-artifact-source-file=${options.migrationArtifactSourceFile}`);
  if (options.dependenciesLayerSourceFile) args.push(`--dependencies-layer-source-file=${options.dependenciesLayerSourceFile}`);

  return args;
}

function getLocalEnvOverrides(options) {
  return {
    AWS_REGION: options.region,
    API_REPO_PATH: options.apiRepoPath,
    PACKAGE_MODE: "layered",
    PACKAGE_BUILD_LAYER: "true",
    PACKAGE_MANIFEST_FILE: options.packageManifestFile,
    BACKEND_ARTIFACT_SOURCE_FILE: options.backendArtifactSourceFile,
    MIGRATION_ARTIFACT_SOURCE_FILE: options.migrationArtifactSourceFile,
    DEPENDENCIES_LAYER_SOURCE_FILE: options.dependenciesLayerSourceFile,
    SYNC_APP_CONFIG_SECRET: String(options.syncAppConfigSecret),
    SYNC_BOOTSTRAP_ADMIN_SECRET: String(options.syncBootstrapAdminSecret),
    RUN_API_MIGRATIONS: String(options.runApiMigrations),
    RUN_BOOTSTRAP_ADMIN: String(options.runBootstrapAdmin),
    API_MIGRATION_ACTION: options.apiMigrationAction,
    API_MIGRATION_MODULE: options.apiMigrationModule,
    VERIFY_HTTP_AFTER_DEPLOY: String(options.verifyHttpAfterDeploy),
    PREVIEW_ONLY: String(options.previewOnly),
  };
}

function main() {
  const options = {
    mode: getArg("mode", "auto"),
    region: getArg("region", "us-east-1"),
    deploymentSource: getArg("deployment-source", "api-repo"),
    apiRepoPath: getArg("api-repo-path", "../Api"),
    apiRepo: getArg("api-repo", "ChurchApps/Api"),
    apiRef: getArg("api-ref", "main"),
    packageManifestFile: getArg("package-manifest-file", ""),
    backendArtifactSourceFile: getArg("backend-artifact-source-file", ""),
    migrationArtifactSourceFile: getArg("migration-artifact-source-file", ""),
    dependenciesLayerSourceFile: getArg("dependencies-layer-source-file", ""),
    repo: getArg("repo", ""),
    githubAuthMode: getArg("github-auth-mode", "oidc"),
    syncAppConfigSecret: getBooleanArg("sync-app-config-secret", true),
    syncBootstrapAdminSecret: getBooleanArg("sync-bootstrap-admin-secret", false),
    runApiMigrations: getBooleanArg("run-api-migrations", false),
    runBootstrapAdmin: getBooleanArg("run-bootstrap-admin", false),
    apiMigrationAction: getArg("api-migration-action", "up"),
    apiMigrationModule: getArg("api-migration-module", "all"),
    verifyHttpAfterDeploy: getBooleanArg("verify-http-after-deploy", false),
    previewOnly: getBooleanArg("preview-only", false),
    dryRun: getBooleanArg("dry-run", false),
  };

  if (!options.previewOnly && !options.dryRun && options.deploymentSource === "api-repo") {
    console.log("Staging launch note: the Api TypeScript compile step can take 10+ minutes on a full local build.");
    console.log("During that step, repeated [WAIT] messages are expected while the deploy continues.");
  }

  const plan = getPlan(options);
  const recommendedPath = plan?.recommendedExecution?.path ?? "none";

  let selectedMode = options.mode;
  if (selectedMode === "auto") {
    selectedMode = recommendedPath === "github-actions" ? "github" : "local";
  }

  if (selectedMode === "github") {
    runNodeScript(buildDispatchArgs(options)[0], buildDispatchArgs(options).slice(1));
    return;
  }

  if (selectedMode === "local") {
    if (options.dryRun) {
      console.log("Staging launch dry-run complete.");
      console.log(`Recommended path: ${recommendedPath}`);
      console.log(`Using local deploy wrapper: ${deployScriptPath}`);
      return;
    }
    runShellScript(deployScriptPath, getLocalEnvOverrides(options));
    return;
  }

  console.error(`Unsupported launch mode: ${options.mode}`);
  process.exit(1);
}

main();
