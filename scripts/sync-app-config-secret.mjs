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

function runJson(command, args) {
  try {
    return JSON.parse(execFileSync(command, args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 20 * 1024 * 1024,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`AWS command failed: ${message}`);
  }
}

function tryRunJson(command, args) {
  try {
    return {
      ok: true,
      value: JSON.parse(execFileSync(command, args, {
        cwd: rootDir,
        encoding: "utf8",
        stdio: "pipe",
        maxBuffer: 20 * 1024 * 1024,
      })),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      stderr: error && typeof error === "object" && "stderr" in error ? String(error.stderr || "") : "",
    };
  }
}

function parseAndValidateSecret(secretString, sourceLabel) {
  let parsed;
  try {
    parsed = JSON.parse(secretString);
  } catch (error) {
    console.error(`Secret file is not valid JSON: ${sourceLabel}`);
    process.exit(1);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    console.error(`Secret file must contain a JSON object: ${sourceLabel}`);
    process.exit(1);
  }

  const requiredKeys = ["jwtSecret", "encryptionKey"];
  const missingRequiredKeys = requiredKeys.filter((key) => typeof parsed[key] !== "string" || parsed[key].trim() === "");
  if (missingRequiredKeys.length > 0) {
    console.error(`Secret file is missing required non-empty string keys: ${missingRequiredKeys.join(", ")}`);
    process.exit(1);
  }

  return parsed;
}

function main() {
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const secretFile = getArg("secret-file");
  const secretName = getArg("secret-name");
  const secretId = getArg("secret-id");
  const description = getArg("description", "B1Admin backend app config");
  const kmsKeyId = getArg("kms-key-id");
  const outputMode = getArg("output", "text");

  requireValue("secret-file", secretFile);
  if (!secretName && !secretId) {
    console.error("Missing required value: secret-name or secret-id");
    process.exit(1);
  }

  const resolvedSecretFile = path.resolve(rootDir, secretFile);
  if (!fs.existsSync(resolvedSecretFile)) {
    console.error(`Secret file not found: ${resolvedSecretFile}`);
    process.exit(1);
  }

  const secretString = fs.readFileSync(resolvedSecretFile, "utf8");
  parseAndValidateSecret(secretString, resolvedSecretFile);

  const lookupId = secretId || secretName;
  const describe = tryRunJson("aws", [
    "secretsmanager",
    "describe-secret",
    "--secret-id",
    lookupId,
    "--region",
    region,
    "--output",
    "json",
  ]);

  const notFound = !describe.ok && (
    describe.error.includes("ResourceNotFoundException") ||
    describe.stderr.includes("ResourceNotFoundException") ||
    describe.error.includes("can't find the specified secret") ||
    describe.stderr.includes("can't find the specified secret")
  );

  let response;
  if (describe.ok) {
    try {
      response = JSON.parse(execFileSync("aws", [
        "secretsmanager",
        "put-secret-value",
        "--secret-id",
        describe.value.ARN || lookupId,
        "--secret-string",
        secretString,
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
      const message = error instanceof Error ? error.message : String(error);
      fail(`Could not update Secrets Manager secret "${describe.value.Name || lookupId}": ${message}`);
    }
    response = {
      action: "updated",
      arn: describe.value.ARN,
      name: describe.value.Name,
      versionId: response.VersionId,
    };
  } else if (!notFound) {
    fail(`Could not look up Secrets Manager secret "${lookupId}": ${describe.error}`);
  } else {
    requireValue("secret-name", secretName);
    const args = [
      "secretsmanager",
      "create-secret",
      "--name",
      secretName,
      "--description",
      description,
      "--secret-string",
      secretString,
      "--region",
      region,
      "--output",
      "json",
    ];
    if (kmsKeyId) args.push("--kms-key-id", kmsKeyId);
    let created;
    try {
      created = JSON.parse(execFileSync("aws", args, {
        cwd: rootDir,
        encoding: "utf8",
        stdio: "pipe",
        maxBuffer: 20 * 1024 * 1024,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      fail(`Could not create Secrets Manager secret "${secretName}": ${message}`);
    }
    response = {
      action: "created",
      arn: created.ARN,
      name: created.Name,
      versionId: created.VersionId,
    };
  }

  if (outputMode === "json") {
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    return;
  }

  console.log("\nApp config secret sync complete.");
  console.log(`Action: ${response.action}`);
  console.log(`Secret name: ${response.name}`);
  console.log(`Secret ARN: ${response.arn}`);
  console.log(`Version ID: ${response.versionId}`);
}

main();
