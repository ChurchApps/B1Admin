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

function parseCsv(value, fallback = []) {
  const source = value || fallback.join(",");
  return source
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function runAwsJson(args, failureLabel) {
  try {
    return JSON.parse(execFileSync("aws", args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 20 * 1024 * 1024,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`${failureLabel}: ${message}`);
  }
}

function main() {
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const layerName = getArg("layer-name");
  const sourceFile = getArg("source-file");
  const description = getArg("description", "Published by B1Admin AWS deployment tooling");
  const licenseInfo = getArg("license-info");
  const compatibleRuntimes = parseCsv(getArg("compatible-runtimes", "nodejs22.x"));
  const compatibleArchitectures = parseCsv(getArg("compatible-architectures", "arm64"));
  const outputMode = getArg("output", "text");

  requireValue("layer-name", layerName);
  requireValue("source-file", sourceFile);

  const resolvedSource = path.resolve(rootDir, sourceFile);
  if (!fs.existsSync(resolvedSource)) {
    console.error(`Source file not found: ${resolvedSource}`);
    process.exit(1);
  }
  if (path.extname(resolvedSource).toLowerCase() !== ".zip") {
    fail(`Source file must be a .zip archive: ${resolvedSource}`);
  }

  const args = [
    "lambda",
    "publish-layer-version",
    "--layer-name",
    layerName,
    "--zip-file",
    `fileb://${resolvedSource}`,
    "--description",
    description,
    "--region",
    region,
    "--output",
    "json",
  ];

  if (compatibleRuntimes.length > 0) args.push("--compatible-runtimes", ...compatibleRuntimes);
  if (compatibleArchitectures.length > 0) args.push("--compatible-architectures", ...compatibleArchitectures);
  if (licenseInfo) args.push("--license-info", licenseInfo);

  const commandPreview = `aws ${args.join(" ")}`;
  if (outputMode === "json") {
    console.error(`\n> ${commandPreview}`);
  } else {
    console.log(`\n> ${commandPreview}`);
  }
  const response = runAwsJson(args, `Could not publish Lambda layer "${layerName}"`);

  if (outputMode === "json") {
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    return;
  }

  console.log("\nLayer publication complete.");
  console.log(`Layer name: ${response.LayerArn?.split(":").slice(-1)[0] || layerName}`);
  console.log(`Layer version ARN: ${response.LayerVersionArn}`);
  console.log(`Version: ${response.Version}`);
}

main();
