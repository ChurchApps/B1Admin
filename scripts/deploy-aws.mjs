import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProgressLogger } from "./lib/progress-utils.mjs";

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

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function getBooleanArgString(name, fallback = "") {
  return hasFlag(name) ? "true" : getArg(name, fallback);
}

function exitForCommandError(error, quiet = false) {
  if (error && typeof error === "object") {
    if (quiet && error.stdout) process.stderr.write(String(error.stdout));
    if (quiet && error.stderr) process.stderr.write(String(error.stderr));
    const status = typeof error.status === "number" ? error.status : 1;
    process.exit(status);
  }

  process.exit(1);
}

function run(scriptPath, args, options = {}) {
  const { quiet = false, ...execOptions } = options;
  if (!quiet) console.log(`\n> node ${scriptPath} ${args.join(" ")}`);

  try {
    return execFileSync("node", [scriptPath, ...args], {
      cwd: rootDir,
      stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit",
      encoding: quiet ? "utf8" : undefined,
      maxBuffer: quiet ? 20 * 1024 * 1024 : undefined,
      ...execOptions,
    });
  } catch (error) {
    exitForCommandError(error, quiet);
  }
}

function runNodeJson(scriptPath, args) {
  try {
    return JSON.parse(execFileSync("node", [scriptPath, ...args], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 20 * 1024 * 1024,
    }));
  } catch (error) {
    exitForCommandError(error, true);
  }
}

function runJson(command, args) {
  return JSON.parse(execFileSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  }));
}

