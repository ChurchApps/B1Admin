import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getGithubCliReadiness } from "./lib/github-cli-readiness.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function canReadPath(targetPath) {
  try {
    fs.accessSync(targetPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveEnvironmentDir(environment, explicitDir = "") {
  if (explicitDir) {
    return path.resolve(rootDir, explicitDir);
  }
  return path.join(rootDir, "infrastructure", "environments", environment);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function buildEnvCommand(envVars, scriptPath) {
  const assignments = Object.entries(envVars)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${shellQuote(value)}`);
  return [...assignments, scriptPath].join(" ");
}

function buildGhWorkflowCommand(inputs, extraInputs = {}) {
  const args = Object.entries({ ...inputs, ...extraInputs })
    .map(([key, value]) => `-f ${key}=${shellQuote(value)}`);
  return `gh workflow run deploy-aws-self-hosted.yml ${args.join(" ")}`;
}

function buildGithubDispatchWrapperCommand(options, extraArgs = []) {
  const args = [
    "yarn dispatch:github-aws-deploy --",
    `--environment=${options.environment}`,
    `--deployment-source=${options.deploymentSource}`,
    `--region=${options.region}`,
  ];

  if (options.environmentDirArg) {
    args.push(`--environment-dir=${options.environmentDirArg}`);
  }

  if (options.githubAuthMode !== "oidc") {
    args.push(`--github-auth-mode=${options.githubAuthMode}`);
  }

  if (options.b1adminRepo !== "ChurchApps/B1Admin") {
    args.push(`--b1admin-repo=${options.b1adminRepo}`);
  }
  if (options.b1adminRef !== "main") {
    args.push(`--b1admin-ref=${options.b1adminRef}`);
  }

  if (options.deploymentSource === "api-repo") {
    if (options.apiRepo !== "ChurchApps/Api") {
      args.push(`--api-repo=${options.apiRepo}`);
    }
    if (options.apiRef !== "main") {
      args.push(`--api-ref=${options.apiRef}`);
    }
  }

  if (options.deploymentSource === "package-manifest" && options.packageManifestFile) {
    args.push(`--package-manifest-file=${options.packageManifestFile}`);
  }

  if (options.deploymentSource === "backend-artifact" && options.backendArtifactSourceFile) {
    args.push(`--backend-artifact-source-file=${options.backendArtifactSourceFile}`);
    if (options.migrationArtifactSourceFile) {
      args.push(`--migration-artifact-source-file=${options.migrationArtifactSourceFile}`);
    }
    if (options.dependenciesLayerSourceFile) {
      args.push(`--dependencies-layer-source-file=${options.dependenciesLayerSourceFile}`);
    }
  }

  if (options.syncAppConfigSecret) {
    args.push("--sync-app-config-secret=true");
  }

  if (options.syncBootstrapAdminSecret) {
    args.push("--sync-bootstrap-admin-secret=true");
  }

  if (options.runApiMigrations) {
    args.push("--run-api-migrations=true");
    args.push(`--api-migration-action=${options.apiMigrationAction}`);
    args.push(`--api-migration-module=${options.apiMigrationModule}`);
    if (options.apiMigrationRunner && options.apiMigrationRunner !== "direct") {
      args.push(`--api-migration-runner=${options.apiMigrationRunner}`);
    }
  }

  if (options.runBootstrapAdmin) {
    args.push("--run-bootstrap-admin=true");
  }

  if (options.verifyHttpAfterDeploy) {
    args.push("--verify-http-after-deploy=true");
  }

  args.push(...extraArgs);
  return args.join(" ");
}

function getLocalGithubDispatchReadiness() {
  return getGithubCliReadiness({
    cwd: rootDir,
    connectivityAction: "dispatching the workflow from here.",
  });
}

function buildStarterPrepCommands(environment, accountId = "", environmentDirArg = "") {
  const resolvedAccountId = accountId || "<aws-account-id>";
  const accountArg = resolvedAccountId ? ` --account-id=${resolvedAccountId}` : "";
  const environmentDirCliArg = environmentDirArg ? ` --environment-dir=${environmentDirArg}` : "";

  return {
    dryRun: `yarn prepare:environment-starter -- --environment=${environment}${environmentDirCliArg}${accountArg} --output=json`,
    commands: `yarn prepare:environment-starter -- --environment=${environment}${environmentDirCliArg}${accountArg} --output=commands`,
    markdown: `yarn prepare:environment-starter -- --environment=${environment}${environmentDirCliArg}${accountArg} --output=markdown`,
    write: `yarn prepare:environment-starter -- --environment=${environment}${environmentDirCliArg}${accountArg} --write=true`,
  };
}

function readStarterAudit(environment, environmentDirArg = "") {
  const args = [
    path.join(rootDir, "scripts", "audit-environment-starter.mjs"),
    `--environment=${environment}`,
    "--output=json",
  ];

  if (environmentDirArg) {
    args.push(`--environment-dir=${environmentDirArg}`);
  }

  const result = spawnSync(process.execPath, args, {
    cwd: rootDir,
    encoding: "utf8",
  });

  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout || "{}");
  } catch {
    parsed = null;
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Could not parse starter audit output.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  return {
    status: result.status ?? 1,
    parsed,
  };
}

function buildInputBlockers(deploymentSource, options) {
  const blockers = [];

  if (deploymentSource === "package-manifest" && !options.packageManifestFile) {
    blockers.push("package-manifest-file is required when deployment-source=package-manifest.");
  }

  if (deploymentSource === "backend-artifact" && !options.backendArtifactSourceFile) {
    blockers.push("backend-artifact-source-file is required when deployment-source=backend-artifact.");
  }

  return blockers;
}

function buildLocalExecutionBlockers(deploymentSource, environmentDir, options) {
  const blockers = [];
  const secretPath = path.join(environmentDir, "app-config-secret.json");
  const bootstrapAdminSecretPath = path.join(environmentDir, "bootstrap-admin-secret.json");

  if (deploymentSource === "api-repo") {
    const resolvedApiRepoPath = path.resolve(rootDir, options.apiRepoPath);
    const apiRepoPackagePath = path.join(resolvedApiRepoPath, "package.json");

    if (!fs.existsSync(resolvedApiRepoPath)) {
      blockers.push(`Local api-repo path does not exist yet: ${options.apiRepoPath}`);
    } else if (!canReadPath(resolvedApiRepoPath)) {
      blockers.push(`Local api-repo path is not readable from this workspace: ${options.apiRepoPath}`);
      blockers.push("Use the GitHub Actions api-repo path, or switch this local run to deployment-source=package-manifest or deployment-source=backend-artifact.");
    } else if (!fs.existsSync(apiRepoPackagePath)) {
      blockers.push(`Local api-repo package.json does not exist yet: ${path.join(options.apiRepoPath, "package.json")}`);
    } else if (!canReadPath(apiRepoPackagePath)) {
      blockers.push(`Local api-repo package.json is not readable from this workspace: ${path.join(options.apiRepoPath, "package.json")}`);
      blockers.push("Use the GitHub Actions api-repo path, or switch this local run to deployment-source=package-manifest or deployment-source=backend-artifact.");
    }
  }

  if (deploymentSource === "package-manifest" && options.packageManifestFile && !fs.existsSync(path.resolve(rootDir, options.packageManifestFile))) {
    blockers.push(`Local package manifest file does not exist yet: ${options.packageManifestFile}`);
  }

  if (deploymentSource === "backend-artifact" && options.backendArtifactSourceFile && !fs.existsSync(path.resolve(rootDir, options.backendArtifactSourceFile))) {
    blockers.push(`Local backend artifact file does not exist yet: ${options.backendArtifactSourceFile}`);
  }

  if (options.migrationArtifactSourceFile && !fs.existsSync(path.resolve(rootDir, options.migrationArtifactSourceFile))) {
    blockers.push(`Local migration artifact file does not exist yet: ${options.migrationArtifactSourceFile}`);
  }

  if (options.dependenciesLayerSourceFile && !fs.existsSync(path.resolve(rootDir, options.dependenciesLayerSourceFile))) {
    blockers.push(`Local dependencies layer file does not exist yet: ${options.dependenciesLayerSourceFile}`);
  }

  if (options.syncAppConfigSecret && !fs.existsSync(secretPath)) {
    blockers.push(`sync-app-config-secret is enabled, but ${path.relative(rootDir, secretPath)} does not exist yet. Create it locally before using the local deploy command.`);
  }

  if (options.syncBootstrapAdminSecret && !fs.existsSync(bootstrapAdminSecretPath)) {
    blockers.push(`sync-bootstrap-admin-secret is enabled, but ${path.relative(rootDir, bootstrapAdminSecretPath)} does not exist yet. Create it locally before using the local deploy command.`);
  }

  return blockers;
}

function buildWarnings(options) {
  const warnings = [];

  if (options.githubAuthMode === "static") {
    warnings.push("Static AWS access keys are selected for GitHub Actions. Prefer OIDC role assumption when the target AWS account can support it.");
  }

  if (!options.verifyHttpAfterDeploy) {
    warnings.push("HTTP verification after deploy is disabled. The stack and output checks still run, but public URL reachability will not be probed automatically.");
  }

  if (!options.runApiMigrations) {
    warnings.push("API migrations are disabled for this plan. If the target database is empty, schedule a migration pass after the first infrastructure deploy.");
  } else if (options.apiMigrationRunner === "data-api") {
    warnings.push("API migrations will use the Aurora Data API runner. This avoids private DB network access requirements on the workflow host.");
  }

  if (!options.runBootstrapAdmin) {
    warnings.push("Initial admin bootstrap is disabled for this plan. A fresh environment will not have a sign-in until you run the bootstrap-admin helper separately.");
  }

  return warnings;
}

function appConfigSecretRequiresRunnerMaterialization(auditParsed) {
  const appConfigAudit = (auditParsed?.files || []).find((fileAudit) => fileAudit.fileName === "app-config-secret.template.json");
  if (!appConfigAudit) return false;

  return Array.isArray(appConfigAudit.resolvedBySecretFile) && appConfigAudit.resolvedBySecretFile.length > 0;
}

function buildGithubExecutionBlockers(auditParsed, options) {
  const blockers = [];
  const requiresRunnerSecret = appConfigSecretRequiresRunnerMaterialization(auditParsed);

  if (requiresRunnerSecret && !options.syncAppConfigSecret) {
    blockers.push("GitHub Actions will not receive the local app-config-secret.json file from this workspace. Enable sync-app-config-secret and provide AWS_APP_CONFIG_SECRET_JSON in the GitHub Environment, or use a local deploy/package-manifest path instead.");
  }

  if (options.runBootstrapAdmin && !options.syncBootstrapAdminSecret) {
    blockers.push("GitHub Actions cannot materialize the bootstrap admin secret yet. Enable sync-bootstrap-admin-secret and provide AWS_BOOTSTRAP_ADMIN_SECRET_JSON in the GitHub Environment, or use a local deploy path for the first-login bootstrap.");
  }

  return blockers;
}

function buildLocalEnv(options) {
  const localEnv = {
    AWS_REGION: options.region,
    SYNC_APP_CONFIG_SECRET: options.syncAppConfigSecret ? "true" : "false",
    RUN_API_MIGRATIONS: options.runApiMigrations ? "true" : "false",
    RUN_BOOTSTRAP_ADMIN: options.runBootstrapAdmin ? "true" : "false",
    VERIFY_HTTP_AFTER_DEPLOY: options.verifyHttpAfterDeploy ? "true" : "false",
  };

  if (options.environmentDirArg) {
    localEnv.ENV_DIR = options.environmentDirArg;
  }

  if (options.runApiMigrations) {
    localEnv.API_MIGRATION_ACTION = options.apiMigrationAction;
    localEnv.API_MIGRATION_MODULE = options.apiMigrationModule;
    localEnv.API_MIGRATION_RUNNER = options.apiMigrationRunner || "direct";
  }

  if (options.runBootstrapAdmin && options.syncBootstrapAdminSecret) {
    localEnv.BOOTSTRAP_ADMIN_SECRET_FILE = path.join(options.environmentDir, "bootstrap-admin-secret.json");
  }

  if (options.deploymentSource === "api-repo") {
    localEnv.API_REPO_PATH = options.apiRepoPath;
  } else if (options.deploymentSource === "package-manifest") {
    localEnv.PACKAGE_MANIFEST_FILE = options.packageManifestFile;
  } else if (options.deploymentSource === "backend-artifact") {
    localEnv.BACKEND_ARTIFACT_SOURCE_FILE = options.backendArtifactSourceFile;
    if (options.migrationArtifactSourceFile) {
      localEnv.MIGRATION_ARTIFACT_SOURCE_FILE = options.migrationArtifactSourceFile;
    }
    if (options.dependenciesLayerSourceFile) {
      localEnv.DEPENDENCIES_LAYER_SOURCE_FILE = options.dependenciesLayerSourceFile;
    }
  }

  return localEnv;
}

function buildWorkflowInputs(options) {
  const workflowInputs = {
    environment: options.environment,
    aws_region: options.region,
    deployment_source: options.deploymentSource,
    b1admin_repo: options.b1adminRepo,
    b1admin_ref: options.b1adminRef,
    api_repo: options.deploymentSource === "api-repo" ? options.apiRepo : "",
    api_ref: options.deploymentSource === "api-repo" ? options.apiRef : "",
    package_manifest_file: options.deploymentSource === "package-manifest" ? options.packageManifestFile : "",
    backend_artifact_source_file: options.deploymentSource === "backend-artifact" ? options.backendArtifactSourceFile : "",
    migration_artifact_source_file: options.deploymentSource === "backend-artifact" ? options.migrationArtifactSourceFile : "",
    dependencies_layer_source_file: options.deploymentSource === "backend-artifact" ? options.dependenciesLayerSourceFile : "",
    sync_app_config_secret: options.syncAppConfigSecret ? "true" : "false",
    run_api_migrations: options.runApiMigrations ? "true" : "false",
    sync_bootstrap_admin_secret: options.syncBootstrapAdminSecret ? "true" : "false",
    run_bootstrap_admin: options.runBootstrapAdmin ? "true" : "false",
    api_migration_action: options.apiMigrationAction,
    api_migration_module: options.apiMigrationModule,
    verify_http_after_deploy: options.verifyHttpAfterDeploy ? "true" : "false",
  };

  return workflowInputs;
}

function buildRequiredGithubSecrets(options) {
  const required = options.githubAuthMode === "static"
    ? ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
    : ["AWS_ROLE_TO_ASSUME"];

  if (options.syncAppConfigSecret) {
    required.push("AWS_APP_CONFIG_SECRET_JSON");
  }

  if (options.syncBootstrapAdminSecret) {
    required.push("AWS_BOOTSTRAP_ADMIN_SECRET_JSON");
  }

  return required;
}

function buildOptionalGithubSecrets(options) {
  const optional = [];

  if (options.deploymentSource === "api-repo") {
    optional.push("B1ADMIN_REPO_CHECKOUT_TOKEN");
    optional.push("API_REPO_CHECKOUT_TOKEN");
  }

  return optional;
}

function buildRecommendedExecutionPath(blockers, localExecution, githubActionsExecution) {
  if (blockers.length > 0) {
    return {
      path: "none",
      reason: "Shared starter or input blockers still exist, so neither the local path nor the GitHub Actions path is ready yet.",
    };
  }

  if (localExecution.ok && githubActionsExecution.ok) {
    return {
      path: "either",
      reason: "Both the local path and the GitHub Actions path are ready based on the current checked-in environment files and provided inputs.",
    };
  }

  if (githubActionsExecution.ok && !localExecution.ok) {
    return {
      path: "github-actions",
      reason: "GitHub Actions is ready, but the local path still has execution-specific blockers in the current workspace.",
    };
  }

  if (localExecution.ok && !githubActionsExecution.ok) {
    return {
      path: "local",
      reason: "The local path is ready, but GitHub Actions still has execution-specific blockers.",
    };
  }

  return {
    path: "none",
    reason: "Execution-specific blockers still need to be cleared before running a deploy.",
  };
}

function buildRecommendedCommands(result) {
  const { recommendedExecution, commands, starterPrepCommands } = result;

  if (recommendedExecution.path === "none" && result.starterSummary?.blockerCount > 0) {
    return {
      primary: starterPrepCommands.dryRun,
      alternates: [
        commands.audit,
        starterPrepCommands.commands,
        starterPrepCommands.write,
        commands.localPreview,
        commands.githubActionsWrapperPreview,
        commands.githubActionsPreview,
        commands.local,
        commands.githubActionsWrapper,
        commands.githubActions,
      ],
    };
  }

  if (recommendedExecution.path === "none") {
    const alternates = [];

    if (!result.localGithubDispatch?.ok) {
      if (result.githubSecretSyncCommand) alternates.push(result.githubSecretSyncCommand);
      alternates.push(commands.githubActionsWrapperPreview);
      alternates.push(commands.githubActionsPreview);
      alternates.push(commands.githubActionsWrapper);
      alternates.push(commands.githubActions);
      if (result.localFallbackCommands) {
        alternates.push(result.localFallbackCommands.packageManifestPlan);
        alternates.push(result.localFallbackCommands.backendArtifactPlan);
      }
      alternates.push(commands.localPreview);
      alternates.push(commands.local);

      return {
        primary: "gh auth login -h github.com",
        alternates: [...new Set(alternates)],
      };
    }

    const githubBlockers = result.githubActionsExecution?.blockers || [];
    const requiresGithubSecretMaterialization = githubBlockers.some((entry) => (
      String(entry).includes("Enable sync-app-config-secret and provide AWS_APP_CONFIG_SECRET_JSON")
    ));

    if (requiresGithubSecretMaterialization && result.githubSecretSyncCommand) {
      alternates.push(commands.githubActionsWrapper, commands.githubActions, commands.local);
      alternates.push(commands.githubActionsWrapperPreview, commands.githubActionsPreview, commands.localPreview);
      if (result.localFallbackCommands) {
        alternates.push(result.localFallbackCommands.packageManifestPlan);
        alternates.push(result.localFallbackCommands.backendArtifactPlan);
      }

      return {
        primary: result.githubSecretSyncCommand,
        alternates: [...new Set(alternates)],
      };
    }
  }

  if (recommendedExecution.path === "github-actions") {
    if (!result.localGithubDispatch?.ok) {
      return {
        primary: "gh auth login -h github.com",
        alternates: [commands.githubActionsWrapperPreview, commands.githubActionsPreview, commands.githubActionsWrapper, commands.githubActions, commands.localPreview, commands.local],
      };
    }

    return {
      primary: commands.githubActionsWrapper,
      alternates: [commands.githubActionsWrapperPreview, commands.githubActionsPreview, commands.localPreview, commands.local, commands.githubActions],
    };
  }

  if (recommendedExecution.path === "local" || recommendedExecution.path === "either") {
    return {
      primary: commands.local,
      alternates: [commands.localPreview, commands.githubActionsWrapperPreview, commands.githubActionsPreview, commands.githubActionsWrapper, commands.githubActions],
    };
  }

  return {
    primary: commands.audit,
    alternates: [commands.localPreview, commands.githubActionsWrapperPreview, commands.githubActionsPreview, commands.local, commands.githubActionsWrapper, commands.githubActions],
  };
}

function dedupeStrings(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function normalizeNextSteps(values) {
  const deduped = dedupeStrings(values);
  const firstStep = String(deduped[0] || "");

  if (firstStep.includes("Run `gh auth login -h github.com` first")) {
    return deduped.filter((value, index) => (
      index === 0 || !String(value).includes("fix the local `gh` login first with `gh auth login -h github.com`")
    ));
  }

  return deduped;
}

function buildPostDeployCommands(result) {
  const outputsDir = `deployment/${result.environment}`;
  const backendOutputsFile = `${outputsDir}/backend-outputs.json`;
  const frontendOutputsFile = `${outputsDir}/frontend-outputs.json`;
  const summaryFile = `${outputsDir}/deployment-summary.json`;
  const ensureOutputsDir = `mkdir -p ${outputsDir}`;
  const verifyBase = [
    "yarn verify:split-stack --",
    `--region=${result.region}`,
    `--backend-stack-name=${result.stackNames.backend}`,
    `--frontend-stack-name=${result.stackNames.frontend}`,
  ];

  const commands = {
    verify: verifyBase.join(" "),
    verifyWithHttp: [...verifyBase, "--check-http=true"].join(" "),
    saveOutputsWithHelper: `yarn save:split-stack-outputs -- --environment=${result.environment} --region=${result.region}`,
    showSavedSummary: `yarn show:deployment-summary -- --summary-file=${summaryFile} --output=markdown`,
    ensureOutputsDir,
    saveBackendOutputs: [
      ensureOutputsDir,
      "&& aws cloudformation describe-stacks",
      `--stack-name ${result.stackNames.backend}`,
      `--region ${result.region}`,
      "--output json",
      `> ${backendOutputsFile}`,
    ].join(" "),
    saveFrontendOutputs: [
      ensureOutputsDir,
      "&& aws cloudformation describe-stacks",
      `--stack-name ${result.stackNames.frontend}`,
      `--region ${result.region}`,
      "--output json",
      `> ${frontendOutputsFile}`,
    ].join(" "),
    verifyFromSavedOutputs: [
      "yarn verify:split-stack --",
      `--region=${result.region}`,
      `--backend-outputs-file=${backendOutputsFile}`,
      `--frontend-outputs-file=${frontendOutputsFile}`,
    ].join(" "),
    verifyFromSavedOutputsWithHttp: [
      "yarn verify:split-stack --",
      `--region=${result.region}`,
      `--backend-outputs-file=${backendOutputsFile}`,
      `--frontend-outputs-file=${frontendOutputsFile}`,
      "--check-http=true",
    ].join(" "),
    publishFromSavedOutputs: [
      "yarn deploy:aws --",
      `--region=${result.region}`,
      `--project-name=${result.projectName}`,
      `--environment=${result.environment}`,
      `--frontend-parameters-file=${result.environmentDir}/frontend-parameters.json`,
      `--backend-parameters-file=${result.environmentDir}/backend-parameters.json`,
      `--frontend-outputs-file=${frontendOutputsFile}`,
      `--backend-outputs-file=${backendOutputsFile}`,
      "--skip-backend",
      "--skip-frontend",
      "--publish-frontend-assets",
    ].join(" "),
    publishFrontendAssetsFromSavedOutputs: [
      "yarn publish:frontend-assets --",
      `--frontend-outputs-file=${frontendOutputsFile}`,
      `--backend-outputs-file=${backendOutputsFile}`,
    ].join(" "),
    checklist: "Open infrastructure/environments/first-rollout-checklist.md and work through the post-deploy checks.",
  };

  return commands;
}

function buildPreflightCommands(result, options) {
  const environmentDirCliArg = options.environmentDirArg ? ` --environment-dir=${options.environmentDirArg}` : "";
  const commands = {
    auditStarter: `yarn audit:environment-starter -- --environment=${result.environment}${environmentDirCliArg} --only-blockers=true --output=markdown`,
  };

  if (options.deploymentSource === "api-repo") {
    commands.auditApiRepoContract = `yarn audit:api-repo-contract -- --api-repo-path=${options.apiRepoPath} --output=markdown`;
  }

  return commands;
}

function buildLocalFallbackCommands(result, options) {
  if (options.deploymentSource !== "api-repo") return null;

  const localBlockers = result.localExecution?.blockers || [];
  const hasUnreadableApiRepoBlocker = localBlockers.some((entry) => String(entry).includes("Local api-repo path is not readable from this workspace:"))
    || localBlockers.some((entry) => String(entry).includes("Local api-repo package.json is not readable from this workspace:"));

  if (!hasUnreadableApiRepoBlocker) return null;

  return {
    packageManifestPlan: `yarn plan:environment-deploy -- --environment=${result.environment} --deployment-source=package-manifest --package-manifest-file=<manifest-path> --region=${result.region} --output=markdown`,
    packageManifestLocal: buildEnvCommand({
      AWS_REGION: result.region,
      PACKAGE_MANIFEST_FILE: "<manifest-path>",
      SYNC_APP_CONFIG_SECRET: options.syncAppConfigSecret ? "true" : "false",
      RUN_API_MIGRATIONS: options.runApiMigrations ? "true" : "false",
      ...(options.runApiMigrations ? {
        API_MIGRATION_ACTION: options.apiMigrationAction,
        API_MIGRATION_MODULE: options.apiMigrationModule,
        API_MIGRATION_RUNNER: options.apiMigrationRunner || "direct",
      } : {}),
      VERIFY_HTTP_AFTER_DEPLOY: options.verifyHttpAfterDeploy ? "true" : "false",
    }, `./infrastructure/environments/${result.environment}/deploy-split-stack.sh`),
    backendArtifactPlan: `yarn plan:environment-deploy -- --environment=${result.environment} --deployment-source=backend-artifact --backend-artifact-source-file=<backend-zip-path> --region=${result.region} --output=markdown`,
    backendArtifactLocal: buildEnvCommand({
      AWS_REGION: result.region,
      BACKEND_ARTIFACT_SOURCE_FILE: "<backend-zip-path>",
      SYNC_APP_CONFIG_SECRET: options.syncAppConfigSecret ? "true" : "false",
      RUN_API_MIGRATIONS: options.runApiMigrations ? "true" : "false",
      ...(options.runApiMigrations ? {
        API_MIGRATION_ACTION: options.apiMigrationAction,
        API_MIGRATION_MODULE: options.apiMigrationModule,
        API_MIGRATION_RUNNER: options.apiMigrationRunner || "direct",
      } : {}),
      VERIFY_HTTP_AFTER_DEPLOY: options.verifyHttpAfterDeploy ? "true" : "false",
    }, `./infrastructure/environments/${result.environment}/deploy-split-stack.sh`),
  };
}

function buildGithubPostDeploy(result) {
  return {
    artifactName: `aws-${result.environment}-deployment-evidence`,
    artifactPath: `deployment/${result.environment}/`,
    failureArtifactName: `aws-${result.environment}-preflight-plan`,
    failureArtifactPath: `deployment/${result.environment}/preflight-plan.md`,
    summaryIncludes: [
      "preflight deploy plan",
      "resolved stack names",
      "API base URL",
      "frontend app URL",
      "saved-output follow-up commands",
    ],
    note: "After a successful GitHub Actions run, review the job summary for the preflight plan plus resolved values and download the deployment-evidence artifact if you need the saved output files outside the runner. If the deploy step fails earlier, GitHub still uploads the preflight-plan artifact so the computed blocker list is recoverable.",
  };
}

function buildGithubSecretSyncCommand(result) {
  if (!result.appConfigSecretFilePresent) return "";

  return [
    "yarn sync:github-app-config-secret --",
    `--environment=${result.environment}`,
    ...(result.environmentDirArg ? [`--environment-dir=${result.environmentDirArg}`] : []),
    `--secret-file=${result.environmentDir}/app-config-secret.json`,
  ].join(" ");
}

function renderMarkdown(result) {
  const lines = [
    `# Environment Deploy Plan: ${result.environment}`,
    "",
    `- Status: ${result.ok ? "ready" : "blocked"}`,
    `- Environment dir: \`${result.environmentDir}\``,
    `- Deployment source: \`${result.deploymentSource}\``,
    `- GitHub auth mode: \`${result.githubAuthMode}\``,
    `- Starter blockers: ${result.starterSummary.blockerCount}`,
    `- Input blockers: ${result.inputBlockers.length}`,
    `- Local execution blockers: ${result.localExecution.blockerCount}`,
    `- GitHub execution blockers: ${result.githubActionsExecution.blockerCount}`,
    `- Local GitHub dispatch blockers: ${result.localGithubDispatch.blockerCount}`,
    `- Warnings: ${result.warnings.length}`,
    `- App config secret file present: ${result.appConfigSecretFilePresent ? "yes" : "no"}`,
  ];

  lines.push(`- Recommended path: \`${result.recommendedExecution.path}\``);
  lines.push(`- Recommendation reason: ${result.recommendedExecution.reason}`);

  lines.push("", "## Stack Names", "");
  lines.push(`- Bootstrap: \`${result.stackNames.bootstrap}\``);
  lines.push(`- Backend: \`${result.stackNames.backend}\``);
  lines.push(`- Frontend: \`${result.stackNames.frontend}\``);

  if (result.blockers.length > 0) {
    lines.push("", "## Blockers", "");
    result.blockers.forEach((blocker) => {
      lines.push(`- ${blocker.summary}`);
      if (blocker.file) {
        lines.push(`  File: \`${blocker.file}\``);
      }
    });
  }

  if (result.warnings.length > 0) {
    lines.push("", "## Warnings", "");
    result.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  lines.push("", "## Execution Readiness", "");
  lines.push(`- Local: ${result.localExecution.ok ? "ready" : "blocked"}`);
  result.localExecution.blockers.forEach((blocker) => lines.push(`  Local blocker: ${blocker}`));
  lines.push(`- GitHub Actions: ${result.githubActionsExecution.ok ? "ready" : "blocked"}`);
  result.githubActionsExecution.blockers.forEach((blocker) => lines.push(`  GitHub blocker: ${blocker}`));
  lines.push(`- Local GitHub dispatch: ${result.localGithubDispatch.ok ? "ready" : "blocked"}`);
  result.localGithubDispatch.blockers.forEach((blocker) => lines.push(`  Local GitHub dispatch blocker: ${blocker}`));

  lines.push("", "## Recommendation", "");
  lines.push(`- Path: \`${result.recommendedExecution.path}\``);
  lines.push(`- Why: ${result.recommendedExecution.reason}`);
  lines.push(`- Primary command: \`${result.recommendedCommands.primary}\``);
  result.recommendedCommands.alternates.forEach((command) => lines.push(`- Alternate command: \`${command}\``));

  if (result.localFallbackCommands) {
    lines.push("", "## Local Fallbacks", "");
    lines.push(`- Manifest plan: \`${result.localFallbackCommands.packageManifestPlan}\``);
    lines.push(`- Manifest local run: \`${result.localFallbackCommands.packageManifestLocal}\``);
    lines.push(`- Backend-artifact plan: \`${result.localFallbackCommands.backendArtifactPlan}\``);
    lines.push(`- Backend-artifact local run: \`${result.localFallbackCommands.backendArtifactLocal}\``);
  }

  if (result.starterSummary.blockerCount > 0) {
    lines.push("", "## Starter Prep", "");
    lines.push(`- Dry-run prep: \`${result.starterPrepCommands.dryRun}\``);
    lines.push(`- Prep follow-up commands: \`${result.starterPrepCommands.commands}\``);
    lines.push(`- Markdown prep runbook: \`${result.starterPrepCommands.markdown}\``);
    lines.push(`- Apply starter changes: \`${result.starterPrepCommands.write}\``);
  }

  lines.push("", "## Preflight", "");
  lines.push(`- Starter audit: \`${result.preflightCommands.auditStarter}\``);
  if (result.preflightCommands.auditApiRepoContract) {
    lines.push(`- Api repo contract audit: \`${result.preflightCommands.auditApiRepoContract}\``);
  }

  lines.push("", "## Post-Deploy Follow-Up", "");
  lines.push(`- Verify stacks and outputs: \`${result.postDeployCommands.verify}\``);
  lines.push(`- Verify with HTTP probe: \`${result.postDeployCommands.verifyWithHttp}\``);
  lines.push(`- Save outputs with helper: \`${result.postDeployCommands.saveOutputsWithHelper}\``);
  lines.push(`- Show saved deployment summary: \`${result.postDeployCommands.showSavedSummary}\``);
  lines.push(`- Create outputs folder: \`${result.postDeployCommands.ensureOutputsDir}\``);
  lines.push(`- Save backend outputs: \`${result.postDeployCommands.saveBackendOutputs}\``);
  lines.push(`- Save frontend outputs: \`${result.postDeployCommands.saveFrontendOutputs}\``);
  lines.push(`- Verify from saved outputs: \`${result.postDeployCommands.verifyFromSavedOutputs}\``);
  lines.push(`- Verify from saved outputs with HTTP probe: \`${result.postDeployCommands.verifyFromSavedOutputsWithHttp}\``);
  lines.push(`- Publish later from saved outputs: \`${result.postDeployCommands.publishFromSavedOutputs}\``);
  lines.push(`- Publish assets directly from saved outputs: \`${result.postDeployCommands.publishFrontendAssetsFromSavedOutputs}\``);
  lines.push(`- Checklist: ${result.postDeployCommands.checklist}`);

  lines.push("", "## Local Run", "");
  lines.push(`- Audit: \`${result.commands.audit}\``);
  lines.push(`- Preview-only: \`${result.commands.localPreview}\``);
  lines.push(`- Deploy: \`${result.commands.local}\``);

  lines.push("", "## GitHub Actions Run", "");
  lines.push(`- Environment: \`${result.workflowEnvironmentName}\``);
  lines.push(`- Local dispatch from this machine: ${result.localGithubDispatch.ok ? "ready" : "blocked"}`);
  result.localGithubDispatch.blockers.forEach((blocker) => lines.push(`- Local dispatch blocker: ${blocker}`));
  lines.push(`- Dispatch preview wrapper: \`${result.commands.githubActionsWrapperPreview}\``);
  lines.push(`- Raw preview dispatch: \`${result.commands.githubActionsPreview}\``);
  lines.push(`- Dispatch wrapper: \`${result.commands.githubActionsWrapper}\``);
  lines.push(`- Raw dispatch: \`${result.commands.githubActions}\``);
  if (result.githubSecretSyncCommand) {
    lines.push(`- Sync app-config JSON into GitHub secret: \`${result.githubSecretSyncCommand}\``);
  }
  lines.push(`- Post-deploy artifact: \`${result.githubPostDeploy.artifactName}\``);
  lines.push(`- Artifact path inside run: \`${result.githubPostDeploy.artifactPath}\``);
  lines.push(`- Failure artifact: \`${result.githubPostDeploy.failureArtifactName}\``);
  lines.push(`- Failure artifact path inside run: \`${result.githubPostDeploy.failureArtifactPath}\``);
  lines.push(`- Job summary includes: ${result.githubPostDeploy.summaryIncludes.join(", ")}`);
  lines.push(`- Post-deploy note: ${result.githubPostDeploy.note}`);

  if (result.requiredGithubSecrets.length > 0) {
    lines.push("", "## GitHub Secrets", "");
    result.requiredGithubSecrets.forEach((secretName) => lines.push(`- Required: \`${secretName}\``));
    result.optionalGithubSecrets.forEach((secretName) => lines.push(`- Optional: \`${secretName}\``));
    if (result.githubSecretSyncCommand) {
      lines.push(`- Sync helper: \`${result.githubSecretSyncCommand}\``);
    }
  }

  if (result.nextSteps.length > 0) {
    lines.push("", "## Next Steps", "");
    result.nextSteps.forEach((step) => lines.push(`- ${step}`));
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function main() {
  const environment = getArg("environment", "staging");
  const environmentDirArg = getArg("environment-dir");
  const environmentDir = resolveEnvironmentDir(environment, environmentDirArg);
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";
  const markdownOutput = outputMode === "markdown" || outputMode === "md";
  const commandsOutput = outputMode === "commands" || outputMode === "shell";
  const deploymentSource = getArg("deployment-source", "api-repo");
  const githubAuthMode = getArg("github-auth-mode", "oidc");
  const region = getArg("region", "us-east-1");
  const apiRepoPath = getArg("api-repo-path", "../Api");
  const b1adminRepo = getArg("b1admin-repo", "ChurchApps/B1Admin");
  const b1adminRef = getArg("b1admin-ref", "main");
  const apiRepo = getArg("api-repo", "ChurchApps/Api");
  const apiRef = getArg("api-ref", "main");
  const packageManifestFile = getArg("package-manifest-file");
  const backendArtifactSourceFile = getArg("backend-artifact-source-file");
  const migrationArtifactSourceFile = getArg("migration-artifact-source-file");
  const dependenciesLayerSourceFile = getArg("dependencies-layer-source-file");
  const syncAppConfigSecret = getArg("sync-app-config-secret", "false").toLowerCase() === "true";
  const syncBootstrapAdminSecret = getArg("sync-bootstrap-admin-secret", "false").toLowerCase() === "true";
  const runApiMigrations = getArg("run-api-migrations", "false").toLowerCase() === "true";
  const runBootstrapAdmin = getArg("run-bootstrap-admin", "false").toLowerCase() === "true";
  const apiMigrationAction = getArg("api-migration-action", "up");
  const apiMigrationModule = getArg("api-migration-module", "all");
  const apiMigrationRunner = getArg("api-migration-runner", "direct");
  const verifyHttpAfterDeploy = getArg("verify-http-after-deploy", "false").toLowerCase() === "true";
  const accountId = getArg("account-id");

  if (!fs.existsSync(environmentDir)) {
    const message = `Unknown environment starter "${environment}".`;
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify({ ok: false, environment, errors: [message] }, null, 2)}\n`);
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  const bootstrap = readJson(path.join(environmentDir, "bootstrap-parameters.json"));
  const projectName = bootstrap.ProjectName || "b1admin";
  const environmentName = bootstrap.EnvironmentName || environment;
  const stackPrefix = `${projectName}-${environmentName}`;
  const secretPath = path.join(environmentDir, "app-config-secret.json");
  const audit = readStarterAudit(environment, environmentDirArg);

  const options = {
    environment,
    region,
    deploymentSource,
    environmentDir,
    environmentDirArg,
    githubAuthMode,
    apiRepoPath,
    b1adminRepo,
    b1adminRef,
    apiRepo,
    apiRef,
    packageManifestFile,
    backendArtifactSourceFile,
    migrationArtifactSourceFile,
    dependenciesLayerSourceFile,
    syncAppConfigSecret,
    syncBootstrapAdminSecret,
    runApiMigrations,
    runBootstrapAdmin,
    apiMigrationAction,
    apiMigrationModule,
    apiMigrationRunner,
    verifyHttpAfterDeploy,
    accountId,
  };

  const inputBlockers = buildInputBlockers(deploymentSource, options);
  const localExecutionBlockers = buildLocalExecutionBlockers(deploymentSource, environmentDir, options);
  const githubExecutionBlockers = buildGithubExecutionBlockers(audit.parsed, options);
  const warnings = buildWarnings(options);
  const localEnv = buildLocalEnv(options);
  const workflowInputs = buildWorkflowInputs(options);
  const requiredGithubSecrets = buildRequiredGithubSecrets(options);
  const optionalGithubSecrets = buildOptionalGithubSecrets(options);
  const localGithubDispatch = getLocalGithubDispatchReadiness();

  const starterBlockers = (audit.parsed.files || []).flatMap((fileAudit) => {
    const keys = [
      ...(fileAudit.placeholders || []).map((entry) => entry.key),
      ...(fileAudit.unsafeDefaults || []).map((entry) => entry.key),
      ...(fileAudit.requiredBlankValues || []).map((entry) => entry.key),
    ];

    if (keys.length === 0) return [];

    return [{
      type: "starter-file",
      file: fileAudit.relativePath,
      keys,
      summary: `Resolve ${keys.length} blocker value${keys.length === 1 ? "" : "s"} in ${fileAudit.relativePath}: ${keys.join(", ")}`,
    }];
  });

  const blockers = [
    ...starterBlockers,
    ...inputBlockers.map((message) => ({
      type: "input",
      file: "",
      keys: [],
      summary: message,
    })),
  ];
  const sharedExecutionBlockers = blockers.map((entry) => entry.summary);

  const result = {
    ok: blockers.length === 0,
    region,
    environment,
    projectName,
    environmentDir: path.relative(rootDir, environmentDir),
    environmentDirArg,
    deploymentSource,
    githubAuthMode,
    workflowEnvironmentName: `aws-${environment}`,
    appConfigSecretFilePresent: fs.existsSync(secretPath),
    stackNames: {
      bootstrap: `${stackPrefix}-bootstrap`,
      backend: `${stackPrefix}-backend`,
      frontend: `${stackPrefix}-frontend`,
    },
    starterSummary: audit.parsed.blockerSummary || {
      placeholderCount: 0,
      requiredBlankCount: 0,
      blockerCount: 0,
    },
    inputBlockers,
    warnings,
    blockers,
    localExecution: {
      ok: blockers.length === 0 && localExecutionBlockers.length === 0,
      blockerCount: sharedExecutionBlockers.length + localExecutionBlockers.length,
      blockers: [...sharedExecutionBlockers, ...localExecutionBlockers],
    },
    githubActionsExecution: {
      ok: blockers.length === 0 && githubExecutionBlockers.length === 0,
      blockerCount: sharedExecutionBlockers.length + githubExecutionBlockers.length,
      blockers: [...sharedExecutionBlockers, ...githubExecutionBlockers],
    },
    localGithubDispatch,
    localEnv,
    workflowInputs,
    requiredGithubSecrets,
    optionalGithubSecrets,
    commands: {
      audit: `yarn audit:environment-starter -- --environment=${environment}${environmentDirArg ? ` --environment-dir=${environmentDirArg}` : ""} --only-blockers=true --output=markdown`,
      local: buildEnvCommand(localEnv, `./infrastructure/environments/${environment}/deploy-split-stack.sh`),
      localPreview: buildEnvCommand({ ...localEnv, PREVIEW_ONLY: "true" }, `./infrastructure/environments/${environment}/deploy-split-stack.sh`),
      githubActionsWrapper: buildGithubDispatchWrapperCommand(options),
      githubActionsWrapperPreview: buildGithubDispatchWrapperCommand(options, ["--preview-only=true"]),
      githubActions: buildGhWorkflowCommand(workflowInputs),
      githubActionsPreview: buildGhWorkflowCommand(workflowInputs, { preview_only: "true" }),
    },
    starterPrepCommands: buildStarterPrepCommands(environment, accountId, environmentDirArg),
    nextSteps: [
      blockers.length > 0
        ? "Run the starter prep helper, review the proposed file changes, and then clear any remaining blocker values before the first live deployment."
        : localExecutionBlockers.length > 0
          ? "Starter files are ready, but fix the local execution blockers before relying on the local deploy command."
          : "Run either the local deploy script or the GitHub Actions workflow with the command below.",
      "Save the backend and frontend outputs after staging so prod can reuse the proven values.",
      syncAppConfigSecret
        ? "Make sure the same app-config-secret JSON is available locally or in the GitHub Environment secret before deploy."
        : appConfigSecretRequiresRunnerMaterialization(audit.parsed)
          ? "If you want the GitHub Actions path, enable sync-app-config-secret and set AWS_APP_CONFIG_SECRET_JSON in the GitHub Environment so the runner can recreate app-config-secret.json."
          : "Decide whether app-config-secret should be synced on the first live run or introduced later.",
    ],
  };
  result.recommendedExecution = buildRecommendedExecutionPath(blockers, result.localExecution, result.githubActionsExecution);
  result.preflightCommands = buildPreflightCommands(result, options);
  result.postDeployCommands = buildPostDeployCommands(result);
  result.githubPostDeploy = buildGithubPostDeploy(result);
  result.githubSecretSyncCommand = buildGithubSecretSyncCommand(result);
  result.localFallbackCommands = buildLocalFallbackCommands(result, options);
  if (result.localFallbackCommands) {
    result.nextSteps.splice(1, 0,
      "If the local Api repo is unreadable here, switch the local run to package-manifest or backend-artifact mode with the fallback commands below.",
    );
  }
  if (appConfigSecretRequiresRunnerMaterialization(audit.parsed) && result.githubSecretSyncCommand) {
    result.nextSteps.splice(2, 0,
      `If you want the GitHub Actions path, run \`${result.githubSecretSyncCommand}\` to populate \`AWS_APP_CONFIG_SECRET_JSON\` from this checkout.`,
    );
  }
  if (result.githubActionsExecution.ok && !result.localGithubDispatch.ok) {
    result.nextSteps.splice(1, 0,
      "If you plan to dispatch the GitHub Actions workflow from this machine, fix the local `gh` login first with `gh auth login -h github.com`.",
    );
  }
  result.recommendedCommands = buildRecommendedCommands(result);
  if (blockers.length === 0 && result.recommendedCommands.primary === "gh auth login -h github.com") {
    result.nextSteps[0] = "Run `gh auth login -h github.com` first so this machine can dispatch the GitHub Actions workflow before you rely on the GitHub path.";
  } else if (
    blockers.length === 0
    && result.recommendedExecution.path === "none"
    && appConfigSecretRequiresRunnerMaterialization(audit.parsed)
    && result.githubSecretSyncCommand
  ) {
    result.nextSteps[0] = `Run \`${result.githubSecretSyncCommand}\` first if you want the GitHub Actions path, then re-run the deploy plan or dispatch helper.`;
  }
  result.nextSteps = normalizeNextSteps(result.nextSteps);

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (markdownOutput) {
    process.stdout.write(renderMarkdown(result));
  } else if (commandsOutput) {
    process.stdout.write(`${result.recommendedCommands.primary}\n`);
    result.recommendedCommands.alternates.forEach((command) => process.stdout.write(`${command}\n`));
    if (result.localFallbackCommands) {
      process.stdout.write(`${result.localFallbackCommands.packageManifestPlan}\n`);
      process.stdout.write(`${result.localFallbackCommands.packageManifestLocal}\n`);
      process.stdout.write(`${result.localFallbackCommands.backendArtifactPlan}\n`);
      process.stdout.write(`${result.localFallbackCommands.backendArtifactLocal}\n`);
    }
    if (result.starterSummary.blockerCount > 0) {
      process.stdout.write(`${result.starterPrepCommands.markdown}\n`);
    }
    process.stdout.write(`${result.preflightCommands.auditStarter}\n`);
    if (result.preflightCommands.auditApiRepoContract) {
      process.stdout.write(`${result.preflightCommands.auditApiRepoContract}\n`);
    }
    if (result.githubSecretSyncCommand) {
      process.stdout.write(`${result.githubSecretSyncCommand}\n`);
    }
    process.stdout.write(`${result.commands.localPreview}\n`);
    process.stdout.write(`${result.commands.githubActionsWrapperPreview}\n`);
    process.stdout.write(`${result.commands.githubActionsPreview}\n`);
    process.stdout.write(`${result.commands.githubActions}\n`);
    process.stdout.write(`${result.postDeployCommands.verify}\n`);
    process.stdout.write(`${result.postDeployCommands.verifyWithHttp}\n`);
    process.stdout.write(`${result.postDeployCommands.saveOutputsWithHelper}\n`);
    process.stdout.write(`${result.postDeployCommands.showSavedSummary}\n`);
    process.stdout.write(`${result.postDeployCommands.ensureOutputsDir}\n`);
    process.stdout.write(`${result.postDeployCommands.saveBackendOutputs}\n`);
    process.stdout.write(`${result.postDeployCommands.saveFrontendOutputs}\n`);
    process.stdout.write(`${result.postDeployCommands.verifyFromSavedOutputs}\n`);
    process.stdout.write(`${result.postDeployCommands.verifyFromSavedOutputsWithHttp}\n`);
    process.stdout.write(`${result.postDeployCommands.publishFromSavedOutputs}\n`);
    process.stdout.write(`${result.postDeployCommands.publishFrontendAssetsFromSavedOutputs}\n`);
  } else {
    console.log(`Planned environment deploy: ${environment}`);
    console.log(`Status: ${result.ok ? "ready" : "blocked"}`);
    console.log(`Deployment source: ${deploymentSource}`);
    console.log(`GitHub auth mode: ${githubAuthMode}`);
    console.log(`Starter blockers: ${result.starterSummary.blockerCount}`);
    console.log(`Input blockers: ${inputBlockers.length}`);
    console.log(`Local execution blockers: ${result.localExecution.blockerCount}`);
    console.log(`GitHub execution blockers: ${result.githubActionsExecution.blockerCount}`);
    console.log(`Local GitHub dispatch blockers: ${result.localGithubDispatch.blockerCount}`);
    console.log(`Recommended path: ${result.recommendedExecution.path}`);
    console.log(`Recommendation reason: ${result.recommendedExecution.reason}`);
    console.log(`Primary command: ${result.recommendedCommands.primary}`);
    if (result.localFallbackCommands) {
      console.log(`Manifest fallback plan: ${result.localFallbackCommands.packageManifestPlan}`);
      console.log(`Manifest fallback local run: ${result.localFallbackCommands.packageManifestLocal}`);
      console.log(`Backend-artifact fallback plan: ${result.localFallbackCommands.backendArtifactPlan}`);
      console.log(`Backend-artifact fallback local run: ${result.localFallbackCommands.backendArtifactLocal}`);
    }
    if (result.starterSummary.blockerCount > 0) {
      console.log(`Starter prep dry run: ${result.starterPrepCommands.dryRun}`);
      console.log(`Starter prep apply: ${result.starterPrepCommands.write}`);
    }
    console.log(`Starter audit: ${result.preflightCommands.auditStarter}`);
    if (result.preflightCommands.auditApiRepoContract) {
      console.log(`Api repo contract audit: ${result.preflightCommands.auditApiRepoContract}`);
    }
    console.log(`Local GitHub dispatch: ${result.localGithubDispatch.ok ? "ready" : "blocked"}`);
    console.log(`Post-deploy verify: ${result.postDeployCommands.verify}`);
    console.log(`GitHub post-deploy artifact: ${result.githubPostDeploy.artifactName}`);
    console.log(`GitHub failure artifact: ${result.githubPostDeploy.failureArtifactName}`);
    console.log(`Save outputs with helper: ${result.postDeployCommands.saveOutputsWithHelper}`);
    console.log(`Show saved deployment summary: ${result.postDeployCommands.showSavedSummary}`);
    console.log(`Create outputs folder: ${result.postDeployCommands.ensureOutputsDir}`);
    console.log(`Save backend outputs: ${result.postDeployCommands.saveBackendOutputs}`);
    console.log(`Save frontend outputs: ${result.postDeployCommands.saveFrontendOutputs}`);
    console.log(`Verify from saved outputs: ${result.postDeployCommands.verifyFromSavedOutputs}`);
    console.log(`Publish later from saved outputs: ${result.postDeployCommands.publishFromSavedOutputs}`);
    if (warnings.length > 0) {
      console.log("Warnings:");
      warnings.forEach((warning) => console.log(`- ${warning}`));
    }
    console.log("Commands:");
    console.log(`- Audit: ${result.commands.audit}`);
    console.log(`- Local preview-only: ${result.commands.localPreview}`);
    console.log(`- Local: ${result.commands.local}`);
    console.log(`- GitHub Actions preview wrapper: ${result.commands.githubActionsWrapperPreview}`);
    console.log(`- GitHub Actions preview raw: ${result.commands.githubActionsPreview}`);
    console.log(`- GitHub Actions wrapper: ${result.commands.githubActionsWrapper}`);
    console.log(`- GitHub Actions raw: ${result.commands.githubActions}`);
  }

  if (!result.ok) {
    process.exit(1);
  }
}

main();
