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

function runJson(command, args) {
  return JSON.parse(execFileSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  }));
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

function main() {
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const bootstrapStackName = getArg("bootstrap-stack-name");
  const sourceFile = getArg("source-file");
  const bucketArg = getArg("artifact-bucket");
  const key = getArg("artifact-key");
  const artifactLabel = getArg("artifact-label", "Backend artifact");
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";

  requireValue("source-file", sourceFile);

  const resolvedSource = path.resolve(rootDir, sourceFile);
  if (!fs.existsSync(resolvedSource)) {
    console.error(`Source file not found: ${resolvedSource}`);
    process.exit(1);
  }

  const bootstrapOutputs = getStackOutputsSafe(bootstrapStackName, region, "bootstrap stack");
  const bucket = bucketArg || bootstrapOutputs.ArtifactBucketName || "";

  requireValue("artifact-bucket or bootstrap-stack-name", bucket);
  requireValue("artifact-key", key);

  run("aws", [
    "s3",
    "cp",
    resolvedSource,
    `s3://${bucket}/${key}`,
    "--region",
    region,
  ], { quiet: jsonOutput });

  const result = {
    artifactLabel,
    region,
    bucket,
    key,
    sourceFile: resolvedSource,
    s3Uri: `s3://${bucket}/${key}`,
    bootstrapStackName,
  };

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  console.log(`\n${artifactLabel} upload complete.`);
  console.log(`Bucket: ${bucket}`);
  console.log(`Key: ${key}`);
  console.log(`S3 URI: s3://${bucket}/${key}`);
}

main();