function addArg(args, name, value) {
  if (value !== undefined && value !== null && value !== "") {
    args.push(`--${name}=${value}`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function deriveArtifactKey(projectName, environmentName, fileName) {
  return `${projectName}/${environmentName}/backend/${fileName}`;
}

function ensureFrontendPublishPrerequisites(skipBuild) {
  const distDir = path.join(rootDir, "dist");
  const serviceWorkerPath = path.join(distDir, "sw.js");

  if (skipBuild) {
    if (!fs.existsSync(distDir)) {
      fail(`Build output not found: ${distDir}`);
    }
    if (!fs.existsSync(serviceWorkerPath)) {
      fail(`Expected service worker not found: ${serviceWorkerPath}`);
    }
    return;
  }

  const nodeModulesPath = path.join(rootDir, "node_modules");
  const viteCliPath = path.join(nodeModulesPath, "vite", "dist", "node", "cli.js");
  if (!fs.existsSync(nodeModulesPath) || !fs.existsSync(viteCliPath)) {
    fail(`Frontend dependencies are not installed: ${nodeModulesPath}`);
  }
}

function loadApiRepoMigrationDirectories(apiRepoPath) {
  const migrationsRoot = path.join(apiRepoPath, "tools", "migrations");
  if (!fs.existsSync(migrationsRoot)) return [];

  try {
    return fs.readdirSync(migrationsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not read API migration directories from "${migrationsRoot}": ${message}`);
  }
}

function validateApiMigrationArgs(action, moduleName) {
  const validActions = ["up", "down", "status"];
  const validModules = ["all", "membership", "attendance", "content", "giving", "messaging", "doing", "reporting"];

  if (action && !validActions.includes(action)) {
    fail(`Invalid api-migration-action "${action}". Use up, down, or status.`);
  }

  if (moduleName && !validModules.includes(moduleName)) {
    fail(`Invalid api-migration-module "${moduleName}". Use all, membership, attendance, content, giving, messaging, doing, or reporting.`);
  }
}

function validateApiMigrationRunner(runner) {
  if (runner && !["direct", "data-api"].includes(runner)) {
    fail(`Invalid api-migration-runner "${runner}". Use direct or data-api.`);
  }
}

function normalizeOutputs(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) return Object.fromEntries(raw.map((output) => [output.OutputKey, output.OutputValue]));
  if (raw.Stacks?.[0]?.Outputs) return normalizeOutputs(raw.Stacks[0].Outputs);
  if (raw.Outputs) return normalizeOutputs(raw.Outputs);
  return raw;
}

function normalizeParameters(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) return Object.fromEntries(raw.map((parameter) => [parameter.ParameterKey, parameter.ParameterValue]));
  if (raw.Stacks?.[0]?.Parameters) return normalizeParameters(raw.Stacks[0].Parameters);
  if (raw.Parameters) return normalizeParameters(raw.Parameters);
  return raw;
}

function describeStackSafe(stackName, region) {
  try {
    return runJson("aws", [
      "cloudformation",
      "describe-stacks",
      "--stack-name",
      stackName,
      "--region",
      region,
      "--output",
      "json",
    ]);
  } catch (error) {
    const stderr = String(error?.stderr || "");
    if (stderr.includes("does not exist")) return null;
    throw error;
  }
}

function getStackOutputs(stackName, region) {
  const response = runJson("aws", [
    "cloudformation",
    "describe-stacks",
    "--stack-name",
    stackName,
    "--region",
    region,
    "--output",
    "json",
  ]);

  return normalizeOutputs(response);
}

function getStackOutputsSafe(stackName, region, label) {
  if (!stackName) return {};

  try {
    return getStackOutputs(stackName, region);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not read ${label} "${stackName}": ${message}`);
  }
}

function getStackParametersSafe(stackName, region, label) {
  if (!stackName) return {};

  try {
    return normalizeParameters(describeStackSafe(stackName, region));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not read ${label} "${stackName}" parameters: ${message}`);
  }
}

function loadJson(filePath, label = "JSON file") {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not load ${label} "${filePath}": ${message}`);
  }
}

function resolveManifestArtifactPath(manifestFilePath, artifactPath) {
  if (!artifactPath) return "";
  if (path.isAbsolute(artifactPath)) return artifactPath;
  return path.resolve(path.dirname(manifestFilePath), artifactPath);
}

function loadParamsFromFile(filePath) {
  if (!filePath) return {};

  try {
    const resolved = path.resolve(rootDir, filePath);
    const data = JSON.parse(fs.readFileSync(resolved, "utf8"));

    if (Array.isArray(data)) {
      return Object.fromEntries(data.map((item) => [item.ParameterKey, item.ParameterValue]));
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not load parameters file "${filePath}": ${message}`);
  }
}

function main() {
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const cloudformationExecutionRoleArn = getArg("cloudformation-execution-role-arn", process.env.CLOUDFORMATION_EXECUTION_ROLE_ARN || "");
  const backendParametersFile = getArg("backend-parameters-file");
  const frontendParametersFile = getArg("frontend-parameters-file");
  const backendFileParams = loadParamsFromFile(backendParametersFile);
  const frontendFileParams = loadParamsFromFile(frontendParametersFile);
  const environment = getArg("environment", backendFileParams.EnvironmentName || frontendFileParams.EnvironmentName || "prod");
  const projectName = getArg("project-name", backendFileParams.ProjectName || frontendFileParams.ProjectName || "b1admin");
  const bootstrapStackName = getArg("bootstrap-stack-name");
  const backendStackName = getArg("backend-stack-name", `${projectName}-${environment}-backend`);
  const backendOutputsFile = getArg("backend-outputs-file");
  const frontendStackName = getArg("frontend-stack-name", `${projectName}-${environment}-frontend`);
  const packageManifestFile = getArg("package-manifest-file");
  const frontendOutputsFile = getArg("frontend-outputs-file");
  const frontendPublishBucket = getArg("bucket");
  const frontendPublishDistributionId = getArg("distribution-id");
  const frontendPublishAppUrl = getArg("app-url");
  const apiRepoPath = getArg("api-repo-path");
  const packageApiBackend = !packageManifestFile && (apiRepoPath !== "" || getArg("package-api-backend", "false").toLowerCase() === "true");
  const packageMode = getArg("package-mode", "self-contained");
  const packageOutputDir = getArg("package-output-dir", "infrastructure/artifacts/api");
  const packageBuild = getArg("package-build", "true");
  const packageBuildLayer = getArg("package-build-layer", packageMode === "layered" ? "true" : "false");
  const backendArtifactSourceFile = getArg("backend-artifact-source-file");
  const backendArtifactKey = getArg("backend-artifact-key");
  const migrationArtifactSourceFile = getArg("migration-artifact-source-file");
  const lambdaCodeS3Bucket = getArg("lambda-code-s3-bucket");
  let resolvedLambdaCodeS3Key = getArg("lambda-code-s3-key", backendArtifactKey);
  const runMigrations = getArg("run-migrations");
  const migrationCodeS3Bucket = getArg("migration-code-s3-bucket");
  let resolvedMigrationCodeS3Key = getArg("migration-code-s3-key");
  const migrationHandler = getArg("migration-handler");
  const migrationRuntime = getArg("migration-runtime");
  const migrationMemorySize = getArg("migration-memory-size");
  const migrationTimeout = getArg("migration-timeout");
  const migrationTrigger = getArg("migration-trigger");
  const dependenciesLayerArn = getArg("dependencies-layer-arn");
  const dependenciesLayerSourceFile = getArg("dependencies-layer-source-file");
  const dependenciesLayerName = getArg("dependencies-layer-name", `${projectName}-${environment}-dependencies`);
  const dependenciesLayerDescription = getArg("dependencies-layer-description", `${projectName} ${environment} backend dependencies`);
  const dependenciesLayerLicenseInfo = getArg("dependencies-layer-license-info");
  const dependenciesLayerCompatibleRuntimes = getArg("dependencies-layer-compatible-runtimes", "nodejs22.x");
  const dependenciesLayerCompatibleArchitectures = getArg("dependencies-layer-compatible-architectures", "arm64");
  const observabilityLayerArn = getArg("observability-layer-arn");
  const lambdaNodeOptions = getArg("lambda-node-options");
  const membershipDatabaseName = getArg("membership-database-name");
  const attendanceDatabaseName = getArg("attendance-database-name");
  const contentDatabaseName = getArg("content-database-name");
  const givingDatabaseName = getArg("giving-database-name");
  const messagingDatabaseName = getArg("messaging-database-name");
  const doingDatabaseName = getArg("doing-database-name");
  const reportingDatabaseName = getArg("reporting-database-name");
  const enableWebSocketApi = getArg("enable-web-socket-api");
  const socketLambdaHandler = getArg("socket-lambda-handler");
  const socketLambdaMemorySize = getArg("socket-lambda-memory-size");
  const socketLambdaTimeout = getArg("socket-lambda-timeout");
  const enableScheduledWorkers = getArg("enable-scheduled-workers");
  const timer15MinLambdaHandler = getArg("timer15-min-lambda-handler");
  const timerMidnightLambdaHandler = getArg("timer-midnight-lambda-handler");
  const timerScheduledTasksLambdaHandler = getArg("timer-scheduled-tasks-lambda-handler");
  const timerWebhooksLambdaHandler = getArg("timer-webhooks-lambda-handler");
  const timerLambdaMemorySize = getArg("timer-lambda-memory-size");
  const timerLambdaTimeout = getArg("timer-lambda-timeout");
  const apiCustomDomainName = getArg("api-custom-domain-name");
  const apiCertificateArn = getArg("api-certificate-arn");
  const apiHostedZoneId = getArg("api-hosted-zone-id");
  const b1AdminRootUrl = getArg("b1-admin-root-url");
  const corsOrigin = getArg("cors-origin");
  const fileStore = getArg("file-store");
  const manageAssetBucket = getArg("manage-asset-bucket");
  const assetBucketName = getArg("asset-bucket-name");
  const appConfigSecretArn = getArg("app-config-secret-arn");
  const appConfigSecretFile = getArg("app-config-secret-file");
  const appConfigSecretName = getArg("app-config-secret-name", `${projectName}/${environment}/app-config`);
  const appConfigSecretId = getArg("app-config-secret-id");
  const appConfigSecretDescription = getArg("app-config-secret-description", `${projectName} ${environment} backend app config`);
  const appConfigSecretKmsKeyId = getArg("app-config-secret-kms-key-id");
  const syncLegacySsm = getBooleanArgString("sync-legacy-ssm");
  const runApiMigrations = getBooleanArgString("run-api-migrations");
  const apiMigrationAction = getArg("api-migration-action");
  const apiMigrationModule = getArg("api-migration-module");
  const apiMigrationRunner = getArg("api-migration-runner", "direct");
  const apiMigrationApiRepoPath = getArg("api-migration-api-repo-path");
  const apiMigrationDbSecretArn = getArg("api-migration-db-secret-arn");
  const apiMigrationDbSecretFile = getArg("api-migration-db-secret-file");
  const apiMigrationDryRun = getArg("api-migration-dry-run");
  const runBootstrapAdmin = getBooleanArgString("run-bootstrap-admin");
  const bootstrapAdminSecretFile = getArg("bootstrap-admin-secret-file");
  const bootstrapAdminSecretArn = getArg("bootstrap-admin-secret-arn");
  const bootstrapAdminEmail = getArg("bootstrap-admin-email");
  const bootstrapAdminPassword = getArg("bootstrap-admin-password");
  const bootstrapAdminFirstName = getArg("bootstrap-admin-first-name");
  const bootstrapAdminLastName = getArg("bootstrap-admin-last-name");
  const bootstrapAdminDisplayName = getArg("bootstrap-admin-display-name");
  const bootstrapChurchName = getArg("bootstrap-church-name");
  const bootstrapChurchSubdomain = getArg("bootstrap-church-subdomain");
  const bootstrapChurchAddress1 = getArg("bootstrap-church-address1");
  const bootstrapChurchAddress2 = getArg("bootstrap-church-address2");
  const bootstrapChurchCity = getArg("bootstrap-church-city");
  const bootstrapChurchState = getArg("bootstrap-church-state");
  const bootstrapChurchZip = getArg("bootstrap-church-zip");
  const bootstrapChurchCountry = getArg("bootstrap-church-country");
  const bootstrapMembershipStatus = getArg("bootstrap-membership-status");
  const bootstrapAdminResetPassword = getArg("bootstrap-admin-reset-password");
  const legacySsmPrefix = getArg("legacy-ssm-prefix");
  const legacySsmIncludeEmpty = getArg("legacy-ssm-include-empty");
  const legacySsmOverwrite = getArg("legacy-ssm-overwrite");
  const mailSystem = getArg("mail-system");
  const deliveryProvider = getArg("delivery-provider");
  const storeApiUrl = getArg("store-api-url");
  const aiProvider = getArg("ai-provider");
  const emailOnRegistration = getArg("email-on-registration");
  const caddyHost = getArg("caddy-host");
  const caddyPort = getArg("caddy-port");
  const frontendBucketName = getArg("frontend-bucket-name", frontendFileParams.BucketName);
  const frontendAlternateDomainName = getArg("frontend-alternate-domain-name", frontendFileParams.AlternateDomainName);
  const frontendAcmCertificateArn = getArg("frontend-acm-certificate-arn", frontendFileParams.AcmCertificateArn);
  const frontendHostedZoneId = getArg("frontend-hosted-zone-id", frontendFileParams.HostedZoneId);
  const frontendPriceClass = getArg("frontend-price-class", frontendFileParams.PriceClass);
  const frontendInfrastructureOnly = hasFlag("frontend-infrastructure-only");
  const publishFrontendAssets = hasFlag("publish-frontend-assets");
  const skipBackend = hasFlag("skip-backend");
  const skipFrontend = hasFlag("skip-frontend");
  const skipBuild = hasFlag("skip-build");
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";
  const withProgress = createProgressLogger({ quiet: jsonOutput });

  if (publishFrontendAssets && frontendInfrastructureOnly) {
    console.error("--publish-frontend-assets cannot be combined with --frontend-infrastructure-only. Use --frontend-infrastructure-only for the hosting-only phase, then run a later publish follow-up with --skip-frontend --publish-frontend-assets.");
    process.exit(1);
  }

  if (publishFrontendAssets && !skipFrontend) {
    console.error("--publish-frontend-assets only applies to staged frontend follow-up runs. Use it in a later phase with --skip-frontend after the frontend hosting stack already exists.");
    process.exit(1);
  }

  if (frontendInfrastructureOnly && skipFrontend) {
    console.error("--frontend-infrastructure-only and --skip-frontend cannot be used together. Skipping the frontend step prevents frontend hosting from being provisioned.");
    process.exit(1);
  }

  if (skipBuild && !publishFrontendAssets && !skipFrontend && !frontendInfrastructureOnly) {
    console.error("--skip-build only applies when frontend assets are being published. Use it with a normal frontend deploy, a staged publish follow-up, or publish:frontend-assets directly.");
    process.exit(1);
  }

  if (skipBuild && !publishFrontendAssets && (skipFrontend || frontendInfrastructureOnly)) {
    console.error("--skip-build has no effect when frontend publishing is deferred. Remove it or use it later during the publish phase.");
    process.exit(1);
  }

  if (runApiMigrations && skipBackend) {
    console.error("--run-api-migrations=true requires the backend deploy step. Remove --skip-backend or run yarn run:api-migrations separately afterward.");
    process.exit(1);
  }

  if (runBootstrapAdmin && skipBackend) {
    console.error("--run-bootstrap-admin=true requires the backend deploy step. Remove --skip-backend or run yarn run:bootstrap-admin separately afterward.");
    process.exit(1);
  }

  if (runApiMigrations) {
    validateApiMigrationArgs(apiMigrationAction || "up", apiMigrationModule || "all");
    validateApiMigrationRunner(apiMigrationRunner);
  }

  if (skipBackend && skipFrontend && !publishFrontendAssets) {
    console.error("Nothing to do: both backend and frontend deploy steps are skipped, and no staged frontend publish was requested.");
    process.exit(1);
  }

  if (runApiMigrations) {
    const resolvedApiMigrationRepoPath = path.resolve(rootDir, apiMigrationApiRepoPath || apiRepoPath || "../Api");
    if (!fs.existsSync(resolvedApiMigrationRepoPath)) {
      fail(`API migration repo not found: ${resolvedApiMigrationRepoPath}`);
    }
    if (apiMigrationRunner === "direct" && !fs.existsSync(path.join(resolvedApiMigrationRepoPath, "tools", "migrate.ts"))) {
      fail(`API migration repo is missing tools/migrate.ts: ${path.join(resolvedApiMigrationRepoPath, "tools", "migrate.ts")}`);
    }
    if (apiMigrationRunner === "direct" && apiMigrationDryRun !== "true" && !fs.existsSync(path.join(resolvedApiMigrationRepoPath, "node_modules"))) {
      fail(`API migration repo dependencies are not installed: ${path.join(resolvedApiMigrationRepoPath, "node_modules")}`);
    }
    if (apiMigrationRunner === "data-api" && !fs.existsSync(path.join(rootDir, "node_modules", "typescript", "package.json"))) {
      fail(`B1Admin dependencies are not installed: ${path.join(rootDir, "node_modules", "typescript", "package.json")}`);
    }
    if (apiMigrationDryRun !== "true" && apiMigrationModule && apiMigrationModule !== "all") {
      const apiRepoMigrationDirectories = loadApiRepoMigrationDirectories(resolvedApiMigrationRepoPath);
      if (apiRepoMigrationDirectories.length > 0 && !apiRepoMigrationDirectories.includes(apiMigrationModule)) {
        fail(`The current Api repo has no tools/migrations/${apiMigrationModule} directory. Refusing to deploy with --run-api-migrations=true for an unsupported migration target.`);
      }
    }
  }

  const willPublishFrontendAssets = (!skipFrontend && !frontendInfrastructureOnly) || (publishFrontendAssets && (skipFrontend || frontendInfrastructureOnly));
  if (willPublishFrontendAssets) {
    ensureFrontendPublishPrerequisites(skipBuild);
  }

  const bootstrapOutputs = !skipBackend
    ? getStackOutputsSafe(bootstrapStackName, region, "bootstrap stack")
    : {};
  const currentBackendStackParams = backendParametersFile
    ? {}
    : getStackParametersSafe(backendStackName, region, "backend stack");
  const resolvedArtifactBucket = lambdaCodeS3Bucket || bootstrapOutputs.ArtifactBucketName || "";
  const resolvedMigrationBucket = migrationCodeS3Bucket || resolvedArtifactBucket;
  let resolvedDependenciesLayerArn = dependenciesLayerArn;
  let resolvedAppConfigSecretArn = appConfigSecretArn;
  let resolvedBackendArtifactSourceFile = backendArtifactSourceFile;
  let resolvedMigrationArtifactSourceFile = migrationArtifactSourceFile;
  let resolvedDependenciesLayerSourceFile = dependenciesLayerSourceFile;
  let resolvedPackageManifestFile = "";
  let backendArtifactUploadResult = null;
  let migrationArtifactUploadResult = null;
  let resolvedLambdaCodeS3ObjectVersion = getArg("lambda-code-s3-object-version");
  let resolvedMigrationCodeS3ObjectVersion = getArg("migration-code-s3-object-version");
  let resolvedBackendResult = null;
  let resolvedFrontendResult = null;
  let frontendPublishResult = null;
  let resolvedObservabilityLayerArn = observabilityLayerArn || backendFileParams.ObservabilityLayerArn || "";

  if (!skipBackend && packageManifestFile) {
    const manifestFilePath = path.resolve(rootDir, packageManifestFile);
    resolvedPackageManifestFile = manifestFilePath;
    const packageResult = loadJson(manifestFilePath, "package manifest");
    resolvedBackendArtifactSourceFile = resolvedBackendArtifactSourceFile || resolveManifestArtifactPath(manifestFilePath, packageResult.backendArtifactPath);
    resolvedMigrationArtifactSourceFile = resolvedMigrationArtifactSourceFile || resolveManifestArtifactPath(manifestFilePath, packageResult.migrationArtifactPath);
    resolvedDependenciesLayerSourceFile = resolvedDependenciesLayerSourceFile || resolveManifestArtifactPath(manifestFilePath, packageResult.dependenciesLayerArtifactPath);
  }

  if (!skipBackend && packageApiBackend) {
    const manifestName = `api-${environment}-${packageMode}.manifest.json`;
    const manifestPath = path.resolve(rootDir, packageOutputDir, manifestName);
    resolvedPackageManifestFile = manifestPath;
    const packageArgs = [];
    addArg(packageArgs, "api-repo-path", apiRepoPath || "../Api");
    addArg(packageArgs, "environment", environment);
    addArg(packageArgs, "package-mode", packageMode);
    addArg(packageArgs, "output-dir", packageOutputDir);
    addArg(packageArgs, "build", packageBuild);
    addArg(packageArgs, "build-layer", packageBuildLayer);
    addArg(packageArgs, "manifest-name", manifestName);
    withProgress("Backend packaging", () => {
      run("scripts/package-api-backend.mjs", packageArgs, { quiet: jsonOutput });
    }, `${apiRepoPath || "../Api"} (${packageMode})`);
    const packageResult = loadJson(manifestPath, "package manifest");
    resolvedBackendArtifactSourceFile = resolvedBackendArtifactSourceFile || resolveManifestArtifactPath(manifestPath, packageResult.backendArtifactPath);
    resolvedMigrationArtifactSourceFile = resolvedMigrationArtifactSourceFile || resolveManifestArtifactPath(manifestPath, packageResult.migrationArtifactPath);
    resolvedDependenciesLayerSourceFile = resolvedDependenciesLayerSourceFile || resolveManifestArtifactPath(manifestPath, packageResult.dependenciesLayerArtifactPath);
  }

  if (!skipBackend && !resolvedLambdaCodeS3Key && resolvedBackendArtifactSourceFile) {
    resolvedLambdaCodeS3Key = deriveArtifactKey(projectName, environment, "api.zip");
  }

  if (!skipBackend && !resolvedMigrationCodeS3Key && resolvedMigrationArtifactSourceFile) {
    resolvedMigrationCodeS3Key = deriveArtifactKey(projectName, environment, "migrations.zip");
  }

  if (!skipBackend && !resolvedDependenciesLayerArn && !resolvedDependenciesLayerSourceFile) {
    resolvedDependenciesLayerArn = currentBackendStackParams.DependenciesLayerArn || "";
  }

  if (!skipBackend && !resolvedObservabilityLayerArn) {
    resolvedObservabilityLayerArn = currentBackendStackParams.ObservabilityLayerArn || "";
  }

  if (!skipBackend && resolvedBackendArtifactSourceFile) {
    const artifactArgs = [];
    addArg(artifactArgs, "region", region);
    addArg(artifactArgs, "bootstrap-stack-name", bootstrapStackName);
    addArg(artifactArgs, "artifact-bucket", resolvedArtifactBucket);
    addArg(artifactArgs, "source-file", resolvedBackendArtifactSourceFile);
    addArg(artifactArgs, "artifact-key", resolvedLambdaCodeS3Key);
    addArg(artifactArgs, "artifact-label", "Backend artifact");
    addArg(artifactArgs, "output", "json");
    backendArtifactUploadResult = withProgress("Backend artifact upload", () => (
      runNodeJson("scripts/upload-backend-artifact.mjs", artifactArgs)
    ), resolvedLambdaCodeS3Key);
    resolvedLambdaCodeS3ObjectVersion = backendArtifactUploadResult?.versionId || resolvedLambdaCodeS3ObjectVersion;
    if (!jsonOutput) {
      console.log("\nBackend artifact upload complete.");
      console.log(`Bucket: ${backendArtifactUploadResult.bucket}`);
      console.log(`Key: ${backendArtifactUploadResult.key}`);
      if (backendArtifactUploadResult.versionId) console.log(`VersionId: ${backendArtifactUploadResult.versionId}`);
      console.log(`S3 URI: ${backendArtifactUploadResult.s3Uri}`);
    }
  }

  if (!skipBackend && resolvedMigrationArtifactSourceFile) {
    const artifactArgs = [];
    addArg(artifactArgs, "region", region);
    addArg(artifactArgs, "bootstrap-stack-name", bootstrapStackName);
    addArg(artifactArgs, "artifact-bucket", resolvedMigrationBucket);
    addArg(artifactArgs, "source-file", resolvedMigrationArtifactSourceFile);
    addArg(artifactArgs, "artifact-key", resolvedMigrationCodeS3Key);
    addArg(artifactArgs, "artifact-label", "Migration artifact");
    addArg(artifactArgs, "output", "json");
    migrationArtifactUploadResult = withProgress("Migration artifact upload", () => (
      runNodeJson("scripts/upload-backend-artifact.mjs", artifactArgs)
    ), resolvedMigrationCodeS3Key);
    resolvedMigrationCodeS3ObjectVersion = migrationArtifactUploadResult?.versionId || resolvedMigrationCodeS3ObjectVersion;
    if (!jsonOutput) {
      console.log("\nMigration artifact upload complete.");
      console.log(`Bucket: ${migrationArtifactUploadResult.bucket}`);
      console.log(`Key: ${migrationArtifactUploadResult.key}`);
      if (migrationArtifactUploadResult.versionId) console.log(`VersionId: ${migrationArtifactUploadResult.versionId}`);
      console.log(`S3 URI: ${migrationArtifactUploadResult.s3Uri}`);
    }
  }

  if (!skipBackend && resolvedDependenciesLayerSourceFile) {
    const dependenciesLayerArtifactKey = deriveArtifactKey(projectName, environment, "dependencies-layer.zip");
    const dependenciesLayerUploadResult = withProgress("Dependencies layer artifact upload", () => (
      runNodeJson("scripts/upload-backend-artifact.mjs", [
        `--region=${region}`,
        `--artifact-bucket=${resolvedArtifactBucket}`,
        `--source-file=${resolvedDependenciesLayerSourceFile}`,
        `--artifact-key=${dependenciesLayerArtifactKey}`,
        "--artifact-label=Dependencies layer artifact",
        "--output=json",
      ])
    ), dependenciesLayerArtifactKey);
    if (!jsonOutput) {
      console.log("\nDependencies layer artifact upload complete.");
      console.log(`Bucket: ${dependenciesLayerUploadResult.bucket}`);
      console.log(`Key: ${dependenciesLayerUploadResult.key}`);
      if (dependenciesLayerUploadResult.versionId) console.log(`VersionId: ${dependenciesLayerUploadResult.versionId}`);
      console.log(`S3 URI: ${dependenciesLayerUploadResult.s3Uri}`);
    }
    const layerResponse = withProgress("Dependencies layer publish", () => (
      runNodeJson("scripts/publish-lambda-layer.mjs", [
        `--region=${region}`,
        `--layer-name=${dependenciesLayerName}`,
        `--content-bucket=${resolvedArtifactBucket}`,
        `--content-key=${dependenciesLayerArtifactKey}`,
        ...(dependenciesLayerUploadResult.versionId ? [`--content-object-version=${dependenciesLayerUploadResult.versionId}`] : []),
        `--description=${dependenciesLayerDescription}`,
        `--compatible-runtimes=${dependenciesLayerCompatibleRuntimes}`,
        `--compatible-architectures=${dependenciesLayerCompatibleArchitectures}`,
        `--output=json`,
        ...(dependenciesLayerLicenseInfo ? [`--license-info=${dependenciesLayerLicenseInfo}`] : []),
      ])
    ), dependenciesLayerName);
    resolvedDependenciesLayerArn = layerResponse.LayerVersionArn || resolvedDependenciesLayerArn;
  }

  if (!skipBackend && appConfigSecretFile) {
    const secretResponse = withProgress("App config secret sync", () => (
      runNodeJson("scripts/sync-app-config-secret.mjs", [
        `--region=${region}`,
        `--secret-file=${appConfigSecretFile}`,
        `--secret-name=${appConfigSecretName}`,
        ...(appConfigSecretId ? [`--secret-id=${appConfigSecretId}`] : []),
        ...(appConfigSecretDescription ? [`--description=${appConfigSecretDescription}`] : []),
        ...(appConfigSecretKmsKeyId ? [`--kms-key-id=${appConfigSecretKmsKeyId}`] : []),
        "--output=json",
      ])
    ), appConfigSecretName);
    resolvedAppConfigSecretArn = secretResponse.arn || resolvedAppConfigSecretArn;
  }

  if (!skipBackend && !resolvedAppConfigSecretArn && !appConfigSecretFile) {
    resolvedAppConfigSecretArn = currentBackendStackParams.AppConfigSecretArn || "";
  }

  if (!skipBackend) {
    const backendArgs = [];
    addArg(backendArgs, "stack-name", backendStackName);
    addArg(backendArgs, "region", region);
    addArg(backendArgs, "environment", environment);
    addArg(backendArgs, "project-name", projectName);
    addArg(backendArgs, "bootstrap-stack-name", bootstrapStackName);
    addArg(backendArgs, "cloudformation-execution-role-arn", cloudformationExecutionRoleArn);
    addArg(backendArgs, "parameters-file", backendParametersFile);
    addArg(backendArgs, "lambda-code-s3-bucket", resolvedArtifactBucket);
    addArg(backendArgs, "lambda-code-s3-key", resolvedLambdaCodeS3Key);
    addArg(backendArgs, "lambda-code-s3-object-version", resolvedLambdaCodeS3ObjectVersion);
    addArg(backendArgs, "dependencies-layer-arn", resolvedDependenciesLayerArn);
    addArg(backendArgs, "observability-layer-arn", resolvedObservabilityLayerArn);
    addArg(backendArgs, "lambda-node-options", lambdaNodeOptions);
    addArg(backendArgs, "enable-web-socket-api", enableWebSocketApi);
    addArg(backendArgs, "socket-lambda-handler", socketLambdaHandler);
    addArg(backendArgs, "socket-lambda-memory-size", socketLambdaMemorySize);
    addArg(backendArgs, "socket-lambda-timeout", socketLambdaTimeout);
    addArg(backendArgs, "enable-scheduled-workers", enableScheduledWorkers);
    addArg(backendArgs, "timer15-min-lambda-handler", timer15MinLambdaHandler);
    addArg(backendArgs, "timer-midnight-lambda-handler", timerMidnightLambdaHandler);
    addArg(backendArgs, "timer-scheduled-tasks-lambda-handler", timerScheduledTasksLambdaHandler);
    addArg(backendArgs, "timer-webhooks-lambda-handler", timerWebhooksLambdaHandler);
    addArg(backendArgs, "timer-lambda-memory-size", timerLambdaMemorySize);
    addArg(backendArgs, "timer-lambda-timeout", timerLambdaTimeout);
    addArg(backendArgs, "run-migrations", runMigrations);
    addArg(backendArgs, "migration-code-s3-bucket", resolvedMigrationBucket);
    addArg(backendArgs, "migration-code-s3-key", resolvedMigrationCodeS3Key);
    addArg(backendArgs, "migration-code-s3-object-version", resolvedMigrationCodeS3ObjectVersion);
    addArg(backendArgs, "migration-handler", migrationHandler);
    addArg(backendArgs, "migration-runtime", migrationRuntime);
    addArg(backendArgs, "migration-memory-size", migrationMemorySize);
    addArg(backendArgs, "migration-timeout", migrationTimeout);
    addArg(backendArgs, "migration-trigger", migrationTrigger);
    addArg(backendArgs, "membership-database-name", membershipDatabaseName);
    addArg(backendArgs, "attendance-database-name", attendanceDatabaseName);
    addArg(backendArgs, "content-database-name", contentDatabaseName);
    addArg(backendArgs, "giving-database-name", givingDatabaseName);
    addArg(backendArgs, "messaging-database-name", messagingDatabaseName);
    addArg(backendArgs, "doing-database-name", doingDatabaseName);
    addArg(backendArgs, "reporting-database-name", reportingDatabaseName);
    addArg(backendArgs, "api-custom-domain-name", apiCustomDomainName);
    addArg(backendArgs, "api-certificate-arn", apiCertificateArn);
    addArg(backendArgs, "api-hosted-zone-id", apiHostedZoneId);
    addArg(backendArgs, "b1-admin-root-url", b1AdminRootUrl);
    addArg(backendArgs, "cors-origin", corsOrigin);
    addArg(backendArgs, "file-store", fileStore);
    addArg(backendArgs, "manage-asset-bucket", manageAssetBucket);
    addArg(backendArgs, "asset-bucket-name", assetBucketName);
    addArg(backendArgs, "app-config-secret-arn", resolvedAppConfigSecretArn);
    addArg(backendArgs, "sync-legacy-ssm", syncLegacySsm);
    addArg(backendArgs, "run-api-migrations", runApiMigrations);
    addArg(backendArgs, "api-migration-action", apiMigrationAction);
    addArg(backendArgs, "api-migration-module", apiMigrationModule);
    addArg(backendArgs, "api-migration-runner", apiMigrationRunner);
    addArg(backendArgs, "api-migration-api-repo-path", apiMigrationApiRepoPath);
    addArg(backendArgs, "api-migration-db-secret-arn", apiMigrationDbSecretArn);
    addArg(backendArgs, "api-migration-db-secret-file", apiMigrationDbSecretFile);
    addArg(backendArgs, "api-migration-dry-run", apiMigrationDryRun);
    addArg(backendArgs, "run-bootstrap-admin", runBootstrapAdmin);
    addArg(backendArgs, "bootstrap-admin-secret-file", bootstrapAdminSecretFile);
    addArg(backendArgs, "bootstrap-admin-secret-arn", bootstrapAdminSecretArn);
    addArg(backendArgs, "bootstrap-admin-email", bootstrapAdminEmail);
    addArg(backendArgs, "bootstrap-admin-password", bootstrapAdminPassword);
    addArg(backendArgs, "bootstrap-admin-first-name", bootstrapAdminFirstName);
    addArg(backendArgs, "bootstrap-admin-last-name", bootstrapAdminLastName);
    addArg(backendArgs, "bootstrap-admin-display-name", bootstrapAdminDisplayName);
    addArg(backendArgs, "bootstrap-church-name", bootstrapChurchName);
    addArg(backendArgs, "bootstrap-church-subdomain", bootstrapChurchSubdomain);
    addArg(backendArgs, "bootstrap-church-address1", bootstrapChurchAddress1);
    addArg(backendArgs, "bootstrap-church-address2", bootstrapChurchAddress2);
    addArg(backendArgs, "bootstrap-church-city", bootstrapChurchCity);
    addArg(backendArgs, "bootstrap-church-state", bootstrapChurchState);
    addArg(backendArgs, "bootstrap-church-zip", bootstrapChurchZip);
    addArg(backendArgs, "bootstrap-church-country", bootstrapChurchCountry);
    addArg(backendArgs, "bootstrap-membership-status", bootstrapMembershipStatus);
    addArg(backendArgs, "bootstrap-admin-reset-password", bootstrapAdminResetPassword);
    addArg(backendArgs, "legacy-ssm-prefix", legacySsmPrefix);
    addArg(backendArgs, "legacy-ssm-include-empty", legacySsmIncludeEmpty);
    addArg(backendArgs, "legacy-ssm-overwrite", legacySsmOverwrite);
    addArg(backendArgs, "mail-system", mailSystem);
    addArg(backendArgs, "delivery-provider", deliveryProvider);
    addArg(backendArgs, "store-api-url", storeApiUrl);
    addArg(backendArgs, "ai-provider", aiProvider);
    addArg(backendArgs, "email-on-registration", emailOnRegistration);
    addArg(backendArgs, "caddy-host", caddyHost);
    addArg(backendArgs, "caddy-port", caddyPort);
    if (jsonOutput) addArg(backendArgs, "output", "json");
    resolvedBackendResult = withProgress("Backend infrastructure deploy", () => (
      jsonOutput
        ? runNodeJson("scripts/deploy-backend.mjs", backendArgs)
        : run("scripts/deploy-backend.mjs", backendArgs)
    ), backendStackName);
  }

  if (!skipFrontend) {
    const frontendArgs = [];
    addArg(frontendArgs, "stack-name", frontendStackName);
    addArg(frontendArgs, "region", region);
    addArg(frontendArgs, "environment", environment);
    addArg(frontendArgs, "project-name", projectName);
    addArg(frontendArgs, "bootstrap-stack-name", bootstrapStackName);
    addArg(frontendArgs, "cloudformation-execution-role-arn", cloudformationExecutionRoleArn);
    addArg(frontendArgs, "parameters-file", frontendParametersFile);
    if (backendOutputsFile) addArg(frontendArgs, "backend-outputs-file", backendOutputsFile);
    else addArg(frontendArgs, "backend-stack-name", backendStackName);
    addArg(frontendArgs, "bucket-name", frontendBucketName);
    addArg(frontendArgs, "alternate-domain-name", frontendAlternateDomainName);
    addArg(frontendArgs, "acm-certificate-arn", frontendAcmCertificateArn);
    addArg(frontendArgs, "hosted-zone-id", frontendHostedZoneId);
    addArg(frontendArgs, "price-class", frontendPriceClass);
    if (frontendInfrastructureOnly) frontendArgs.push("--infrastructure-only");
    if (skipBuild) frontendArgs.push("--skip-build");
    if (jsonOutput) addArg(frontendArgs, "output", "json");
    resolvedFrontendResult = withProgress("Frontend deploy and publish", () => (
      jsonOutput
        ? runNodeJson("scripts/deploy-frontend.mjs", frontendArgs)
        : run("scripts/deploy-frontend.mjs", frontendArgs)
    ), frontendStackName);
  }

  if (publishFrontendAssets && (skipFrontend || frontendInfrastructureOnly)) {
    const publishArgs = [];
    if (!frontendOutputsFile && (!frontendPublishBucket || !frontendPublishDistributionId)) {
      addArg(publishArgs, "stack-name", frontendStackName);
    }
    addArg(publishArgs, "frontend-outputs-file", frontendOutputsFile);
    addArg(publishArgs, "bucket", frontendPublishBucket);
    addArg(publishArgs, "distribution-id", frontendPublishDistributionId);
    addArg(publishArgs, "app-url", frontendPublishAppUrl);
    addArg(publishArgs, "region", region);
    addArg(publishArgs, "environment", environment);
    if (!skipBuild) {
      if (backendOutputsFile) addArg(publishArgs, "backend-outputs-file", backendOutputsFile);
      else addArg(publishArgs, "backend-stack-name", backendStackName);
    }
    if (skipBuild) publishArgs.push("--skip-build");
    if (jsonOutput) addArg(publishArgs, "output", "json");
    frontendPublishResult = withProgress("Frontend publish follow-up", () => (
      jsonOutput
        ? runNodeJson("scripts/publish-frontend-assets.mjs", publishArgs)
        : run("scripts/publish-frontend-assets.mjs", publishArgs)
    ), frontendPublishBucket || frontendStackName);
  }

  if (jsonOutput) {
    const result = {
      region,
      environment,
      projectName,
      bootstrapStackName,
      backendStackName,
      backendOutputsFile,
      frontendStackName,
      frontendOutputsFile,
      frontendPublishBucket,
      frontendPublishDistributionId,
      frontendPublishAppUrl,
      frontendInfrastructureOnly,
      publishFrontendAssets,
      skipBackend,
      skipFrontend,
      skipBuild,
      resolvedPackageManifestFile,
      resolvedBackendArtifactSourceFile,
      resolvedMigrationArtifactSourceFile,
      resolvedDependenciesLayerSourceFile,
      resolvedArtifactBucket,
      resolvedLambdaCodeS3Key,
      resolvedMigrationBucket,
      resolvedMigrationCodeS3Key,
      resolvedDependenciesLayerArn: resolvedDependenciesLayerArn || "",
      resolvedAppConfigSecretArn: resolvedAppConfigSecretArn || "",
      backendArtifactUpload: backendArtifactUploadResult,
      migrationArtifactUpload: migrationArtifactUploadResult,
      backend: resolvedBackendResult || null,
      frontend: resolvedFrontendResult || null,
      frontendPublish: frontendPublishResult || null,
    };

    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
}

main();
