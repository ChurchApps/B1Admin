import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultTemplatePath = path.join(rootDir, "infrastructure", "cloudformation", "backend-api.yaml");

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

function exitForCommandError(error, quiet = false) {
  if (error && typeof error === "object") {
    if (quiet && error.stdout) process.stderr.write(String(error.stdout));
    if (quiet && error.stderr) process.stderr.write(String(error.stderr));
    const status = typeof error.status === "number" ? error.status : 1;
    process.exit(status);
  }

  process.exit(1);
}

function maskSensitiveArg(arg) {
  return String(arg).replace(/^(--[^=]*(?:password|secret-string)[^=]*=).+/i, "$1<hidden>");
}

function run(command, args, options = {}) {
  const { quiet = false, ...execOptions } = options;
  if (!quiet) console.log(`\n> ${command} ${args.map(maskSensitiveArg).join(" ")}`);

  try {
    return execFileSync(command, args, {
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

function requireValue(name, value) {
  if (!value) {
    console.error(`Missing required value: ${name}`);
    process.exit(1);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
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
    return JSON.parse(execFileSync("aws", [
      "cloudformation",
      "describe-stacks",
      "--stack-name",
      stackName,
      "--region",
      region,
      "--output",
      "json",
    ], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 20 * 1024 * 1024,
    }));
  } catch (error) {
    const stderr = String(error?.stderr || "");
    if (stderr.includes("does not exist")) return null;
    throw error;
  }
}

function ensureStackIsDeployable(stackName, region, quiet = false) {
  const stack = describeStackSafe(stackName, region)?.Stacks?.[0];
  const recoverableStatuses = new Set(["ROLLBACK_COMPLETE", "ROLLBACK_FAILED"]);
  if (!stack || !recoverableStatuses.has(stack.StackStatus)) return;

  if (!quiet) {
    console.log(`\nStack ${stackName} is in ${stack.StackStatus}. Deleting it before retrying the deploy.`);
  }

  run("aws", [
    "cloudformation",
    "delete-stack",
    "--stack-name",
    stackName,
    "--region",
    region,
  ], { quiet });

  run("aws", [
    "cloudformation",
    "wait",
    "stack-delete-complete",
    "--stack-name",
    stackName,
    "--region",
    region,
  ], { quiet });
}

function getStackOutputs(stackName, region) {
  const response = JSON.parse(execFileSync("aws", [
    "cloudformation",
    "describe-stacks",
    "--stack-name",
    stackName,
    "--region",
    region,
    "--output",
    "json",
  ], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  }));

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

function toParameterOverrides(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`);
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

function addArg(args, name, value) {
  if (value !== undefined && value !== null && value !== "") {
    args.push(`--${name}=${value}`);
  }
}

function deriveArtifactKey(projectName, environmentName, fileName) {
  return `${projectName}/${environmentName}/backend/${fileName}`;
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

  if (!validActions.includes(action)) {
    fail(`Invalid api-migration-action "${action}". Use up, down, or status.`);
  }

  if (!validModules.includes(moduleName)) {
    fail(`Invalid api-migration-module "${moduleName}". Use all, membership, attendance, content, giving, messaging, doing, or reporting.`);
  }
}

function validateApiMigrationRunner(runner) {
  if (runner === "direct") {
    fail('The "direct" migration runner has been removed; migrations run through the RDS Data API. Use --api-migration-runner=data-api (the default).');
  }
  if (!["data-api"].includes(runner)) {
    fail(`Invalid api-migration-runner "${runner}". Use data-api.`);
  }
}

function main() {
  const stackName = getArg("stack-name");
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const cloudformationExecutionRoleArn = getArg("cloudformation-execution-role-arn", process.env.CLOUDFORMATION_EXECUTION_ROLE_ARN || "");
  const templateFile = path.resolve(rootDir, getArg("template-file", defaultTemplatePath));
  const paramsFile = getArg("parameters-file");
  const fileParams = loadParamsFromFile(paramsFile);
  const bootstrapStackName = getArg("bootstrap-stack-name");
  const apiRepoPath = getArg("api-repo-path");
  const packageManifestFile = getArg("package-manifest-file");
  const packageApiBackend = !packageManifestFile && (apiRepoPath !== "" || getArg("package-api-backend", "false").toLowerCase() === "true");
  const packageMode = getArg("package-mode", "self-contained");
  const packageOutputDir = getArg("package-output-dir", "infrastructure/artifacts/api");
  const packageBuild = getArg("package-build", "true");
  const packageBuildLayer = getArg("package-build-layer", packageMode === "layered" ? "true" : "false");
  const projectName = getArg("project-name", fileParams.ProjectName || "b1admin");
  const environmentName = getArg("environment", fileParams.EnvironmentName || "prod");
  const backendArtifactSourceFile = getArg("backend-artifact-source-file");
  const migrationArtifactSourceFile = getArg("migration-artifact-source-file");
  const dependenciesLayerSourceFile = getArg("dependencies-layer-source-file");
  const dependenciesLayerName = getArg("dependencies-layer-name");
  const dependenciesLayerDescription = getArg("dependencies-layer-description");
  const dependenciesLayerLicenseInfo = getArg("dependencies-layer-license-info");
  const dependenciesLayerCompatibleRuntimes = getArg("dependencies-layer-compatible-runtimes", "nodejs22.x");
  const dependenciesLayerCompatibleArchitectures = getArg("dependencies-layer-compatible-architectures", "arm64");
  const appConfigSecretFile = getArg("app-config-secret-file");
  const appConfigSecretName = getArg("app-config-secret-name");
  const appConfigSecretId = getArg("app-config-secret-id");
  const appConfigSecretDescription = getArg("app-config-secret-description");
  const appConfigSecretKmsKeyId = getArg("app-config-secret-kms-key-id");
  const syncLegacySsm = getArg("sync-legacy-ssm", "false").toLowerCase() === "true";
  const runApiMigrations = getArg("run-api-migrations", "false").toLowerCase() === "true";
  const apiMigrationAction = getArg("api-migration-action", "up");
  const apiMigrationModule = getArg("api-migration-module", "all");
  const apiMigrationRunner = getArg("api-migration-runner", "data-api");
  const apiMigrationApiRepoPath = getArg("api-migration-api-repo-path", apiRepoPath || "../Api");
  const apiMigrationDbSecretArn = getArg("api-migration-db-secret-arn");
  const apiMigrationDbSecretFile = getArg("api-migration-db-secret-file");
  const apiMigrationDryRun = getArg("api-migration-dry-run", "false").toLowerCase() === "true";
  const runBootstrapAdmin = getArg("run-bootstrap-admin", "false").toLowerCase() === "true";
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
  const bootstrapAdminResetPassword = getArg("bootstrap-admin-reset-password", "true");
  const legacySsmPrefix = getArg("legacy-ssm-prefix");
  const legacySsmIncludeEmpty = getArg("legacy-ssm-include-empty");
  const legacySsmOverwrite = getArg("legacy-ssm-overwrite");
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";

  if (runApiMigrations) {
    validateApiMigrationArgs(apiMigrationAction, apiMigrationModule);
    validateApiMigrationRunner(apiMigrationRunner);
    const resolvedApiMigrationRepoPath = path.resolve(rootDir, apiMigrationApiRepoPath);
    if (!fs.existsSync(resolvedApiMigrationRepoPath)) {
      fail(`API migration repo not found: ${resolvedApiMigrationRepoPath}`);
    }
    if (apiMigrationRunner === "data-api" && !fs.existsSync(path.join(rootDir, "node_modules", "typescript", "package.json"))) {
      fail(`B1Admin dependencies are not installed: ${path.join(rootDir, "node_modules", "typescript", "package.json")}`);
    }
    if (!apiMigrationDryRun && apiMigrationModule !== "all") {
      const apiRepoMigrationDirectories = loadApiRepoMigrationDirectories(resolvedApiMigrationRepoPath);
      if (apiRepoMigrationDirectories.length > 0 && !apiRepoMigrationDirectories.includes(apiMigrationModule)) {
        fail(`The current Api repo has no tools/migrations/${apiMigrationModule} directory. Refusing to deploy with --run-api-migrations=true for an unsupported migration target.`);
      }
    }
  }

  requireValue("stack-name", stackName);
  requireValue("template-file", templateFile);
  const bootstrapOutputs = getStackOutputsSafe(bootstrapStackName, region, "bootstrap stack");
  const currentStackParams = paramsFile
    ? {}
    : getStackParametersSafe(stackName, region, "backend stack");
  const resolvedTemplateBucket = getArg("template-bucket", bootstrapOutputs.TemplateBucketName || "");
  const resolvedArtifactBucket = getArg("lambda-code-s3-bucket", fileParams.LambdaCodeS3Bucket || bootstrapOutputs.ArtifactBucketName || "");
  const resolvedMigrationBucket = getArg("migration-code-s3-bucket", fileParams.MigrationCodeS3Bucket || resolvedArtifactBucket);

  let resolvedBackendArtifactSourceFile = backendArtifactSourceFile;
  let resolvedMigrationArtifactSourceFile = migrationArtifactSourceFile;
  let resolvedDependenciesLayerSourceFile = dependenciesLayerSourceFile;
  let resolvedDependenciesLayerArn = getArg("dependencies-layer-arn", fileParams.DependenciesLayerArn);
  let resolvedLambdaCodeS3Key = getArg("lambda-code-s3-key", fileParams.LambdaCodeS3Key);
  let resolvedLambdaCodeS3ObjectVersion = getArg("lambda-code-s3-object-version", fileParams.LambdaCodeS3ObjectVersion);
  let resolvedMigrationCodeS3Key = getArg("migration-code-s3-key", fileParams.MigrationCodeS3Key);
  let resolvedMigrationCodeS3ObjectVersion = getArg("migration-code-s3-object-version", fileParams.MigrationCodeS3ObjectVersion);
  let resolvedPackageManifestFile = "";
  let resolvedObservabilityLayerArn = getArg("observability-layer-arn", fileParams.ObservabilityLayerArn);

  if (packageManifestFile) {
    const manifestFilePath = path.resolve(rootDir, packageManifestFile);
    resolvedPackageManifestFile = manifestFilePath;
    const packageResult = loadJson(manifestFilePath, "package manifest");
    resolvedBackendArtifactSourceFile = resolvedBackendArtifactSourceFile || resolveManifestArtifactPath(manifestFilePath, packageResult.backendArtifactPath);
    resolvedMigrationArtifactSourceFile = resolvedMigrationArtifactSourceFile || resolveManifestArtifactPath(manifestFilePath, packageResult.migrationArtifactPath);
    resolvedDependenciesLayerSourceFile = resolvedDependenciesLayerSourceFile || resolveManifestArtifactPath(manifestFilePath, packageResult.dependenciesLayerArtifactPath);
  }

  if (packageApiBackend) {
    const manifestName = `api-${environmentName}-${packageMode}.manifest.json`;
    const manifestPath = path.resolve(rootDir, packageOutputDir, manifestName);
    resolvedPackageManifestFile = manifestPath;
    const packageArgs = [];
    addArg(packageArgs, "api-repo-path", apiRepoPath || "../Api");
    addArg(packageArgs, "environment", environmentName);
    addArg(packageArgs, "package-mode", packageMode);
    addArg(packageArgs, "output-dir", packageOutputDir);
    addArg(packageArgs, "build", packageBuild);
    addArg(packageArgs, "build-layer", packageBuildLayer);
    addArg(packageArgs, "manifest-name", manifestName);
    run("node", ["scripts/package-api-backend.mjs", ...packageArgs], { quiet: jsonOutput });
    const packageResult = loadJson(manifestPath, "package manifest");
    resolvedBackendArtifactSourceFile = resolvedBackendArtifactSourceFile || resolveManifestArtifactPath(manifestPath, packageResult.backendArtifactPath);
    resolvedMigrationArtifactSourceFile = resolvedMigrationArtifactSourceFile || resolveManifestArtifactPath(manifestPath, packageResult.migrationArtifactPath);
    resolvedDependenciesLayerSourceFile = resolvedDependenciesLayerSourceFile || resolveManifestArtifactPath(manifestPath, packageResult.dependenciesLayerArtifactPath);
  }

  if (!resolvedLambdaCodeS3Key && resolvedBackendArtifactSourceFile) {
    resolvedLambdaCodeS3Key = deriveArtifactKey(projectName, environmentName, "api.zip");
  }

  if (!resolvedMigrationCodeS3Key && resolvedMigrationArtifactSourceFile) {
    resolvedMigrationCodeS3Key = deriveArtifactKey(projectName, environmentName, "migrations.zip");
  }

  if (!resolvedDependenciesLayerArn && !resolvedDependenciesLayerSourceFile) {
    resolvedDependenciesLayerArn = currentStackParams.DependenciesLayerArn || "";
  }

  if (!resolvedObservabilityLayerArn) {
    resolvedObservabilityLayerArn = currentStackParams.ObservabilityLayerArn || "";
  }

  if (resolvedDependenciesLayerSourceFile) {
    requireValue("lambda-code-s3-bucket", resolvedArtifactBucket);
    const dependenciesLayerArtifactKey = deriveArtifactKey(projectName, environmentName, "dependencies-layer.zip");
    const dependenciesLayerUploadResult = runNodeJson("scripts/upload-backend-artifact.mjs", [
      `--region=${region}`,
      `--artifact-bucket=${resolvedArtifactBucket}`,
      `--source-file=${resolvedDependenciesLayerSourceFile}`,
      `--artifact-key=${dependenciesLayerArtifactKey}`,
      "--artifact-label=Dependencies layer artifact",
      "--output=json",
    ]);
    const layerResponse = runNodeJson("scripts/publish-lambda-layer.mjs", [
      `--region=${region}`,
      `--layer-name=${dependenciesLayerName || `${projectName}-${environmentName}-dependencies`}`,
      `--content-bucket=${resolvedArtifactBucket}`,
      `--content-key=${dependenciesLayerArtifactKey}`,
      ...(dependenciesLayerUploadResult.versionId ? [`--content-object-version=${dependenciesLayerUploadResult.versionId}`] : []),
      `--description=${dependenciesLayerDescription || `${projectName} ${environmentName} backend dependencies`}`,
      `--compatible-runtimes=${dependenciesLayerCompatibleRuntimes}`,
      `--compatible-architectures=${dependenciesLayerCompatibleArchitectures}`,
      `--output=json`,
      ...(dependenciesLayerLicenseInfo ? [`--license-info=${dependenciesLayerLicenseInfo}`] : []),
    ]);
    resolvedDependenciesLayerArn = layerResponse.LayerVersionArn || resolvedDependenciesLayerArn;
  }

  let resolvedAppConfigSecretArn = getArg("app-config-secret-arn", fileParams.AppConfigSecretArn);
  if (appConfigSecretFile) {
    const secretResponse = runNodeJson("scripts/sync-app-config-secret.mjs", [
      `--region=${region}`,
      `--secret-file=${appConfigSecretFile}`,
      ...(appConfigSecretName ? [`--secret-name=${appConfigSecretName}`] : [`--secret-name=${projectName}/${environmentName}/app-config`]),
      ...(appConfigSecretId ? [`--secret-id=${appConfigSecretId}`] : []),
      ...(appConfigSecretDescription ? [`--description=${appConfigSecretDescription}`] : []),
      ...(appConfigSecretKmsKeyId ? [`--kms-key-id=${appConfigSecretKmsKeyId}`] : []),
      "--output=json",
    ]);
    resolvedAppConfigSecretArn = secretResponse.arn || resolvedAppConfigSecretArn;
  }

  if (!resolvedAppConfigSecretArn && !appConfigSecretFile) {
    resolvedAppConfigSecretArn = currentStackParams.AppConfigSecretArn || "";
  }

  const params = {
    ProjectName: projectName,
    EnvironmentName: environmentName,
    LambdaCodeS3Bucket: resolvedArtifactBucket,
    LambdaCodeS3Key: resolvedLambdaCodeS3Key,
    LambdaCodeS3ObjectVersion: resolvedLambdaCodeS3ObjectVersion,
    LambdaHandler: getArg("lambda-handler", fileParams.LambdaHandler),
    LambdaRuntime: getArg("lambda-runtime", fileParams.LambdaRuntime),
    LambdaArchitecture: getArg("lambda-architecture", fileParams.LambdaArchitecture),
    LambdaMemorySize: getArg("lambda-memory-size", fileParams.LambdaMemorySize),
    LambdaTimeout: getArg("lambda-timeout", fileParams.LambdaTimeout),
    LambdaReservedConcurrency: getArg("lambda-reserved-concurrency", fileParams.LambdaReservedConcurrency),
    DependenciesLayerArn: resolvedDependenciesLayerArn,
    ObservabilityLayerArn: resolvedObservabilityLayerArn,
    LambdaNodeOptions: getArg("lambda-node-options", fileParams.LambdaNodeOptions),
    EnableWebSocketApi: getArg("enable-web-socket-api", fileParams.EnableWebSocketApi),
    SocketLambdaHandler: getArg("socket-lambda-handler", fileParams.SocketLambdaHandler),
    SocketLambdaMemorySize: getArg("socket-lambda-memory-size", fileParams.SocketLambdaMemorySize),
    SocketLambdaTimeout: getArg("socket-lambda-timeout", fileParams.SocketLambdaTimeout),
    EnableScheduledWorkers: getArg("enable-scheduled-workers", fileParams.EnableScheduledWorkers),
    Timer15MinLambdaHandler: getArg("timer15-min-lambda-handler", fileParams.Timer15MinLambdaHandler),
    TimerMidnightLambdaHandler: getArg("timer-midnight-lambda-handler", fileParams.TimerMidnightLambdaHandler),
    TimerScheduledTasksLambdaHandler: getArg("timer-scheduled-tasks-lambda-handler", fileParams.TimerScheduledTasksLambdaHandler),
    TimerWebhooksLambdaHandler: getArg("timer-webhooks-lambda-handler", fileParams.TimerWebhooksLambdaHandler),
    TimerLambdaMemorySize: getArg("timer-lambda-memory-size", fileParams.TimerLambdaMemorySize),
    TimerLambdaTimeout: getArg("timer-lambda-timeout", fileParams.TimerLambdaTimeout),
    RunMigrations: getArg("run-migrations", fileParams.RunMigrations),
    MigrationCodeS3Bucket: resolvedMigrationBucket,
    MigrationCodeS3Key: resolvedMigrationCodeS3Key,
    MigrationCodeS3ObjectVersion: resolvedMigrationCodeS3ObjectVersion,
    MigrationHandler: getArg("migration-handler", fileParams.MigrationHandler),
    MigrationRuntime: getArg("migration-runtime", fileParams.MigrationRuntime),
    MigrationMemorySize: getArg("migration-memory-size", fileParams.MigrationMemorySize),
    MigrationTimeout: getArg("migration-timeout", fileParams.MigrationTimeout),
    MigrationTrigger: getArg("migration-trigger", fileParams.MigrationTrigger),
    DatabaseName: getArg("database-name", fileParams.DatabaseName),
    MembershipDatabaseName: getArg("membership-database-name", fileParams.MembershipDatabaseName),
    AttendanceDatabaseName: getArg("attendance-database-name", fileParams.AttendanceDatabaseName),
    ContentDatabaseName: getArg("content-database-name", fileParams.ContentDatabaseName),
    GivingDatabaseName: getArg("giving-database-name", fileParams.GivingDatabaseName),
    MessagingDatabaseName: getArg("messaging-database-name", fileParams.MessagingDatabaseName),
    DoingDatabaseName: getArg("doing-database-name", fileParams.DoingDatabaseName),
    ReportingDatabaseName: getArg("reporting-database-name", fileParams.ReportingDatabaseName),
    DatabaseEngine: getArg("database-engine", fileParams.DatabaseEngine),
    DatabasePort: getArg("database-port", fileParams.DatabasePort),
    DatabaseMasterUsername: getArg("database-master-username", fileParams.DatabaseMasterUsername),
    DatabaseMinCapacity: getArg("database-min-capacity", fileParams.DatabaseMinCapacity),
    DatabaseMaxCapacity: getArg("database-max-capacity", fileParams.DatabaseMaxCapacity),
    ApiCustomDomainName: getArg("api-custom-domain-name", fileParams.ApiCustomDomainName),
    ApiCertificateArn: getArg("api-certificate-arn", fileParams.ApiCertificateArn),
    ApiHostedZoneId: getArg("api-hosted-zone-id", fileParams.ApiHostedZoneId),
    CreateNatGateway: getArg("create-nat-gateway", fileParams.CreateNatGateway),
    VpcCidr: getArg("vpc-cidr", fileParams.VpcCidr),
    PublicSubnet1Cidr: getArg("public-subnet-1-cidr", fileParams.PublicSubnet1Cidr),
    PublicSubnet2Cidr: getArg("public-subnet-2-cidr", fileParams.PublicSubnet2Cidr),
    PrivateSubnet1Cidr: getArg("private-subnet-1-cidr", fileParams.PrivateSubnet1Cidr),
    PrivateSubnet2Cidr: getArg("private-subnet-2-cidr", fileParams.PrivateSubnet2Cidr),
    WebsiteBaseUrl: getArg("website-base-url", fileParams.WebsiteBaseUrl),
    ContentRootUrl: getArg("content-root-url", fileParams.ContentRootUrl),
    B1AdminRootUrl: getArg("b1-admin-root-url", fileParams.B1AdminRootUrl),
    CorsOrigin: getArg("cors-origin", fileParams.CorsOrigin),
    FileStore: getArg("file-store", fileParams.FileStore),
    ManageAssetBucket: getArg("manage-asset-bucket", fileParams.ManageAssetBucket),
    AssetBucketName: getArg("asset-bucket-name", fileParams.AssetBucketName),
    AppConfigSecretArn: resolvedAppConfigSecretArn,
    MailSystem: getArg("mail-system", fileParams.MailSystem),
    DeliveryProvider: getArg("delivery-provider", fileParams.DeliveryProvider),
    StoreApiUrl: getArg("store-api-url", fileParams.StoreApiUrl),
    AiProvider: getArg("ai-provider", fileParams.AiProvider),
    EmailOnRegistration: getArg("email-on-registration", fileParams.EmailOnRegistration),
    CaddyHost: getArg("caddy-host", fileParams.CaddyHost),
    CaddyPort: getArg("caddy-port", fileParams.CaddyPort),
    TransferUrl: getArg("transfer-url", fileParams.TransferUrl),
    SupportEmail: getArg("support-email", fileParams.SupportEmail),
    SupportPhone: getArg("support-phone", fileParams.SupportPhone),
    SupportSiteUrl: getArg("support-site-url", fileParams.SupportSiteUrl),
    MobileAppUrl: getArg("mobile-app-url", fileParams.MobileAppUrl),
    DomainCnameTarget: getArg("domain-cname-target", fileParams.DomainCnameTarget),
    DomainATarget: getArg("domain-a-target", fileParams.DomainATarget),
    DefaultStockPhoto: getArg("default-stock-photo", fileParams.DefaultStockPhoto),
    GoogleAnalyticsTag: getArg("google-analytics-tag", fileParams.GoogleAnalyticsTag),
    SentryDsn: getArg("sentry-dsn", fileParams.SentryDsn),
  };

  if (resolvedBackendArtifactSourceFile && !params.LambdaCodeS3Bucket) {
    console.error("A backend artifact source file was provided or generated, but LambdaCodeS3Bucket is still missing.");
    process.exit(1);
  }

  if (resolvedMigrationArtifactSourceFile && !params.MigrationCodeS3Bucket) {
    console.error("A migration artifact source file was provided or generated, but MigrationCodeS3Bucket is still missing.");
    process.exit(1);
  }

  if (resolvedBackendArtifactSourceFile) {
    requireValue("lambda-code-s3-key", params.LambdaCodeS3Key);
    const uploadResult = runNodeJson("scripts/upload-backend-artifact.mjs", [
      `--region=${region}`,
      `--artifact-bucket=${params.LambdaCodeS3Bucket}`,
      `--source-file=${resolvedBackendArtifactSourceFile}`,
      `--artifact-key=${params.LambdaCodeS3Key}`,
      "--artifact-label=Backend artifact",
      "--output=json",
    ]);
    resolvedLambdaCodeS3ObjectVersion = uploadResult.versionId || resolvedLambdaCodeS3ObjectVersion;
    params.LambdaCodeS3ObjectVersion = resolvedLambdaCodeS3ObjectVersion;
  }

  if (resolvedMigrationArtifactSourceFile) {
    requireValue("migration-code-s3-key", params.MigrationCodeS3Key);
    const uploadResult = runNodeJson("scripts/upload-backend-artifact.mjs", [
      `--region=${region}`,
      `--artifact-bucket=${params.MigrationCodeS3Bucket}`,
      `--source-file=${resolvedMigrationArtifactSourceFile}`,
      `--artifact-key=${params.MigrationCodeS3Key}`,
      "--artifact-label=Migration artifact",
      "--output=json",
    ]);
    resolvedMigrationCodeS3ObjectVersion = uploadResult.versionId || resolvedMigrationCodeS3ObjectVersion;
    params.MigrationCodeS3ObjectVersion = resolvedMigrationCodeS3ObjectVersion;
  }

  requireValue("lambda-code-s3-bucket", params.LambdaCodeS3Bucket);
  requireValue("lambda-code-s3-key", params.LambdaCodeS3Key);
  ensureStackIsDeployable(stackName, region, jsonOutput);

  const deployArgs = [
    "cloudformation",
    "deploy",
    "--stack-name",
    stackName,
    "--template-file",
    templateFile,
    "--region",
    region,
    "--no-fail-on-empty-changeset",
    "--capabilities",
    "CAPABILITY_NAMED_IAM",
    "--parameter-overrides",
    ...toParameterOverrides(params),
  ];
  if (resolvedTemplateBucket) {
    deployArgs.push("--s3-bucket", resolvedTemplateBucket);
  }
  if (cloudformationExecutionRoleArn) {
    deployArgs.push("--role-arn", cloudformationExecutionRoleArn);
  }
  run("aws", deployArgs, { quiet: jsonOutput });

  if (syncLegacySsm) {
    const legacySsmArgs = [
      `--stack-name=${stackName}`,
      `--environment=${environmentName}`,
      `--region=${region}`,
    ];
    if (legacySsmPrefix) legacySsmArgs.push(`--prefix=${legacySsmPrefix}`);
    if (legacySsmIncludeEmpty) legacySsmArgs.push(`--include-empty=${legacySsmIncludeEmpty}`);
    if (legacySsmOverwrite) legacySsmArgs.push(`--overwrite=${legacySsmOverwrite}`);
    if (appConfigSecretFile) legacySsmArgs.push(`--app-config-secret-file=${appConfigSecretFile}`);
    else if (resolvedAppConfigSecretArn) legacySsmArgs.push(`--app-config-secret-arn=${resolvedAppConfigSecretArn}`);
    run("node", ["scripts/sync-legacy-ssm-parameters.mjs", ...legacySsmArgs], { quiet: jsonOutput });
  }

  const outputs = getStackOutputsSafe(stackName, region, "backend stack");
  let apiMigrationsResult = null;
  if (runApiMigrations) {
    const migrationScript = "scripts/run-api-migrations-data-api.mjs";
    const migrationArgs = [
      `--stack-name=${stackName}`,
      `--region=${region}`,
      `--api-repo-path=${apiMigrationApiRepoPath}`,
      `--action=${apiMigrationAction}`,
      `--module=${apiMigrationModule}`,
    ];
    if (apiMigrationDbSecretArn) migrationArgs.push(`--db-secret-arn=${apiMigrationDbSecretArn}`);
    if (apiMigrationDbSecretFile) migrationArgs.push(`--db-secret-file=${apiMigrationDbSecretFile}`);
    if (apiMigrationDryRun) migrationArgs.push("--dry-run=true");
    if (jsonOutput) migrationArgs.push("--output=json");
    apiMigrationsResult = jsonOutput
      ? runNodeJson(migrationScript, migrationArgs)
      : run("node", [migrationScript, ...migrationArgs]);
  }
  let bootstrapAdminResult = null;
  if (runBootstrapAdmin) {
    const bootstrapArgs = [
      `--stack-name=${stackName}`,
      `--region=${region}`,
      `--bootstrap-admin-reset-password=${bootstrapAdminResetPassword}`,
    ];
    if (bootstrapAdminSecretFile) bootstrapArgs.push(`--bootstrap-admin-secret-file=${bootstrapAdminSecretFile}`);
    if (bootstrapAdminSecretArn) bootstrapArgs.push(`--bootstrap-admin-secret-arn=${bootstrapAdminSecretArn}`);
    if (bootstrapAdminEmail) bootstrapArgs.push(`--bootstrap-admin-email=${bootstrapAdminEmail}`);
    if (bootstrapAdminPassword) bootstrapArgs.push(`--bootstrap-admin-password=${bootstrapAdminPassword}`);
    if (bootstrapAdminFirstName) bootstrapArgs.push(`--bootstrap-admin-first-name=${bootstrapAdminFirstName}`);
    if (bootstrapAdminLastName) bootstrapArgs.push(`--bootstrap-admin-last-name=${bootstrapAdminLastName}`);
    if (bootstrapAdminDisplayName) bootstrapArgs.push(`--bootstrap-admin-display-name=${bootstrapAdminDisplayName}`);
    if (bootstrapChurchName) bootstrapArgs.push(`--bootstrap-church-name=${bootstrapChurchName}`);
    if (bootstrapChurchSubdomain) bootstrapArgs.push(`--bootstrap-church-subdomain=${bootstrapChurchSubdomain}`);
    if (bootstrapChurchAddress1) bootstrapArgs.push(`--bootstrap-church-address1=${bootstrapChurchAddress1}`);
    if (bootstrapChurchAddress2) bootstrapArgs.push(`--bootstrap-church-address2=${bootstrapChurchAddress2}`);
    if (bootstrapChurchCity) bootstrapArgs.push(`--bootstrap-church-city=${bootstrapChurchCity}`);
    if (bootstrapChurchState) bootstrapArgs.push(`--bootstrap-church-state=${bootstrapChurchState}`);
    if (bootstrapChurchZip) bootstrapArgs.push(`--bootstrap-church-zip=${bootstrapChurchZip}`);
    if (bootstrapChurchCountry) bootstrapArgs.push(`--bootstrap-church-country=${bootstrapChurchCountry}`);
    if (bootstrapMembershipStatus) bootstrapArgs.push(`--bootstrap-membership-status=${bootstrapMembershipStatus}`);
    if (jsonOutput) bootstrapArgs.push("--output=json");
    bootstrapAdminResult = jsonOutput
      ? runNodeJson("scripts/bootstrap-initial-admin.mjs", bootstrapArgs)
      : run("node", ["scripts/bootstrap-initial-admin.mjs", ...bootstrapArgs]);
  }
  const result = {
    stackName,
    region,
    environmentName,
    resolvedPackageManifestFile,
    resolvedBackendArtifactSourceFile,
    resolvedMigrationArtifactSourceFile,
    resolvedDependenciesLayerSourceFile,
    outputs,
    templateBucket: resolvedTemplateBucket,
    appConfigSecretArn: resolvedAppConfigSecretArn || outputs.AppConfigSecretArn || "",
    lambdaCodeS3Bucket: params.LambdaCodeS3Bucket,
    lambdaCodeS3Key: params.LambdaCodeS3Key,
    migrationCodeS3Bucket: params.MigrationCodeS3Bucket || "",
    migrationCodeS3Key: params.MigrationCodeS3Key || "",
    dependenciesLayerArn: resolvedDependenciesLayerArn || "",
    syncLegacySsm,
    runApiMigrations,
    apiMigrationRunner,
    apiMigrations: apiMigrationsResult,
    runBootstrapAdmin,
    bootstrapAdmin: bootstrapAdminResult,
  };

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  console.log("\nBackend deployment complete.");
  console.log(`Stack: ${stackName}`);
}

main();
