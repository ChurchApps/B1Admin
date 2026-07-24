import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function runJson(command, args) {
  return JSON.parse(execFileSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  }));
}

function run(command, args) {
  return execFileSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function normalizeOutputs(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) return Object.fromEntries(raw.map((output) => [output.OutputKey, output.OutputValue]));
  if (raw.Stacks?.[0]?.Outputs) return normalizeOutputs(raw.Stacks[0].Outputs);
  if (raw.Outputs) return normalizeOutputs(raw.Outputs);
  return raw;
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

function getStackOutputsSafe(stackName, region) {
  if (!stackName) {
    return { ok: true, outputs: {} };
  }

  try {
    return {
      ok: true,
      outputs: getStackOutputs(stackName, region),
    };
  } catch (error) {
    return {
      ok: false,
      outputs: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function loadParamsFile(filePath) {
  if (!filePath) return {};
  const resolved = path.resolve(rootDir, filePath);
  const data = JSON.parse(fs.readFileSync(resolved, "utf8"));
  if (Array.isArray(data)) return Object.fromEntries(data.map((item) => [item.ParameterKey, item.ParameterValue]));
  return data;
}

function loadParamsFileSafe(filePath, label, errors) {
  if (!filePath) return {};

  try {
    return loadParamsFile(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`${label} could not be loaded: ${message}`);
    return {};
  }
}

function getValue(name, params = {}) {
  const cli = getArg(name);
  if (cli !== "") return cli;

  const camelKey = name
    .split("-")
    .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  const pascalKey = camelKey.charAt(0).toUpperCase() + camelKey.slice(1);
  return params[pascalKey] ?? params[camelKey] ?? "";
}

function getEnvironmentValue(params = {}) {
  return getValue("environment", params) || getValue("environment-name", params);
}

function existsLocalFile(filePath) {
  return filePath ? fs.existsSync(path.resolve(rootDir, filePath)) : false;
}

function canReadPath(targetPath) {
  try {
    fs.accessSync(targetPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function readJsonIfExists(filePath) {
  if (!filePath) return null;
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function tryReadJsonIfExists(filePath) {
  if (!filePath) return { data: null, error: "" };
  if (!fs.existsSync(filePath)) return { data: null, error: "" };

  try {
    return {
      data: JSON.parse(fs.readFileSync(filePath, "utf8")),
      error: "",
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function tryReadTextIfExists(filePath) {
  if (!filePath) return { data: "", error: "" };
  if (!fs.existsSync(filePath)) return { data: "", error: "" };

  try {
    return {
      data: fs.readFileSync(filePath, "utf8"),
      error: "",
    };
  } catch (error) {
    return {
      data: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function tryExec(command, args) {
  try {
    return { ok: true, output: run(command, args) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function resolveManifestArtifactPath(manifestFilePath, artifactPath) {
  if (!artifactPath) return "";
  if (path.isAbsolute(artifactPath)) return artifactPath;
  return path.resolve(path.dirname(manifestFilePath), artifactPath);
}

function validateLocalAppConfigSecret(filePath) {
  const resolved = path.resolve(rootDir, filePath);
  const raw = fs.readFileSync(resolved, "utf8");
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Secret file must contain a JSON object.");
  }

  const requiredKeys = ["jwtSecret", "encryptionKey"];
  const missingRequiredKeys = requiredKeys.filter((key) => typeof parsed[key] !== "string" || parsed[key].trim() === "");
  if (missingRequiredKeys.length > 0) {
    throw new Error(`Missing required non-empty string keys: ${missingRequiredKeys.join(", ")}`);
  }

  return parsed;
}

function deriveArtifactKey(projectName, environmentName, fileName) {
  return `${projectName}/${environmentName}/backend/${fileName}`;
}

function validateS3BucketName(label, value, errors) {
  if (!value) return;

  const looksLikeIpv4Address = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value);
  const validCharacters = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value);
  const hasAdjacentPeriods = value.includes("..");
  const hasDashPeriodCombo = value.includes("-.") || value.includes(".-");

  if (value.length < 3 || value.length > 63 || looksLikeIpv4Address || !validCharacters || hasAdjacentPeriods || hasDashPeriodCombo) {
    errors.push(`${label} must be a valid S3 bucket name when provided explicitly.`);
  }
}

function validateApiMigrationDbSecretObject(parsedSecret, errors) {
  if (!parsedSecret || typeof parsedSecret !== "object" || Array.isArray(parsedSecret)) {
    errors.push("API migration DB secret file must contain a JSON object.");
    return;
  }

  if (typeof parsedSecret.username !== "string" || parsedSecret.username.trim() === "") {
    errors.push("API migration DB secret file is missing a non-empty username.");
  }

  if (typeof parsedSecret.password !== "string" || parsedSecret.password.trim() === "") {
    errors.push("API migration DB secret file is missing a non-empty password.");
  }
}

function getApiMigrationRequiredOutputKeys(moduleName) {
  const moduleOutputKeys = {
    membership: "MembershipDatabaseName",
    attendance: "AttendanceDatabaseName",
    content: "ContentDatabaseName",
    giving: "GivingDatabaseName",
    messaging: "MessagingDatabaseName",
    doing: "DoingDatabaseName",
    reporting: "ReportingDatabaseName",
  };

  const baseKeys = ["DatabaseEndpoint", "DatabasePort"];
  if (moduleName === "all") {
    return [...baseKeys, ...Object.values(moduleOutputKeys)];
  }

  return [...baseKeys, moduleOutputKeys[moduleName]].filter(Boolean);
}

function buildApiMigrationCommand(runner, args) {
  if (runner === "data-api") {
    return `node scripts/run-api-migrations-data-api.mjs ${args.join(" ")}`;
  }

  return `yarn run:api-migrations -- ${args.join(" ")}`;
}

function loadApiRepoMigrationModules(apiRepoPath) {
  const kyselyConfigPath = path.join(apiRepoPath, "tools", "kysely-config.ts");
  if (!fs.existsSync(kyselyConfigPath)) return [];

  try {
    const source = fs.readFileSync(kyselyConfigPath, "utf8");
    const match = source.match(/const\s+MODULES\s*=\s*\[(.*?)\]\s+as const/s);
    if (!match) return [];

    return Array.from(match[1].matchAll(/"([^"]+)"/g)).map((item) => item[1]);
  } catch {
    return [];
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
  } catch {
    return [];
  }
}

function main() {
  const errors = [];
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const stackName = getArg("stack-name");
  const bootstrapStackName = getArg("bootstrap-stack-name");
  const backendParametersFile = getArg("backend-parameters-file");
  const frontendParametersFile = getArg("frontend-parameters-file");
  const parametersFile = getArg("parameters-file");
  const fullStackParametersFile = parametersFile;
  const mode = getArg("mode", "full-stack");
  const splitStackMode = mode === "split-stack" || mode === "aws";
  const frontendPublishMode = mode === "frontend-publish" || mode === "publish-frontend";
  const bootstrapMode = mode === "bootstrap";
  const apiMigrationsMode = mode === "api-migrations" || mode === "run-api-migrations";
  const apiRepoPathArg = getArg("api-repo-path");
  const packageManifestFile = getArg("package-manifest-file");
  const packageManifestPath = packageManifestFile ? path.resolve(rootDir, packageManifestFile) : "";
  const packageManifestResult = tryReadJsonIfExists(packageManifestPath);
  const packageManifest = packageManifestResult.data;
  const packageManifestBackendArtifactPath = resolveManifestArtifactPath(packageManifestPath, packageManifest?.backendArtifactPath || "");
  const packageManifestMigrationArtifactPath = resolveManifestArtifactPath(packageManifestPath, packageManifest?.migrationArtifactPath || "");
  const packageManifestDependenciesLayerArtifactPath = resolveManifestArtifactPath(packageManifestPath, packageManifest?.dependenciesLayerArtifactPath || "");
  const packageApiBackend = !apiMigrationsMode && !packageManifestFile && (apiRepoPathArg !== "" || getArg("package-api-backend", "false").toLowerCase() === "true");
  const packageMode = getArg("package-mode", "self-contained");
  const checkAws = getArg("check-aws", "false").toLowerCase() === "true";
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";
  const infrastructureOnly = process.argv.includes("--infrastructure-only");
  const frontendInfrastructureOnly = process.argv.includes("--frontend-infrastructure-only");
  const skipInfrastructure = process.argv.includes("--skip-infrastructure");
  const publishFrontendAssets = process.argv.includes("--publish-frontend-assets");
  const skipBackend = process.argv.includes("--skip-backend");
  const skipFrontend = process.argv.includes("--skip-frontend");
  const backendParams = loadParamsFileSafe(backendParametersFile, "Backend parameters file", errors);
  const frontendParams = loadParamsFileSafe(frontendParametersFile, "Frontend parameters file", errors);
  const fullStackParams = loadParamsFileSafe(parametersFile, "Parameters file", errors);
  const apiRepoPath = apiRepoPathArg ? path.resolve(rootDir, apiRepoPathArg) : "";
  const apiRepoPackageResult = tryReadJsonIfExists(apiRepoPath ? path.join(apiRepoPath, "package.json") : "");
  const apiRepoPackage = apiRepoPackageResult.data;
  const apiRepoLayerPackageResult = tryReadJsonIfExists(apiRepoPath ? path.join(apiRepoPath, "tools", "layer-package.json") : "");
  const apiRepoLayerPackage = apiRepoLayerPackageResult.data;
  const apiRepoServerlessResult = tryReadTextIfExists(apiRepoPath ? path.join(apiRepoPath, "serverless.yml") : "");
  const apiRepoServerlessText = apiRepoServerlessResult.data;
  const splitStackPublishOnly = splitStackMode && publishFrontendAssets && skipBackend && skipFrontend;
  const fullStackPublishOnly = mode === "full-stack" && skipInfrastructure && publishFrontendAssets;
  const backendRelevant = !bootstrapMode && mode !== "frontend" && !frontendPublishMode && !apiMigrationsMode && !fullStackPublishOnly && !splitStackPublishOnly;
  const params = mode === "backend"
    ? backendParams
    : mode === "frontend"
      ? frontendParams
      : bootstrapMode
        ? fullStackParams
      : splitStackMode
        ? backendParams
        : fullStackParams;
  const projectName = getValue("project-name", params) || frontendParams.ProjectName || "b1admin";
  const environmentName = getEnvironmentValue(params) || frontendParams.EnvironmentName || "prod";
  const frontendProjectName = getValue("project-name", frontendParams) || projectName;
  const frontendEnvironmentName = getEnvironmentValue(frontendParams) || environmentName;
  const frontendParamMode = mode === "frontend" || splitStackMode;
  const frontendValidationParams = mode === "frontend"
    ? frontendParams
    : splitStackMode
      ? frontendParams
      : params;
  const frontendOutputsFile = getArg("frontend-outputs-file");
  const frontendPublishStackName = getArg("stack-name");
  const frontendPublishBucket = getArg("bucket");
  const frontendPublishDistributionId = getArg("distribution-id");
  const frontendOutputsFileResult = tryReadJsonIfExists(frontendOutputsFile ? path.resolve(rootDir, frontendOutputsFile) : "");
  const frontendOutputsFromFile = normalizeOutputs(frontendOutputsFileResult.data);
  const frontendOutputsFileBucket = frontendOutputsFromFile.SiteBucketName || frontendOutputsFromFile.FrontendBucketName || "";
  const frontendOutputsFileDistributionId = frontendOutputsFromFile.CloudFrontDistributionId || frontendOutputsFromFile.FrontendDistributionId || "";
  const backendOutputsFile = getArg("backend-outputs-file");
  const skipBuild = process.argv.includes("--skip-build");
  let fullStackPublishOutputs = {};
  const apiMigrationStackName = getArg("stack-name");
  const apiMigrationOutputsFile = getArg("outputs-file");

  const shouldLookupBootstrapStack = Boolean(
    bootstrapStackName
    && !bootstrapMode
    && !frontendPublishMode
    && !apiMigrationsMode
    && !fullStackPublishOnly
    && !splitStackPublishOnly
  );
  const bootstrapStackLookup = shouldLookupBootstrapStack
    ? getStackOutputsSafe(bootstrapStackName, region)
    : { ok: true, outputs: {} };
  const bootstrapOutputs = bootstrapStackLookup.outputs;
  const templateBucket = bootstrapMode
    ? getValue("template-bucket-name", params)
    : getValue("template-bucket", params) || bootstrapOutputs.TemplateBucketName || "";
  const artifactBucket = bootstrapMode
    ? getValue("artifact-bucket-name", params)
    : getValue("lambda-code-s3-bucket", params) || bootstrapOutputs.ArtifactBucketName || "";
  const artifactSource = getArg("backend-artifact-source-file");
  const resolvedArtifactSource = artifactSource || packageManifestBackendArtifactPath;
  const explicitArtifactKey = getValue("lambda-code-s3-key", params) || getArg("backend-artifact-key");
  const artifactKey = explicitArtifactKey || ((resolvedArtifactSource || packageApiBackend || packageManifestFile) ? deriveArtifactKey(projectName, environmentName, "api.zip") : "");
  const dependenciesLayerSource = getArg("dependencies-layer-source-file");
  const resolvedDependenciesLayerSource = dependenciesLayerSource || packageManifestDependenciesLayerArtifactPath;
  const appConfigSecretFile = getArg("app-config-secret-file");
  const syncLegacySsm = getArg("sync-legacy-ssm", "false").toLowerCase() === "true";
  const runApiMigrations = getArg("run-api-migrations", "false").toLowerCase() === "true";
  const standaloneMigrationActionArg = apiMigrationsMode ? getArg("action") : "";
  const standaloneMigrationModuleArg = apiMigrationsMode ? getArg("module") : "";
  const apiMigrationAction = getArg("api-migration-action", standaloneMigrationActionArg || "up");
  const apiMigrationModule = getArg("api-migration-module", standaloneMigrationModuleArg || "all");
  const apiMigrationRunner = getArg("api-migration-runner", "direct");
  const apiMigrationApiRepoPathArg = getArg("api-migration-api-repo-path", apiRepoPathArg || "../Api");
  const apiMigrationApiRepoPath = path.resolve(rootDir, apiMigrationApiRepoPathArg);
  const standaloneMigrationDbSecretArn = apiMigrationsMode ? getArg("db-secret-arn") : "";
  const standaloneMigrationDbSecretFile = apiMigrationsMode ? getArg("db-secret-file") : "";
  const apiMigrationDbSecretArn = getArg("api-migration-db-secret-arn", standaloneMigrationDbSecretArn);
  const apiMigrationDbSecretFile = getArg("api-migration-db-secret-file", standaloneMigrationDbSecretFile);
  const standaloneMigrationDryRun = apiMigrationsMode ? getArg("dry-run") : "";
  const apiMigrationDryRun = getArg("api-migration-dry-run", standaloneMigrationDryRun || "false").toLowerCase() === "true";
  const migrationValidationRequested = runApiMigrations || apiMigrationsMode;
  const createNatGateway = (getValue("create-nat-gateway", params) || "true").toLowerCase();
  const runMigrations = (getValue("run-migrations", params) || "false").toLowerCase() === "true";
  const migrationBucket = getValue("migration-code-s3-bucket", params) || artifactBucket;
  const migrationSource = getArg("migration-artifact-source-file");
  const resolvedMigrationSource = migrationSource || packageManifestMigrationArtifactPath;
  const explicitMigrationKey = getValue("migration-code-s3-key", params);
  const migrationKey = explicitMigrationKey || (resolvedMigrationSource ? deriveArtifactKey(projectName, environmentName, "migrations.zip") : "");
  const migrationHandler = getValue("migration-handler", params);
  const frontendDomain = frontendParamMode
    ? getValue("alternate-domain-name", frontendValidationParams)
    : getValue("frontend-alternate-domain-name", params);
  const frontendCert = frontendParamMode
    ? getValue("acm-certificate-arn", frontendValidationParams)
    : getValue("frontend-acm-certificate-arn", params);
  const frontendZone = frontendParamMode
    ? getValue("hosted-zone-id", frontendValidationParams)
    : getValue("frontend-hosted-zone-id", params);
  const apiDomain = getValue("api-custom-domain-name", params);
  const apiCert = getValue("api-certificate-arn", params);
  const apiZone = getValue("api-hosted-zone-id", params);
  const lambdaHandler = getValue("lambda-handler", params);
  const lambdaRuntime = getValue("lambda-runtime", params);
  const dependenciesLayerArn = getValue("dependencies-layer-arn", params);
  const observabilityLayerArn = getValue("observability-layer-arn", params);
  const lambdaNodeOptions = getValue("lambda-node-options", params);
  const databaseEngine = getValue("database-engine", params);
  const databasePort = getValue("database-port", params);
  const enableWebSocketApi = (getValue("enable-web-socket-api", params) || "true").toLowerCase();
  const enableScheduledWorkers = (getValue("enable-scheduled-workers", params) || "true").toLowerCase();
  const appConfigSecretArn = getValue("app-config-secret-arn", params);
  const aiProvider = getValue("ai-provider", params);
  const emailOnRegistration = getValue("email-on-registration", params);
  const caddyHost = getValue("caddy-host", params);
  const caddyPort = getValue("caddy-port", params);
  const fileStore = getValue("file-store", params);
  const manageAssetBucket = (getValue("manage-asset-bucket", params) || "true").toLowerCase();
  const contentRootUrl = getValue("content-root-url", params);

  const info = [];
  const warnings = [];
  let apiRepoFallbackSuggested = false;
  let apiMigrationRepoFallbackSuggested = false;
  let detectedApiRepoMigrationModules = [];
  let detectedApiRepoMigrationDirectories = [];

  info.push(`Mode: ${mode}`);
  info.push(`Region: ${region}`);
  if (splitStackMode) info.push("Split-stack validation: backend + frontend");
  if (frontendPublishMode) info.push("Frontend asset publish validation");
  if (apiMigrationsMode) info.push(`Standalone Api migration validation (${apiMigrationRunner})`);
  if (splitStackPublishOnly) info.push("Split-stack publish-only follow-up: backend and frontend deploy steps will be skipped.");
  if (fullStackPublishOnly) info.push("Full-stack publish-only follow-up: infrastructure changes will be skipped.");
  if (infrastructureOnly) info.push("Infrastructure-only deploy requested.");
  if (frontendInfrastructureOnly) info.push("Frontend infrastructure-only deploy requested.");
  if (skipInfrastructure) info.push("Infrastructure deploy step will be skipped.");
  if (bootstrapMode && stackName) info.push(`Bootstrap deploy stack: ${stackName}`);
  if (bootstrapStackName) info.push(`Bootstrap stack: ${bootstrapStackName}`);
  if (apiRepoPath) info.push(`API repo path: ${apiRepoPath}`);
  if (packageApiBackend) info.push(`Auto-package backend: true (${packageMode})`);
  if (packageManifestFile) info.push(`Package manifest file: ${packageManifestPath}`);
  if (templateBucket) info.push(`Template bucket: ${templateBucket}`);
  if (artifactBucket) info.push(`Artifact bucket: ${artifactBucket}`);
  if (artifactKey) info.push(`Artifact key: ${artifactKey}${explicitArtifactKey ? "" : " (derived default)"}`);
  if (migrationBucket && migrationBucket !== artifactBucket) info.push(`Migration artifact bucket: ${migrationBucket}`);
  if (migrationKey) info.push(`Migration artifact key: ${migrationKey}${explicitMigrationKey ? "" : " (derived default)"}`);
  if (appConfigSecretArn) info.push(`App config secret ARN: ${appConfigSecretArn}`);
  if (appConfigSecretFile) info.push(`App config secret file: ${path.resolve(rootDir, appConfigSecretFile)}`);
  if (syncLegacySsm) info.push("Legacy SSM sync requested after deploy.");
  if (runApiMigrations) info.push(`API migrations requested after deploy: action=${apiMigrationAction}, module=${apiMigrationModule}`);
  if (migrationValidationRequested) info.push(`API migration runner: ${apiMigrationRunner}`);
  if (runApiMigrations) info.push(`API migration repo path: ${apiMigrationApiRepoPath}`);
  if (apiMigrationDbSecretArn) info.push(`API migration DB secret ARN: ${apiMigrationDbSecretArn}`);
  if (apiMigrationDbSecretFile) info.push(`API migration DB secret file: ${path.resolve(rootDir, apiMigrationDbSecretFile)}`);
  if (apiMigrationsMode) info.push(`API migration action: ${apiMigrationAction}`);
  if (apiMigrationsMode) info.push(`API migration module: ${apiMigrationModule}`);
  if (apiMigrationsMode) info.push(`API migration repo path: ${apiMigrationApiRepoPath}`);
  if (apiMigrationsMode && apiMigrationStackName) info.push(`API migration stack: ${apiMigrationStackName}`);
  if (apiMigrationsMode && apiMigrationOutputsFile) info.push(`API migration outputs file: ${path.resolve(rootDir, apiMigrationOutputsFile)}`);
  if (apiMigrationsMode && apiMigrationDbSecretArn) info.push(`API migration DB secret ARN: ${apiMigrationDbSecretArn}`);
  if (apiMigrationsMode && apiMigrationDbSecretFile) info.push(`API migration DB secret file: ${path.resolve(rootDir, apiMigrationDbSecretFile)}`);
  if (apiMigrationsMode && apiMigrationDryRun) info.push("Standalone API migration helper is in dry-run mode.");
  if (dependenciesLayerArn) info.push(`Dependencies layer ARN: ${dependenciesLayerArn}`);
  if (observabilityLayerArn) info.push(`Observability layer ARN: ${observabilityLayerArn}`);
  if (dependenciesLayerSource) info.push(`Dependencies layer source file: ${path.resolve(rootDir, dependenciesLayerSource)}`);
  if (frontendOutputsFile) info.push(`Frontend outputs file: ${path.resolve(rootDir, frontendOutputsFile)}`);
  if (backendOutputsFile) info.push(`Backend outputs file: ${path.resolve(rootDir, backendOutputsFile)}`);
  if ((frontendPublishMode || fullStackPublishOnly) && frontendPublishStackName) info.push(`Frontend publish stack: ${frontendPublishStackName}`);
  if (frontendPublishBucket) info.push(`Frontend publish bucket: ${frontendPublishBucket}`);
  if (frontendPublishDistributionId) info.push(`Frontend distribution ID: ${frontendPublishDistributionId}`);
  if (skipBackend) info.push("Backend deploy step will be skipped.");
  if (skipFrontend) info.push("Frontend deploy step will be skipped.");
  if (skipBuild) info.push("Frontend publish will skip build.");

  if (bootstrapStackName && !bootstrapStackLookup.ok) {
    errors.push(`Bootstrap stack "${bootstrapStackName}" could not be read: ${bootstrapStackLookup.error}`);
  }

  if (bootstrapMode && templateBucket) {
    validateS3BucketName("TemplateBucketName", templateBucket, errors);
  }

  if (bootstrapMode && artifactBucket) {
    validateS3BucketName("ArtifactBucketName", artifactBucket, errors);
  }

  if (bootstrapMode && templateBucket && artifactBucket && templateBucket === artifactBucket) {
    errors.push("TemplateBucketName and ArtifactBucketName must be different when both are set explicitly.");
  }

  if (bootstrapMode && !templateBucket) {
    info.push("TemplateBucketName is not set explicitly. CloudFormation will generate the template bucket name.");
  }

  if (bootstrapMode && !artifactBucket) {
    info.push("ArtifactBucketName is not set explicitly. CloudFormation will generate the artifact bucket name.");
  }

  if (shouldLookupBootstrapStack && bootstrapStackLookup.ok) {
    if (mode === "full-stack" && !bootstrapOutputs.TemplateBucketName) {
      errors.push(`Bootstrap stack "${bootstrapStackName}" is missing TemplateBucketName.`);
    }
    if (backendRelevant && !bootstrapOutputs.ArtifactBucketName) {
      errors.push(`Bootstrap stack "${bootstrapStackName}" is missing ArtifactBucketName.`);
    }
  }

  if (mode === "full-stack" && !skipInfrastructure && !templateBucket) {
    errors.push("No template bucket resolved. Pass --template-bucket, provide TemplateBucketName in the parameters file, or use --bootstrap-stack-name.");
  }

  if (backendRelevant && !artifactBucket) {
    errors.push("No artifact bucket resolved. Pass --lambda-code-s3-bucket, include LambdaCodeS3Bucket in the parameters file, or use --bootstrap-stack-name.");
  }

  if (backendRelevant && !artifactKey) {
    warnings.push("No Lambda artifact key resolved yet. Pass LambdaCodeS3Key or provide a backend artifact source/auto-packaging path so the wrappers can derive a default key.");
  }

  if (backendRelevant && fileStore === "S3" && !getValue("asset-bucket-name", params) && manageAssetBucket !== "true") {
    errors.push("FileStore=S3 but no AssetBucketName is set and ManageAssetBucket is not true. The backend will not have a content bucket.");
  }

  if (backendRelevant && fileStore === "S3" && !contentRootUrl && !getValue("asset-bucket-name", params) && manageAssetBucket === "true") {
    info.push("ContentRootUrl will be inferred from the managed asset bucket because FileStore=S3, ManageAssetBucket=true, and no explicit ContentRootUrl was provided.");
  }

  if (backendRelevant && resolvedArtifactSource && !existsLocalFile(resolvedArtifactSource)) {
    errors.push(`Backend artifact source file not found: ${path.resolve(rootDir, resolvedArtifactSource)}`);
  }

  if (backendRelevant && resolvedDependenciesLayerSource && !existsLocalFile(resolvedDependenciesLayerSource)) {
    errors.push(`Dependencies layer source file not found: ${path.resolve(rootDir, resolvedDependenciesLayerSource)}`);
  }

  if (backendRelevant && appConfigSecretFile && !existsLocalFile(appConfigSecretFile)) {
    errors.push(`App config secret file not found: ${path.resolve(rootDir, appConfigSecretFile)}`);
  }

  if (backendRelevant && appConfigSecretFile && existsLocalFile(appConfigSecretFile)) {
    try {
      validateLocalAppConfigSecret(appConfigSecretFile);
    } catch (error) {
      errors.push(`App config secret file is invalid: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (backendRelevant && resolvedMigrationSource && !existsLocalFile(resolvedMigrationSource)) {
    errors.push(`Migration artifact source file not found: ${path.resolve(rootDir, resolvedMigrationSource)}`);
  }

  if (backendRelevant && runMigrations && !migrationHandler) {
    errors.push("RunMigrations=true but no MigrationHandler was provided.");
  }

  if (backendRelevant && resolvedMigrationSource && !migrationKey) {
    errors.push("A migration artifact source file was provided but no MigrationCodeS3Key could be resolved.");
  }

  if (backendRelevant && runMigrations && migrationKey && !migrationBucket) {
    errors.push("RunMigrations=true with MigrationCodeS3Key set, but no migration artifact bucket could be resolved.");
  }

  if (backendRelevant && syncLegacySsm && !appConfigSecretFile && !appConfigSecretArn) {
    warnings.push("Legacy SSM sync is enabled without an app-config secret source. The helper can still write database connection parameters, but non-database secret/config paths like jwtSecret and provider keys will be skipped.");
  }

  if (runApiMigrations && (mode === "bootstrap" || mode === "frontend" || frontendPublishMode)) {
    errors.push("RunApiMigrations is only supported for backend, split-stack, and full-stack deploy flows.");
  }

  if (runApiMigrations && splitStackMode && skipBackend) {
    errors.push("Split-stack --run-api-migrations requires the backend deploy step. Remove --skip-backend or run yarn run:api-migrations separately afterward.");
  }

  if (runApiMigrations && mode === "full-stack" && skipInfrastructure) {
    errors.push("Full-stack --run-api-migrations is only supported during the infrastructure deploy phase. Remove --skip-infrastructure or run yarn run:api-migrations separately afterward.");
  }

  if (migrationValidationRequested && !["up", "down", "status"].includes(apiMigrationAction)) {
    errors.push(`Invalid api-migration-action "${apiMigrationAction}". Use up, down, or status.`);
  }

  if (migrationValidationRequested && apiMigrationModule !== "all" && !["membership", "attendance", "content", "giving", "messaging", "doing", "reporting"].includes(apiMigrationModule)) {
    errors.push(`Invalid api-migration-module "${apiMigrationModule}". Use all, membership, attendance, content, giving, messaging, doing, or reporting.`);
  }

  if (migrationValidationRequested && !["direct", "data-api"].includes(apiMigrationRunner)) {
    errors.push(`Invalid api-migration-runner "${apiMigrationRunner}". Use direct or data-api.`);
  }

  if (migrationValidationRequested && !fs.existsSync(apiMigrationApiRepoPath)) {
    errors.push(`API migration repo path not found: ${apiMigrationApiRepoPath}`);
  }

  if (migrationValidationRequested && fs.existsSync(apiMigrationApiRepoPath)) {
    if (!canReadPath(apiMigrationApiRepoPath)) {
      errors.push(`API migration repo path is not readable: ${apiMigrationApiRepoPath}`);
      apiMigrationRepoFallbackSuggested = true;
    }
    const apiRepoMigrationModules = loadApiRepoMigrationModules(apiMigrationApiRepoPath);
    const apiRepoMigrationDirectories = loadApiRepoMigrationDirectories(apiMigrationApiRepoPath);
    detectedApiRepoMigrationModules = apiRepoMigrationModules;
    detectedApiRepoMigrationDirectories = apiRepoMigrationDirectories;
    if (!fs.existsSync(path.join(apiMigrationApiRepoPath, "package.json"))) {
      errors.push(`API migration repo is missing package.json: ${path.join(apiMigrationApiRepoPath, "package.json")}`);
    } else if (!canReadPath(path.join(apiMigrationApiRepoPath, "package.json"))) {
      errors.push(`API migration repo package.json is not readable: ${path.join(apiMigrationApiRepoPath, "package.json")}`);
      apiMigrationRepoFallbackSuggested = true;
    }
    if (apiMigrationRunner === "direct") {
      if (!fs.existsSync(path.join(apiMigrationApiRepoPath, "tools", "migrate.ts"))) {
        errors.push(`API migration repo is missing tools/migrate.ts: ${path.join(apiMigrationApiRepoPath, "tools", "migrate.ts")}`);
      } else if (!canReadPath(path.join(apiMigrationApiRepoPath, "tools", "migrate.ts"))) {
        errors.push(`API migration repo migrate tool is not readable: ${path.join(apiMigrationApiRepoPath, "tools", "migrate.ts")}`);
      }
      if (!fs.existsSync(path.join(apiMigrationApiRepoPath, "node_modules"))) {
        errors.push(`API migration repo dependencies are not installed: ${path.join(apiMigrationApiRepoPath, "node_modules")}`);
      } else if (!canReadPath(path.join(apiMigrationApiRepoPath, "node_modules"))) {
        errors.push(`API migration repo dependencies are not readable: ${path.join(apiMigrationApiRepoPath, "node_modules")}`);
        apiMigrationRepoFallbackSuggested = true;
      }
    } else {
      const localTypescriptPath = path.join(rootDir, "node_modules", "typescript", "package.json");
      if (!fs.existsSync(localTypescriptPath)) {
        errors.push(`B1Admin is missing typescript for Data API migrations: ${localTypescriptPath}`);
      } else if (!canReadPath(localTypescriptPath)) {
        errors.push(`B1Admin typescript package is not readable: ${localTypescriptPath}`);
      }
    }
    if (apiRepoMigrationModules.length > 0) {
      info.push(`API repo migration modules: ${apiRepoMigrationModules.join(", ")}`);
      if (apiMigrationModule === "all" && !apiRepoMigrationModules.includes("reporting")) {
        warnings.push("The current Api repo's --module=all migration set does not include reporting. Run --module=reporting separately only after the backend repo adds reporting migration support.");
      }
      if (apiMigrationModule !== "all" && !apiRepoMigrationModules.includes(apiMigrationModule)) {
        warnings.push(`The current Api repo's --module=all migration set does not include ${apiMigrationModule}. That module may still be invokable directly, but it is outside the repo's normal aggregate migration path.`);
      }
    }
    if (apiRepoMigrationDirectories.length > 0) {
      info.push(`API repo migration directories: ${apiRepoMigrationDirectories.join(", ")}`);
      if (apiMigrationModule !== "all" && !apiRepoMigrationDirectories.includes(apiMigrationModule)) {
        if (apiMigrationDryRun) {
          warnings.push(`The current Api repo has no tools/migrations/${apiMigrationModule} directory. A ${apiMigrationRunner} migration run for ${apiMigrationModule} will currently skip without applying anything.`);
        } else {
          errors.push(`The current Api repo has no tools/migrations/${apiMigrationModule} directory. ${apiMigrationRunner === "direct" ? "Direct" : "Data API"} ${apiMigrationModule} migrations are not currently runnable outside dry-run mode.`);
        }
      }
    }
  }

  if (migrationValidationRequested && apiMigrationDbSecretFile && !existsLocalFile(apiMigrationDbSecretFile)) {
    errors.push(`API migration DB secret file not found: ${path.resolve(rootDir, apiMigrationDbSecretFile)}`);
  }

  if (migrationValidationRequested && apiMigrationDbSecretFile && existsLocalFile(apiMigrationDbSecretFile)) {
    const parsedSecret = readJsonIfExists(path.resolve(rootDir, apiMigrationDbSecretFile));
    validateApiMigrationDbSecretObject(parsedSecret, errors);
  }

  if (apiMigrationsMode) {
    if (!apiMigrationStackName && !apiMigrationOutputsFile) {
      errors.push("Api-migrations mode needs --stack-name or --outputs-file.");
    }

    if (apiMigrationStackName && apiMigrationOutputsFile) {
      warnings.push("Api-migrations mode received both --stack-name and --outputs-file. The helper can use both, but that is usually redundant.");
    }

    if (apiMigrationOutputsFile && !existsLocalFile(apiMigrationOutputsFile)) {
      errors.push(`API migration outputs file not found: ${path.resolve(rootDir, apiMigrationOutputsFile)}`);
    }

    if (apiMigrationOutputsFile && existsLocalFile(apiMigrationOutputsFile)) {
      const parsedOutputs = readJsonIfExists(path.resolve(rootDir, apiMigrationOutputsFile));
      const normalizedOutputs = normalizeOutputs(parsedOutputs);
      const requiredOutputKeys = getApiMigrationRequiredOutputKeys(apiMigrationModule);
      const missingOutputKeys = requiredOutputKeys.filter((key) => typeof normalizedOutputs[key] !== "string" || normalizedOutputs[key].trim() === "");
      if (missingOutputKeys.length > 0) {
        errors.push(`API migration outputs file is missing required outputs: ${missingOutputKeys.join(", ")}`);
      }
      if (
        apiMigrationRunner === "data-api"
        && !apiMigrationDbSecretArn
        && (typeof normalizedOutputs.DatabaseSecretArn !== "string" || normalizedOutputs.DatabaseSecretArn.trim() === "")
      ) {
        errors.push("Data API migration outputs file must include DatabaseSecretArn unless you provide --db-secret-arn.");
      } else if (!apiMigrationDbSecretArn && !apiMigrationDbSecretFile && (typeof normalizedOutputs.DatabaseSecretArn !== "string" || normalizedOutputs.DatabaseSecretArn.trim() === "")) {
        errors.push("API migration outputs file must include DatabaseSecretArn unless you provide --db-secret-arn or --db-secret-file.");
      }
    }

    if (!apiMigrationDbSecretArn && !apiMigrationDbSecretFile) {
      info.push("API migrations will resolve the database secret from stack/outputs metadata if available.");
    } else if (apiMigrationRunner === "data-api" && apiMigrationDbSecretFile && !apiMigrationDbSecretArn) {
      warnings.push("Data API migrations cannot use a raw DB secret file by itself. Provide --db-secret-arn or rely on DatabaseSecretArn from stack outputs.");
    }

    if (apiMigrationDbSecretFile && !existsLocalFile(apiMigrationDbSecretFile)) {
      errors.push(`API migration DB secret file not found: ${path.resolve(rootDir, apiMigrationDbSecretFile)}`);
    }

    if (apiMigrationDbSecretFile && existsLocalFile(apiMigrationDbSecretFile)) {
      const parsedSecret = readJsonIfExists(path.resolve(rootDir, apiMigrationDbSecretFile));
      validateApiMigrationDbSecretObject(parsedSecret, errors);
    }
  }

  if (apiDomain && !apiCert) {
    errors.push("ApiCustomDomainName is set but ApiCertificateArn is missing.");
  }

  if (apiDomain && !apiZone) {
    warnings.push("ApiCustomDomainName is set but ApiHostedZoneId is missing. The API custom domain can still be created, but Route53 alias records will not be managed.");
  }

  if (frontendDomain && !frontendCert) {
    errors.push(
      frontendParamMode
        ? "AlternateDomainName is set but AcmCertificateArn is missing."
        : "FrontendAlternateDomainName is set but FrontendAcmCertificateArn is missing."
    );
  }

  if (frontendZone && !frontendDomain) {
    errors.push("A frontend hosted zone ID was provided but no frontend custom domain was configured.");
  }

  if (mode === "full-stack" && !skipInfrastructure && !artifactKey) {
    errors.push("Full-stack mode needs a LambdaCodeS3Key, a --backend-artifact-key, or a backend artifact source/auto-packaging path so the wrapper can derive one.");
  }

  if (mode === "full-stack" && skipInfrastructure && !publishFrontendAssets) {
    errors.push("Full-stack --skip-infrastructure is only valid together with --publish-frontend-assets.");
  }

  if (mode === "full-stack" && publishFrontendAssets && infrastructureOnly) {
    errors.push("Full-stack --publish-frontend-assets cannot be combined with --infrastructure-only. Provision infrastructure first, then run a later publish-only phase with --skip-infrastructure --publish-frontend-assets.");
  }

  if (mode === "full-stack" && publishFrontendAssets && frontendInfrastructureOnly) {
    errors.push("Full-stack --publish-frontend-assets cannot be combined with --frontend-infrastructure-only. Use --frontend-infrastructure-only for the hosting-only phase, then run a later publish-only phase with --skip-infrastructure --publish-frontend-assets.");
  }

  if (mode === "full-stack" && publishFrontendAssets && !skipInfrastructure) {
    errors.push("Full-stack --publish-frontend-assets is only needed for the later publish-only phase. Omit it for a normal full-stack deploy, or pair it with --skip-infrastructure for the second phase.");
  }

  if (mode === "full-stack" && skipInfrastructure && infrastructureOnly) {
    errors.push("Full-stack --skip-infrastructure cannot be combined with --infrastructure-only.");
  }

  if (mode === "full-stack" && skipInfrastructure && frontendInfrastructureOnly) {
    errors.push("Full-stack --skip-infrastructure cannot be combined with --frontend-infrastructure-only.");
  }

  if (fullStackPublishOnly && !frontendPublishStackName && !frontendOutputsFile && (!frontendPublishBucket || !frontendPublishDistributionId)) {
    errors.push("Full-stack publish-only follow-up mode needs --stack-name, --frontend-outputs-file, or both --bucket and --distribution-id.");
  }

  if (fullStackPublishOnly && !skipBuild && !frontendPublishStackName && !backendOutputsFile) {
    errors.push("Full-stack publish-only follow-up mode needs --stack-name or --backend-outputs-file when a frontend build is required.");
  }

  if (fullStackPublishOnly && !skipBuild && !fs.existsSync(path.join(rootDir, "node_modules"))) {
    warnings.push(`Full-stack publish-only follow-up will build the app, but node_modules was not found at ${path.join(rootDir, "node_modules")}. Run yarn install first or use --skip-build with an existing dist/.`);
  }

  if (fullStackPublishOnly && skipBuild && !fs.existsSync(path.join(rootDir, "dist"))) {
    errors.push(`Full-stack publish-only follow-up was told to skip the build, but dist/ was not found at ${path.join(rootDir, "dist")}.`);
  }

  if (splitStackPublishOnly && !skipBuild && !fs.existsSync(path.join(rootDir, "node_modules"))) {
    warnings.push(`Split-stack publish-only follow-up will build the app, but node_modules was not found at ${path.join(rootDir, "node_modules")}. Run yarn install first or use --skip-build with an existing dist/.`);
  }

  if (splitStackPublishOnly && skipBuild && !fs.existsSync(path.join(rootDir, "dist"))) {
    errors.push(`Split-stack publish-only follow-up was told to skip the build, but dist/ was not found at ${path.join(rootDir, "dist")}.`);
  }

  if (splitStackMode && publishFrontendAssets && frontendInfrastructureOnly) {
    errors.push("Split-stack --publish-frontend-assets cannot be combined with --frontend-infrastructure-only. Use --frontend-infrastructure-only for the hosting-only phase, then run a later publish follow-up with --skip-frontend --publish-frontend-assets.");
  }

  if (splitStackMode && publishFrontendAssets && !skipFrontend) {
    errors.push("Split-stack --publish-frontend-assets only applies to staged frontend follow-up runs. Use it in a later phase with --skip-frontend after the frontend hosting stack already exists.");
  }

  if (splitStackMode && publishFrontendAssets && !skipBackend && skipFrontend) {
    warnings.push("Split-stack publish follow-up is usually a second-phase step. With --skip-frontend but not --skip-backend, deploy:aws will still run the backend deploy before publishing frontend assets.");
  }

  if (splitStackMode && frontendInfrastructureOnly && skipFrontend) {
    errors.push("Split-stack --frontend-infrastructure-only and --skip-frontend cannot be used together. Skipping the frontend step prevents frontend hosting from being provisioned.");
  }

  if (splitStackMode && skipBuild && !publishFrontendAssets && !skipFrontend && !frontendInfrastructureOnly) {
    errors.push("Split-stack --skip-build only applies when frontend assets are being published. Use it with a normal frontend deploy, a staged publish follow-up, or publish:frontend-assets directly.");
  }

  if (splitStackMode && skipBuild && !publishFrontendAssets && (skipFrontend || frontendInfrastructureOnly)) {
    errors.push("Split-stack --skip-build has no effect when frontend publishing is deferred. Remove it or use it later during the publish phase.");
  }

  if (splitStackMode && skipBackend && skipFrontend && !publishFrontendAssets) {
    errors.push("Split-stack has nothing to do when both backend and frontend deploy steps are skipped and no staged frontend publish was requested.");
  }

  if ((mode === "frontend" || splitStackMode || mode === "full-stack") && backendOutputsFile && !existsLocalFile(backendOutputsFile)) {
    errors.push(`Backend outputs file not found: ${path.resolve(rootDir, backendOutputsFile)}`);
  }

  if ((splitStackPublishOnly || fullStackPublishOnly) && frontendOutputsFile && !existsLocalFile(frontendOutputsFile)) {
    errors.push(`Frontend outputs file not found: ${path.resolve(rootDir, frontendOutputsFile)}`);
  }

  if ((frontendPublishMode || splitStackPublishOnly || fullStackPublishOnly) && frontendOutputsFile && frontendOutputsFileResult.error) {
    errors.push(`Frontend outputs file could not be loaded: ${frontendOutputsFileResult.error}`);
  }

  if ((frontendPublishMode || splitStackPublishOnly || fullStackPublishOnly) && frontendOutputsFile && !frontendOutputsFileResult.error) {
    if (!frontendOutputsFileBucket) {
      errors.push(`Frontend outputs file "${path.resolve(rootDir, frontendOutputsFile)}" is missing SiteBucketName or FrontendBucketName.`);
    }
    if (!frontendOutputsFileDistributionId) {
      errors.push(`Frontend outputs file "${path.resolve(rootDir, frontendOutputsFile)}" is missing CloudFrontDistributionId or FrontendDistributionId.`);
    }
  }

  if (splitStackPublishOnly && ((frontendPublishBucket && !frontendPublishDistributionId) || (!frontendPublishBucket && frontendPublishDistributionId))) {
    errors.push("Split-stack publish-only requires --bucket and --distribution-id together when not using stack outputs.");
  }

  if (fullStackPublishOnly && ((frontendPublishBucket && !frontendPublishDistributionId) || (!frontendPublishBucket && frontendPublishDistributionId))) {
    errors.push("Full-stack publish-only requires --bucket and --distribution-id together when not using stack outputs.");
  }

  if (frontendPublishMode) {
    if (!frontendPublishStackName && !frontendOutputsFile && (!frontendPublishBucket || !frontendPublishDistributionId)) {
      errors.push("Frontend publish mode needs --stack-name, --frontend-outputs-file, or both --bucket and --distribution-id.");
    }
    if ((frontendPublishBucket && !frontendPublishDistributionId) || (!frontendPublishBucket && frontendPublishDistributionId)) {
      errors.push("Frontend publish mode requires --bucket and --distribution-id together when not using stack outputs.");
    }
    if (!skipBuild && !fs.existsSync(path.join(rootDir, "node_modules"))) {
      warnings.push(`Frontend publish will build the app, but node_modules was not found at ${path.join(rootDir, "node_modules")}. Run yarn install first or use --skip-build with an existing dist/.`);
    }
    if (skipBuild && !fs.existsSync(path.join(rootDir, "dist"))) {
      errors.push(`Frontend publish was told to skip the build, but dist/ was not found at ${path.join(rootDir, "dist")}.`);
    }
  }

  if (mode === "frontend" && frontendInfrastructureOnly) {
    warnings.push("Frontend infrastructure-only is already the natural outcome of running deploy:frontend with --infrastructure-only. Use that flag on the deploy helper, not on the validator.");
  }

  if (mode === "frontend" && skipBuild && infrastructureOnly) {
    errors.push("Frontend --skip-build has no effect together with --infrastructure-only. Remove it and use --skip-build later during the frontend publish phase.");
  }

  if (infrastructureOnly && frontendInfrastructureOnly) {
    warnings.push("Both infrastructure-only flags are set. The broader infrastructure-only mode makes frontend-infrastructure-only redundant.");
  }

  if (splitStackMode && infrastructureOnly) {
    warnings.push("Split-stack deploys do not support a global --infrastructure-only mode. Use --skip-frontend, --skip-backend, or --frontend-infrastructure-only depending on the rollout shape you want.");
  }

  if (mode === "full-stack" && frontendInfrastructureOnly) {
    info.push("Full-stack validation will assume backend plus frontend hosting infrastructure now, with frontend asset publishing deferred.");
  }

  if (splitStackMode && frontendInfrastructureOnly) {
    info.push("Split-stack validation will assume backend deploy now, with frontend hosting provisioned but frontend asset publishing deferred.");
  }

  if (splitStackMode && !frontendParametersFile) {
    warnings.push("Split-stack mode works best with --frontend-parameters-file so frontend hosting settings stay file-driven.");
  }

  if (splitStackMode && frontendParametersFile && Object.keys(frontendParams).length === 0) {
    warnings.push("A frontend parameters file path was provided, but it resolved to no parameters.");
  }

  if (splitStackMode && frontendParametersFile) {
    info.push(`Frontend parameters file: ${path.resolve(rootDir, frontendParametersFile)}`);
    if (frontendProjectName !== projectName || frontendEnvironmentName !== environmentName) {
      warnings.push(`Frontend parameter file resolves to ${frontendProjectName}/${frontendEnvironmentName}, while backend settings resolve to ${projectName}/${environmentName}. Make sure that mismatch is intentional.`);
    }
  }

  if (backendRelevant && createNatGateway === "false") {
    warnings.push("CreateNatGateway=false: the stack now provisions private S3 and Secrets Manager endpoints, but any other outbound internet or AWS service access your backend needs must be handled with additional VPC endpoints or by enabling NAT.");
  }

  if (apiRepoPath) {
    if (!fs.existsSync(apiRepoPath)) {
      errors.push(`API repo path not found: ${apiRepoPath}`);
    } else {
      if (!canReadPath(apiRepoPath)) {
        errors.push(`API repo path is not readable: ${apiRepoPath}`);
        apiRepoFallbackSuggested = true;
      }
      if (apiRepoPackageResult.error) {
        errors.push(`API repo package.json is not readable: ${path.join(apiRepoPath, "package.json")} (${apiRepoPackageResult.error})`);
        apiRepoFallbackSuggested = true;
      }
      if (apiRepoServerlessResult.error) {
        warnings.push(`API repo serverless.yml is not readable, so multi-function contract checks were skipped: ${path.join(apiRepoPath, "serverless.yml")} (${apiRepoServerlessResult.error})`);
      }
      if (apiRepoLayerPackageResult.error) {
        warnings.push(`API repo tools/layer-package.json is not readable, so layered dependency checks were skipped: ${path.join(apiRepoPath, "tools", "layer-package.json")} (${apiRepoLayerPackageResult.error})`);
      }
      if (!apiRepoPackage) {
        warnings.push("API repo package.json was not found, so runtime/package checks were skipped.");
      } else {
        const lambdaNodeOptionsText = String(lambdaNodeOptions || "");
        const requestsSentryAutoImport = lambdaNodeOptionsText.includes("@sentry/aws-serverless/awslambda-auto");
        const layerDependencies = apiRepoLayerPackage?.dependencies && typeof apiRepoLayerPackage.dependencies === "object"
          ? apiRepoLayerPackage.dependencies
          : {};
        const layerIncludesSentry = Object.prototype.hasOwnProperty.call(layerDependencies, "@sentry/aws-serverless");

        if (backendRelevant && lambdaRuntime && lambdaRuntime !== "nodejs22.x") {
          warnings.push(`The Api repo is configured for nodejs22.x, but the current LambdaRuntime resolves to "${lambdaRuntime}".`);
        }
        if (backendRelevant && lambdaHandler && lambdaHandler !== "lambda.web") {
          warnings.push(`The Api repo's main HTTP handler is lambda.web, but the current LambdaHandler resolves to "${lambdaHandler}".`);
        }
        if (backendRelevant && databaseEngine && databaseEngine !== "aurora-mysql") {
          warnings.push(`The Api repo currently expects MySQL-style module connection strings, but the current DatabaseEngine resolves to "${databaseEngine}".`);
        }
        if (backendRelevant && databasePort && String(databasePort) !== "3306") {
          warnings.push(`The Api repo's MySQL connection parser expects port 3306 by default, but the current DatabasePort resolves to "${databasePort}".`);
        }
        if (backendRelevant && enableWebSocketApi !== "true") {
          warnings.push("The Api repo defines a socket Lambda and WebSocket API flow, but EnableWebSocketApi is not true.");
        }
        if (backendRelevant && enableScheduledWorkers !== "true") {
          warnings.push("The Api repo defines scheduled timer workers, but EnableScheduledWorkers is not true.");
        }
        if (backendRelevant && !appConfigSecretArn) {
          warnings.push("No AppConfigSecretArn is set. The Api repo can still boot for some paths, but many non-database runtime secrets/config values will remain unset.");
        }
        if (backendRelevant && appConfigSecretArn) {
          info.push("You can mirror the current stack back into the Api repo's legacy SSM layout with yarn sync:legacy-ssm if you still depend on Serverless-era parameter names or CLI tooling.");
        }
        if (backendRelevant && runMigrations) {
          warnings.push("RunMigrations is enabled, but the real Api repo currently exposes CLI migration tooling under tools/migrate.ts rather than a proven Lambda migration handler. Treat MigrationHandler as a custom integration you still need to supply and validate.");
        }
        if (backendRelevant && !runApiMigrations) {
          info.push("You can also run the real Api repo's CLI migrations after deploy with yarn run:api-migrations or by adding --run-api-migrations=true to deploy:backend / deploy:aws / deploy:full-stack.");
        }
        if (backendRelevant && !lambdaNodeOptions) {
          info.push("No LambdaNodeOptions value is set. That is fine unless you intentionally package observability auto-instrumentation such as Sentry.");
        }
        if (backendRelevant && requestsSentryAutoImport && packageMode === "layered" && !layerIncludesSentry) {
          errors.push("LambdaNodeOptions requests @sentry/aws-serverless auto-import, but the current Api repo layered dependency manifest does not include @sentry/aws-serverless. Remove LambdaNodeOptions or add the package to tools/layer-package.json before deploying a layered backend.");
        }
        if (backendRelevant && !dependenciesLayerArn && !observabilityLayerArn) {
          warnings.push("No Lambda layer ARNs are configured. That is fine for a fully self-contained zip, but the current Api repo's Serverless deployment uses Lambda layers for dependencies and Sentry.");
        }
        if (backendRelevant && !aiProvider) {
          warnings.push("No AiProvider is set. The Api repo will fall back to config defaults, but your self-hosted deployment may want this explicit.");
        }
        if (backendRelevant && emailOnRegistration === "") {
          warnings.push("EmailOnRegistration is not set. The Api repo will fall back to its config file value, which may not match your self-hosted install.");
        }
        if (backendRelevant && ((!caddyHost && caddyPort) || (caddyHost && !caddyPort))) {
          warnings.push("CaddyHost and CaddyPort should usually be configured together when using the Api repo's Caddy integration.");
        }
      }

      if (apiRepoServerlessText) {
        if (!/handler:\s+lambda\.socket/m.test(apiRepoServerlessText)) {
          warnings.push("API repo serverless.yml did not expose the expected lambda.socket handler; verify backend repo assumptions manually.");
        } else if (backendRelevant && (enableWebSocketApi !== "true" || enableScheduledWorkers !== "true")) {
          warnings.push("The Api repo defines additional socket/timer Lambdas. The current CloudFormation configuration is still not enabling all of them.");
        }
        if (backendRelevant && !/MEMBERSHIP_CONNECTION_STRING/m.test(apiRepoServerlessText)) {
          warnings.push("API repo serverless.yml did not show MEMBERSHIP_CONNECTION_STRING wiring; verify module database assumptions manually.");
        }
      } else {
        warnings.push("API repo serverless.yml was not found, so multi-function contract checks were skipped.");
      }
    }
  }

  if (backendRelevant && packageApiBackend) {
    if (!apiRepoPath) {
      errors.push("Auto-packaging was requested but no API repo path was provided. Pass --api-repo-path.");
    } else {
      const apiNodeModulesPath = path.join(apiRepoPath, "node_modules");
      if (!fs.existsSync(apiNodeModulesPath)) {
        errors.push(`Auto-packaging requires installed Api repo dependencies, but node_modules was not found at ${apiNodeModulesPath}. Run 'corepack yarn install' in the Api repo first.`);
      } else if (!canReadPath(apiNodeModulesPath)) {
        errors.push(`Auto-packaging requires readable Api repo dependencies, but node_modules is not readable at ${apiNodeModulesPath}.`);
      }
      if (packageMode === "layered") {
        info.push("Layered auto-packaging will reuse the generated layer zip automatically unless you override it with explicit layer inputs.");
      }
    }
  }

  if (backendRelevant && packageManifestFile) {
    if (!existsLocalFile(packageManifestFile)) {
      errors.push(`Package manifest file not found: ${packageManifestPath}`);
    } else if (packageManifestResult.error) {
      errors.push(`Package manifest file could not be loaded: ${packageManifestResult.error}`);
    } else {
      if (!packageManifest?.backendArtifactPath) {
        errors.push(`Package manifest file "${packageManifestPath}" is missing backendArtifactPath.`);
      }
      if (packageManifestBackendArtifactPath && !fs.existsSync(packageManifestBackendArtifactPath)) {
        errors.push(`Package manifest backend artifact not found: ${packageManifestBackendArtifactPath}`);
      }
      if (packageManifestMigrationArtifactPath && !fs.existsSync(packageManifestMigrationArtifactPath)) {
        errors.push(`Package manifest migration artifact not found: ${packageManifestMigrationArtifactPath}`);
      }
      if (packageManifestDependenciesLayerArtifactPath && !fs.existsSync(packageManifestDependenciesLayerArtifactPath)) {
        errors.push(`Package manifest dependencies layer artifact not found: ${packageManifestDependenciesLayerArtifactPath}`);
      }
      if (packageMode === "layered" && !dependenciesLayerArn && !dependenciesLayerSource && !packageManifest?.dependenciesLayerArtifactPath) {
        warnings.push("Package manifest did not include a dependenciesLayerArtifactPath for layered packaging. Provide a layer source file or ARN if your backend package depends on a separate layer.");
      }
    }
  }

  if (checkAws) {
    info.push("AWS-side checks: enabled");

    const callerIdentity = tryExec("aws", ["sts", "get-caller-identity", "--output", "json"]);
    if (!callerIdentity.ok) {
      errors.push(`AWS credentials or network check failed: ${callerIdentity.error}`);
    } else {
      const parsed = JSON.parse(callerIdentity.output);
      info.push(`AWS account: ${parsed.Account}`);
      info.push(`AWS ARN: ${parsed.Arn}`);
    }

    if ((mode === "full-stack" || bootstrapMode) && templateBucket) {
      const templateBucketCheck = tryExec("aws", ["s3api", "head-bucket", "--bucket", templateBucket]);
      if (bootstrapMode) {
        if (templateBucketCheck.ok) {
          warnings.push(`Template bucket "${templateBucket}" already exists and is accessible. Bootstrap bucket creation may fail unless that bucket is already managed by the target stack.`);
        }
      } else if (!templateBucketCheck.ok) {
        errors.push(`Template bucket "${templateBucket}" is not accessible: ${templateBucketCheck.error}`);
      }
    }

    if ((backendRelevant || bootstrapMode) && artifactBucket) {
      const artifactBucketCheck = tryExec("aws", ["s3api", "head-bucket", "--bucket", artifactBucket]);
      if (bootstrapMode) {
        if (artifactBucketCheck.ok) {
          warnings.push(`Artifact bucket "${artifactBucket}" already exists and is accessible. Bootstrap bucket creation may fail unless that bucket is already managed by the target stack.`);
        }
      } else if (!artifactBucketCheck.ok) {
        errors.push(`Artifact bucket "${artifactBucket}" is not accessible: ${artifactBucketCheck.error}`);
      }
    }

    if (backendRelevant && migrationBucket && migrationBucket !== artifactBucket) {
      const migrationBucketCheck = tryExec("aws", ["s3api", "head-bucket", "--bucket", migrationBucket]);
      if (!migrationBucketCheck.ok) errors.push(`Migration artifact bucket "${migrationBucket}" is not accessible: ${migrationBucketCheck.error}`);
    }

    if (backendRelevant && artifactBucket && artifactKey && !artifactSource) {
      const artifactCheck = tryExec("aws", ["s3api", "head-object", "--bucket", artifactBucket, "--key", artifactKey]);
      if (!artifactCheck.ok) {
        warnings.push(`Artifact s3://${artifactBucket}/${artifactKey} was not found or is not accessible yet: ${artifactCheck.error}`);
      }
    }

    if (backendRelevant && runMigrations && migrationBucket && migrationKey && !migrationSource) {
      const migrationArtifactCheck = tryExec("aws", ["s3api", "head-object", "--bucket", migrationBucket, "--key", migrationKey]);
      if (!migrationArtifactCheck.ok) {
        warnings.push(`Migration artifact s3://${migrationBucket}/${migrationKey} was not found or is not accessible yet: ${migrationArtifactCheck.error}`);
      }
    }

    if (frontendCert) {
      const frontendCertCheck = tryExec("aws", ["acm", "describe-certificate", "--certificate-arn", frontendCert, "--region", "us-east-1"]);
      if (!frontendCertCheck.ok) errors.push(`Frontend certificate is not accessible in us-east-1: ${frontendCertCheck.error}`);
    }

    const resolvedFrontendPublishBucket = frontendPublishBucket || frontendOutputsFileBucket;
    const resolvedFrontendPublishDistributionId = frontendPublishDistributionId || frontendOutputsFileDistributionId;

    if (frontendPublishMode && resolvedFrontendPublishBucket) {
      const publishBucketCheck = tryExec("aws", ["s3api", "head-bucket", "--bucket", resolvedFrontendPublishBucket]);
      if (!publishBucketCheck.ok) errors.push(`Frontend publish bucket "${resolvedFrontendPublishBucket}" is not accessible: ${publishBucketCheck.error}`);
    }

    if (frontendPublishMode && resolvedFrontendPublishDistributionId) {
      const distributionCheck = tryExec("aws", ["cloudfront", "get-distribution", "--id", resolvedFrontendPublishDistributionId]);
      if (!distributionCheck.ok) errors.push(`Frontend distribution "${resolvedFrontendPublishDistributionId}" is not accessible: ${distributionCheck.error}`);
    }

    if (splitStackPublishOnly && resolvedFrontendPublishBucket) {
      const publishBucketCheck = tryExec("aws", ["s3api", "head-bucket", "--bucket", resolvedFrontendPublishBucket]);
      if (!publishBucketCheck.ok) errors.push(`Split-stack publish bucket "${resolvedFrontendPublishBucket}" is not accessible: ${publishBucketCheck.error}`);
    }

    if (splitStackPublishOnly && resolvedFrontendPublishDistributionId) {
      const distributionCheck = tryExec("aws", ["cloudfront", "get-distribution", "--id", resolvedFrontendPublishDistributionId]);
      if (!distributionCheck.ok) errors.push(`Split-stack publish distribution "${resolvedFrontendPublishDistributionId}" is not accessible: ${distributionCheck.error}`);
    }

    if (splitStackPublishOnly && !frontendOutputsFile && !frontendPublishBucket && frontendStackName) {
      const splitStackDescribe = tryExec("aws", [
        "cloudformation",
        "describe-stacks",
        "--stack-name",
        frontendStackName,
        "--region",
        region,
        "--output",
        "json",
      ]);
      if (!splitStackDescribe.ok) {
        errors.push(`Split-stack publish-only target "${frontendStackName}" is not accessible: ${splitStackDescribe.error}`);
      } else {
        const splitStackOutputs = normalizeOutputs(JSON.parse(splitStackDescribe.output));
        if (!splitStackOutputs.SiteBucketName) {
          errors.push(`Split-stack publish-only target "${frontendStackName}" is missing SiteBucketName output.`);
        }
        if (!splitStackOutputs.CloudFrontDistributionId) {
          errors.push(`Split-stack publish-only target "${frontendStackName}" is missing CloudFrontDistributionId output.`);
        }
        if (splitStackOutputs.SiteBucketName) {
          const publishBucketCheck = tryExec("aws", ["s3api", "head-bucket", "--bucket", splitStackOutputs.SiteBucketName]);
          if (!publishBucketCheck.ok) {
            errors.push(`Split-stack publish bucket "${splitStackOutputs.SiteBucketName}" is not accessible: ${publishBucketCheck.error}`);
          }
        }
        if (splitStackOutputs.CloudFrontDistributionId) {
          const distributionCheck = tryExec("aws", ["cloudfront", "get-distribution", "--id", splitStackOutputs.CloudFrontDistributionId]);
          if (!distributionCheck.ok) {
            errors.push(`Split-stack distribution "${splitStackOutputs.CloudFrontDistributionId}" is not accessible: ${distributionCheck.error}`);
          }
        }
      }
    }

    if (fullStackPublishOnly && resolvedFrontendPublishBucket) {
      const publishBucketCheck = tryExec("aws", ["s3api", "head-bucket", "--bucket", resolvedFrontendPublishBucket]);
      if (!publishBucketCheck.ok) errors.push(`Full-stack publish bucket "${resolvedFrontendPublishBucket}" is not accessible: ${publishBucketCheck.error}`);
    }

    if (fullStackPublishOnly && resolvedFrontendPublishDistributionId) {
      const distributionCheck = tryExec("aws", ["cloudfront", "get-distribution", "--id", resolvedFrontendPublishDistributionId]);
      if (!distributionCheck.ok) errors.push(`Full-stack distribution "${resolvedFrontendPublishDistributionId}" is not accessible: ${distributionCheck.error}`);
    }

    if (fullStackPublishOnly && !frontendOutputsFile && !frontendPublishBucket && frontendPublishStackName) {
      const fullStackDescribe = tryExec("aws", [
        "cloudformation",
        "describe-stacks",
        "--stack-name",
        frontendPublishStackName,
        "--region",
        region,
        "--output",
        "json",
      ]);
      if (!fullStackDescribe.ok) {
        errors.push(`Full-stack publish-only target "${frontendPublishStackName}" is not accessible: ${fullStackDescribe.error}`);
      } else {
        fullStackPublishOutputs = normalizeOutputs(JSON.parse(fullStackDescribe.output));
        if (!fullStackPublishOutputs.FrontendBucketName) {
          errors.push(`Full-stack publish-only target "${frontendPublishStackName}" is missing FrontendBucketName output.`);
        }
        if (!fullStackPublishOutputs.FrontendDistributionId) {
          errors.push(`Full-stack publish-only target "${frontendPublishStackName}" is missing FrontendDistributionId output.`);
        }
        if (fullStackPublishOutputs.FrontendBucketName) {
          const publishBucketCheck = tryExec("aws", ["s3api", "head-bucket", "--bucket", fullStackPublishOutputs.FrontendBucketName]);
          if (!publishBucketCheck.ok) {
            errors.push(`Full-stack publish bucket "${fullStackPublishOutputs.FrontendBucketName}" is not accessible: ${publishBucketCheck.error}`);
          }
        }
        if (fullStackPublishOutputs.FrontendDistributionId) {
          const distributionCheck = tryExec("aws", ["cloudfront", "get-distribution", "--id", fullStackPublishOutputs.FrontendDistributionId]);
          if (!distributionCheck.ok) {
            errors.push(`Full-stack distribution "${fullStackPublishOutputs.FrontendDistributionId}" is not accessible: ${distributionCheck.error}`);
          }
        }
      }
    }

    if (apiCert) {
      const apiCertCheck = tryExec("aws", ["acm", "describe-certificate", "--certificate-arn", apiCert, "--region", region]);
      if (!apiCertCheck.ok) errors.push(`API certificate is not accessible in ${region}: ${apiCertCheck.error}`);
    }

    if (appConfigSecretArn) {
      const appConfigSecretCheck = tryExec("aws", ["secretsmanager", "describe-secret", "--secret-id", appConfigSecretArn, "--region", region]);
      if (!appConfigSecretCheck.ok) {
        errors.push(`App config secret is not accessible in ${region}: ${appConfigSecretCheck.error}`);
      }
    }

    if (apiMigrationsMode && apiMigrationStackName) {
      const migrationStackDescribe = tryExec("aws", [
        "cloudformation",
        "describe-stacks",
        "--stack-name",
        apiMigrationStackName,
        "--region",
        region,
        "--output",
        "json",
      ]);
      if (!migrationStackDescribe.ok) {
        errors.push(`API migration stack "${apiMigrationStackName}" is not accessible: ${migrationStackDescribe.error}`);
      } else {
        const migrationOutputs = normalizeOutputs(JSON.parse(migrationStackDescribe.output));
        const requiredOutputKeys = getApiMigrationRequiredOutputKeys(apiMigrationModule);
        requiredOutputKeys.forEach((key) => {
          if (!migrationOutputs[key]) errors.push(`API migration stack "${apiMigrationStackName}" is missing ${key} output.`);
        });
        const resolvedSecretArn = apiMigrationDbSecretArn || migrationOutputs.DatabaseSecretArn;
        if (!apiMigrationDbSecretFile && !resolvedSecretArn) {
          errors.push(`API migration stack "${apiMigrationStackName}" is missing DatabaseSecretArn output, and no DB secret override was provided.`);
        }
      }
    }

    if (apiMigrationsMode && apiMigrationDbSecretArn) {
      const migrationDbSecretCheck = tryExec("aws", ["secretsmanager", "describe-secret", "--secret-id", apiMigrationDbSecretArn, "--region", region]);
      if (!migrationDbSecretCheck.ok) {
        errors.push(`API migration DB secret is not accessible in ${region}: ${migrationDbSecretCheck.error}`);
      }
    }

    if (dependenciesLayerArn) {
      const dependenciesLayerCheck = tryExec("aws", ["lambda", "get-layer-version-by-arn", "--arn", dependenciesLayerArn, "--region", region]);
      if (!dependenciesLayerCheck.ok) {
        errors.push(`Dependencies layer ARN is not accessible in ${region}: ${dependenciesLayerCheck.error}`);
      }
    }

    if (observabilityLayerArn) {
      const observabilityLayerCheck = tryExec("aws", ["lambda", "get-layer-version-by-arn", "--arn", observabilityLayerArn, "--region", region]);
      if (!observabilityLayerCheck.ok) {
        errors.push(`Observability layer ARN is not accessible in ${region}: ${observabilityLayerCheck.error}`);
      }
    }
  }

  const nextSteps = [];
  if (apiRepoFallbackSuggested) {
    info.push("The local Api repo path is present but unreadable. For local deploys, switch to --package-manifest-file or --backend-artifact-source-file, or use the GitHub Actions api-repo path if that runner can read the backend repo.");
  }
  if (apiMigrationRepoFallbackSuggested) {
    info.push("The local API migration repo path is present but unreadable. Run migrations from a machine or runner that can read that checkout, or defer --run-api-migrations until that access issue is resolved.");
  }
  if (bootstrapMode) {
    const bootstrapArgs = [];
    if (region) bootstrapArgs.push(`--region=${region}`);
    if (parametersFile) bootstrapArgs.push(`--parameters-file=${parametersFile}`);
    bootstrapArgs.push(`--stack-name=${stackName || "<stack>"}`);
    nextSteps.push(`yarn deploy:bootstrap -- ${bootstrapArgs.join(" ")}`);
  }
  if (backendRelevant && resolvedArtifactSource && artifactBucket && artifactKey) {
    nextSteps.push(`yarn upload:backend-artifact -- --bootstrap-stack-name=${bootstrapStackName || "<stack>"} --source-file=${resolvedArtifactSource} --artifact-key=${artifactKey}`);
  }
  if (backendRelevant && resolvedMigrationSource && migrationBucket && migrationKey) {
    nextSteps.push(`yarn upload:backend-artifact -- --bootstrap-stack-name=${bootstrapStackName || "<stack>"} --source-file=${resolvedMigrationSource} --artifact-key=${migrationKey} --artifact-bucket=${migrationBucket} --artifact-label="Migration artifact"`);
  }
  if (frontendPublishMode) {
    const publishArgs = [];
    if (frontendPublishStackName) publishArgs.push(`--stack-name=${frontendPublishStackName}`);
    else if (frontendOutputsFile) publishArgs.push(`--frontend-outputs-file=${frontendOutputsFile}`);
    else {
      if (frontendPublishBucket) publishArgs.push(`--bucket=${frontendPublishBucket}`);
      if (frontendPublishDistributionId) publishArgs.push(`--distribution-id=${frontendPublishDistributionId}`);
    }
    if (backendOutputsFile) publishArgs.push(`--backend-outputs-file=${backendOutputsFile}`);
    else if (getArg("backend-stack-name")) publishArgs.push(`--backend-stack-name=${getArg("backend-stack-name")}`);
    if (skipBuild) publishArgs.push("--skip-build");
    nextSteps.push(`yarn publish:frontend-assets -- ${publishArgs.join(" ")}`.trim());
  }
  if (apiMigrationsMode) {
    const helperWouldSkipDirectModule = apiMigrationModule !== "all"
      && detectedApiRepoMigrationDirectories.length > 0
      && !detectedApiRepoMigrationDirectories.includes(apiMigrationModule);

    if (helperWouldSkipDirectModule && !apiMigrationDryRun) {
      info.push(`No next-step migration command was suggested for ${apiMigrationModule}, because the current Api repo has no tools/migrations/${apiMigrationModule} directory.`);
    } else {
      const migrationArgs = [];
      migrationArgs.push(`--api-repo-path=${apiMigrationApiRepoPathArg}`);
      migrationArgs.push(`--action=${apiMigrationAction}`);
      migrationArgs.push(`--module=${apiMigrationModule}`);
      migrationArgs.push(`--region=${region}`);
      if (apiMigrationStackName) migrationArgs.push(`--stack-name=${apiMigrationStackName}`);
      if (apiMigrationOutputsFile) migrationArgs.push(`--outputs-file=${apiMigrationOutputsFile}`);
      if (apiMigrationDbSecretArn) migrationArgs.push(`--db-secret-arn=${apiMigrationDbSecretArn}`);
      if (apiMigrationDbSecretFile) migrationArgs.push(`--db-secret-file=${apiMigrationDbSecretFile}`);
      if (apiMigrationDryRun) migrationArgs.push("--dry-run=true");
      nextSteps.push(buildApiMigrationCommand(apiMigrationRunner, migrationArgs));
    }
  }
  if (fullStackPublishOnly) {
    const publishArgs = [];
    if (frontendPublishStackName) publishArgs.push(`--stack-name=${frontendPublishStackName}`);
    if (frontendOutputsFile) publishArgs.push(`--frontend-outputs-file=${frontendOutputsFile}`);
    if (frontendPublishBucket) publishArgs.push(`--bucket=${frontendPublishBucket}`);
    if (frontendPublishDistributionId) publishArgs.push(`--distribution-id=${frontendPublishDistributionId}`);
    if (getArg("app-url")) publishArgs.push(`--app-url=${getArg("app-url")}`);
    if (backendOutputsFile) publishArgs.push(`--backend-outputs-file=${backendOutputsFile}`);
    if (fullStackParametersFile) publishArgs.push(`--parameters-file=${fullStackParametersFile}`);
    publishArgs.push("--skip-infrastructure");
    publishArgs.push("--publish-frontend-assets");
    if (skipBuild) publishArgs.push("--skip-build");
    nextSteps.push(`yarn deploy:full-stack -- ${publishArgs.join(" ")}`);
  }
  if (splitStackPublishOnly) {
    const publishArgs = [];
    if (region) publishArgs.push(`--region=${region}`);
    if (projectName) publishArgs.push(`--project-name=${projectName}`);
    if (environmentName) publishArgs.push(`--environment=${environmentName}`);
    if (frontendParametersFile) publishArgs.push(`--frontend-parameters-file=${frontendParametersFile}`);
    if (backendParametersFile) publishArgs.push(`--backend-parameters-file=${backendParametersFile}`);
    if (frontendOutputsFile) publishArgs.push(`--frontend-outputs-file=${frontendOutputsFile}`);
    if (frontendPublishBucket) publishArgs.push(`--bucket=${frontendPublishBucket}`);
    if (frontendPublishDistributionId) publishArgs.push(`--distribution-id=${frontendPublishDistributionId}`);
    if (getArg("app-url")) publishArgs.push(`--app-url=${getArg("app-url")}`);
    if (backendOutputsFile) publishArgs.push(`--backend-outputs-file=${backendOutputsFile}`);
    else if (getArg("backend-stack-name")) publishArgs.push(`--backend-stack-name=${getArg("backend-stack-name")}`);
    publishArgs.push("--skip-backend");
    publishArgs.push("--skip-frontend");
    publishArgs.push("--publish-frontend-assets");
    if (skipBuild) publishArgs.push("--skip-build");
    nextSteps.push(`yarn deploy:aws -- ${publishArgs.join(" ")}`);
  }
  if (backendRelevant && runApiMigrations) {
    const helperWouldSkipDirectModule = apiMigrationModule !== "all"
      && detectedApiRepoMigrationDirectories.length > 0
      && !detectedApiRepoMigrationDirectories.includes(apiMigrationModule);

    if (helperWouldSkipDirectModule) {
      info.push(`No follow-up migration step was suggested for ${apiMigrationModule}, because the current Api repo has no tools/migrations/${apiMigrationModule} directory.`);
    } else {
      const migrationArgs = [];
      migrationArgs.push(`--api-repo-path=${apiMigrationApiRepoPathArg}`);
      migrationArgs.push(`--action=${apiMigrationAction}`);
      migrationArgs.push(`--module=${apiMigrationModule}`);
      migrationArgs.push(`--region=${region}`);
      if (mode === "backend" || mode === "full-stack") {
        migrationArgs.push(`--stack-name=${getArg("stack-name") || "<stack>"}`);
      } else if (splitStackMode) {
        migrationArgs.push(`--stack-name=${getArg("backend-stack-name") || `${projectName}-${environmentName}-backend`}`);
      }
      if (apiMigrationDbSecretArn) migrationArgs.push(`--db-secret-arn=${apiMigrationDbSecretArn}`);
      if (apiMigrationDbSecretFile) migrationArgs.push(`--db-secret-file=${apiMigrationDbSecretFile}`);
      if (apiMigrationDryRun) migrationArgs.push("--dry-run=true");
      nextSteps.push(buildApiMigrationCommand(apiMigrationRunner, migrationArgs));
    }
  }

  const result = {
    ok: errors.length === 0,
    mode,
    region,
    projectName,
    environmentName,
    bootstrapMode,
    apiMigrationsMode,
    splitStackMode,
    splitStackPublishOnly,
    frontendPublishMode,
    fullStackPublishOnly,
    checkAws,
    infrastructureOnly,
    frontendInfrastructureOnly,
    stackName,
    parametersFile,
    bootstrapStackName,
    backendParametersFile,
    frontendParametersFile,
    fullStackParametersFile,
    resolved: {
      packageManifestFile: packageManifestPath,
      backendArtifactSource: resolvedArtifactSource,
      migrationArtifactSource: resolvedMigrationSource,
      dependenciesLayerSource: resolvedDependenciesLayerSource,
      templateBucket,
      artifactBucket,
      artifactKey,
      migrationBucket,
      migrationKey,
      frontendDomain,
      frontendCert,
      frontendZone,
      apiDomain,
      apiCert,
      apiZone,
      appConfigSecretArn,
      dependenciesLayerArn,
      observabilityLayerArn,
      apiRepoMigrationModules: detectedApiRepoMigrationModules,
      apiRepoMigrationDirectories: detectedApiRepoMigrationDirectories,
    },
    info,
    warnings,
    errors,
    nextSteps,
  };

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (errors.length > 0) process.exit(1);
    return;
  }

  console.log("\nDeployment preflight");
  info.forEach((line) => console.log(`- ${line}`));

  if (warnings.length > 0) {
    console.log("\nWarnings");
    warnings.forEach((line) => console.log(`- ${line}`));
  }

  if (errors.length > 0) {
    console.log("\nErrors");
    errors.forEach((line) => console.log(`- ${line}`));
    process.exit(1);
  }

  console.log("\nPreflight passed.");
  nextSteps.forEach((step) => console.log(`Next: ${step}`));
}

main();
