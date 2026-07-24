import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
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

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function parseAndValidateSecret(secretString, sourceLabel) {
  let parsed;
  try {
    parsed = JSON.parse(secretString);
  } catch {
    fail(`Secret file is not valid JSON: ${sourceLabel}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail(`Secret file must contain a JSON object: ${sourceLabel}`);
  }

  const requiredKeys = ["jwtSecret", "encryptionKey"];
  const missingRequiredKeys = requiredKeys.filter((key) => typeof parsed[key] !== "string" || parsed[key].trim() === "");
  if (missingRequiredKeys.length > 0) {
    fail(`Secret file is missing required non-empty string keys: ${missingRequiredKeys.join(", ")}`);
  }

  return parsed;
}

function runGhSecretSet(args) {
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
    fail(`GitHub CLI secret sync failed: ${stderr.trim() || message}`);
  }
}

function ensureGhAuth() {
  const readiness = getGithubCliReadiness({
    cwd: rootDir,
    connectivityAction: "syncing this secret from here.",
  });

  if (!readiness.ok) {
    fail(readiness.blockers[0] || "GitHub CLI auth check failed.");
  }
}

function main() {
  const deploymentEnvironment = getArg("environment");
  const githubEnvironment = getArg("github-environment") || (deploymentEnvironment ? `aws-${deploymentEnvironment}` : "");
  const secretFile = getArg("secret-file");
  const secretName = getArg("secret-name", "AWS_APP_CONFIG_SECRET_JSON");
  const repo = getArg("repo");
  const outputMode = getArg("output", "text").toLowerCase();
  const dryRun = getArg("dry-run", "false").toLowerCase() === "true";
  const skipGhAuthCheck = getArg("skip-gh-auth-check", "false").toLowerCase() === "true";

  requireValue("secret-file", secretFile);
  requireValue("github-environment or environment", githubEnvironment);

  const resolvedSecretFile = path.resolve(rootDir, secretFile);
  if (!fs.existsSync(resolvedSecretFile)) {
    fail(`Secret file not found: ${resolvedSecretFile}`);
  }

  const secretString = fs.readFileSync(resolvedSecretFile, "utf8");
  const parsedSecret = parseAndValidateSecret(secretString, resolvedSecretFile);
  const normalizedSecret = JSON.stringify(parsedSecret);
  const relativeSecretFile = path.relative(rootDir, resolvedSecretFile) || path.basename(resolvedSecretFile);
  const commandPreviewParts = [
    "gh secret set",
    shellQuote(secretName),
    "--env",
    shellQuote(githubEnvironment),
    "--app",
    shellQuote("actions"),
  ];
  if (repo) {
    commandPreviewParts.push("--repo", shellQuote(repo));
  }
  const commandPreview = `${commandPreviewParts.join(" ")} < ${shellQuote(relativeSecretFile)}`;

  if (!skipGhAuthCheck) {
    ensureGhAuth();
  }

  if (!dryRun) {
    const ghArgs = [
      "secret",
      "set",
      secretName,
      "--env",
      githubEnvironment,
      "--app",
      "actions",
      "--body",
      normalizedSecret,
    ];
    if (repo) {
      ghArgs.push("--repo", repo);
    }
    runGhSecretSet(ghArgs);
  }

  const response = {
    action: dryRun ? "validated" : "stored",
    secretName,
    githubEnvironment,
    repo: repo || null,
    scope: "environment",
    app: "actions",
    sourceFile: relativeSecretFile,
    keyCount: Object.keys(parsedSecret).length,
    normalizedJsonLength: normalizedSecret.length,
    commandPreview,
  };

  if (outputMode === "json") {
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    return;
  }

  console.log("\nGitHub app-config secret sync complete.");
  console.log(`Action: ${response.action}`);
  console.log(`Secret name: ${response.secretName}`);
  console.log(`GitHub environment: ${response.githubEnvironment}`);
  console.log(`Repository: ${response.repo || "(current repository)"}`);
  console.log(`Source file: ${response.sourceFile}`);
  console.log(`JSON keys: ${response.keyCount}`);
  console.log(`Reusable command: ${response.commandPreview}`);
}

main();
