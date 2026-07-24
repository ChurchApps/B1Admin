import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = path.join(rootDir, "infrastructure", "cloudformation", "bootstrap.yaml");

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

function run(command, args, options = {}) {
  const { quiet = false, ...execOptions } = options;
  if (!quiet) console.log(`\n> ${command} ${args.join(" ")}`);

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

function validateS3BucketName(label, value) {
  if (!value) return;

  const looksLikeIpv4Address = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value);
  const validCharacters = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value);
  const hasAdjacentPeriods = value.includes("..");
  const hasDashPeriodCombo = value.includes("-.") || value.includes(".-");

  if (value.length < 3 || value.length > 63 || looksLikeIpv4Address || !validCharacters || hasAdjacentPeriods || hasDashPeriodCombo) {
    fail(`${label} must be a valid S3 bucket name when provided explicitly.`);
  }
}

function normalizeOutputs(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) return Object.fromEntries(raw.map((output) => [output.OutputKey, output.OutputValue]));
  if (raw.Stacks?.[0]?.Outputs) return normalizeOutputs(raw.Stacks[0].Outputs);
  if (raw.Outputs) return normalizeOutputs(raw.Outputs);
  return raw;
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

function toParameterOverrides(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}=${value}`);
}

function main() {
  const stackName = getArg("stack-name");
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const cloudformationExecutionRoleArn = getArg("cloudformation-execution-role-arn", process.env.CLOUDFORMATION_EXECUTION_ROLE_ARN || "");
  const paramsFile = getArg("parameters-file");
  const fileParams = loadParamsFromFile(paramsFile);
  const projectName = getArg("project-name", fileParams.ProjectName || "b1admin");
  const environmentName = getArg("environment", fileParams.EnvironmentName || "prod");
  const output = getArg("output", "text").toLowerCase();
  const jsonOutput = output === "json";

  requireValue("stack-name", stackName);

  const params = {
    ProjectName: projectName,
    EnvironmentName: environmentName,
    TemplateBucketName: getArg("template-bucket-name", fileParams.TemplateBucketName),
    ArtifactBucketName: getArg("artifact-bucket-name", fileParams.ArtifactBucketName),
    EnableBucketVersioning: getArg("enable-bucket-versioning", fileParams.EnableBucketVersioning || "true"),
  };

  validateS3BucketName("TemplateBucketName", params.TemplateBucketName);
  validateS3BucketName("ArtifactBucketName", params.ArtifactBucketName);

  if (params.TemplateBucketName && params.TemplateBucketName === params.ArtifactBucketName) {
    fail("TemplateBucketName and ArtifactBucketName must be different when both are set explicitly.");
  }

  const deployArgs = [
    "cloudformation",
    "deploy",
    "--stack-name",
    stackName,
    "--template-file",
    templatePath,
    "--region",
    region,
    "--no-fail-on-empty-changeset",
    "--parameter-overrides",
    ...toParameterOverrides(params),
  ];
  if (cloudformationExecutionRoleArn) {
    deployArgs.push("--role-arn", cloudformationExecutionRoleArn);
  }
  run("aws", deployArgs, { quiet: jsonOutput });

  const outputs = getStackOutputsSafe(stackName, region, "bootstrap stack");
  const result = {
    stackName,
    region,
    parameters: params,
    outputs,
  };

  if (output === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("\nBootstrap deployment complete.");
  console.log(`Stack: ${stackName}`);
  if (outputs.TemplateBucketName) console.log(`Template bucket: ${outputs.TemplateBucketName}`);
  if (outputs.ArtifactBucketName) console.log(`Artifact bucket: ${outputs.ArtifactBucketName}`);
}

main();
