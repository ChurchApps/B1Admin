import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  boolArg,
  failText,
  getArg,
  inferDeployRepo,
  printJson,
  relativeToRoot,
  rootDir,
} from "./installer-common.mjs";

const requiredSecrets = [
  "AWS_ROLE_TO_ASSUME",
  "AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN",
  "AWS_APP_CONFIG_SECRET_JSON",
];

function splitRepo(repo) {
  const [owner, name] = String(repo || "").split("/");
  return { owner, name };
}

function environmentsFromArg() {
  const value = getArg("environment", "all").toLowerCase();
  if (value === "all" || value === "") return ["staging", "prod"];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function runGh(args) {
  return spawnSync("gh", args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function parseJson(result, label) {
  try {
    return JSON.parse(result.stdout || "{}");
  } catch {
    throw new Error(result.stderr.trim() || `Could not parse ${label} output.`);
  }
}

function checkEnvironment(repoParts, environment, skipGhCheck) {
  const githubEnvironment = `aws-${environment}`;
  if (skipGhCheck) {
    return {
      environment,
      githubEnvironment,
      exists: false,
      skipped: true,
      secrets: requiredSecrets.map((name) => ({ name, present: false, skipped: true })),
      missingSecrets: requiredSecrets,
      ok: false,
    };
  }

  const environmentResult = runGh([
    "api",
    `repos/${repoParts.owner}/${repoParts.name}/environments/${githubEnvironment}`,
  ]);
  const exists = environmentResult.status === 0;
  let secretNames = [];

  if (exists) {
    const secretsResult = runGh([
      "api",
      `repos/${repoParts.owner}/${repoParts.name}/environments/${githubEnvironment}/secrets`,
    ]);
    if (secretsResult.status !== 0) {
      return {
        environment,
        githubEnvironment,
        exists,
        ok: false,
        error: secretsResult.stderr.trim() || secretsResult.stdout.trim() || `Could not list secrets for ${githubEnvironment}.`,
        secrets: requiredSecrets.map((name) => ({ name, present: false })),
        missingSecrets: requiredSecrets,
      };
    }
    const parsed = parseJson(secretsResult, "GitHub environment secrets");
    secretNames = Array.isArray(parsed.secrets) ? parsed.secrets.map((secret) => secret.name) : [];
  }

  const secrets = requiredSecrets.map((name) => ({ name, present: secretNames.includes(name) }));
  const missingSecrets = secrets.filter((secret) => !secret.present).map((secret) => secret.name);

  return {
    environment,
    githubEnvironment,
    exists,
    ok: exists && missingSecrets.length === 0,
    error: exists ? "" : (environmentResult.stderr.trim() || environmentResult.stdout.trim() || `${githubEnvironment} does not exist.`),
    secrets,
    missingSecrets,
  };
}

function renderMarkdown(result) {
  const lines = [
    "# GitHub Deployment Readiness",
    "",
    `- Status: ${result.ok ? "ready" : "needs attention"}`,
    `- Repository: \`${result.repo}\``,
    "",
    "## Environments",
    "",
  ];

  result.environments.forEach((environment) => {
    lines.push(`- ${environment.ok ? "OK" : "TODO"}: ${environment.githubEnvironment}${environment.exists ? "" : " - missing environment"}`);
    environment.secrets.forEach((secret) => {
      lines.push(`  - ${secret.present ? "OK" : "TODO"}: ${secret.name}`);
    });
    if (environment.error) lines.push(`  - Error: ${environment.error}`);
  });

  if (result.nextSteps.length > 0) {
    lines.push("", "## Next Steps", "");
    result.nextSteps.forEach((step) => lines.push(`- ${step}`));
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const outputMode = getArg("output", "text").toLowerCase();
  const repo = inferDeployRepo(getArg("repo"));
  const skipGhCheck = boolArg("skip-gh-check", false);
  const write = boolArg("write", false);
  const requestedEnvironment = getArg("environment", "all").toLowerCase();
  const outputFile = path.resolve(rootDir, getArg(
    "output-file",
    requestedEnvironment === "all" || requestedEnvironment === ""
      ? path.join("deployment", "github-readiness.json")
      : path.join("deployment", requestedEnvironment, "github-readiness.json"),
  ));
  if (!repo) failText("DEPLOY_REPO or --repo is required.", outputMode);

  const repoParts = splitRepo(repo);
  if (!repoParts.owner || !repoParts.name) failText(`Repository must use owner/name format: ${repo}`, outputMode);

  const environments = environmentsFromArg().map((environment) => checkEnvironment(repoParts, environment, skipGhCheck));
  const result = {
    ok: environments.every((environment) => environment.ok),
    repo,
    write,
    outputFile: relativeToRoot(outputFile),
    skipped: skipGhCheck,
    requiredSecrets,
    environments,
    nextSteps: [
      "Run `yarn installer:github-setup -- --write=true --write-secrets=true --output=markdown` for any missing environments or secrets.",
      "Run `yarn installer:preflight -- --environment=<staging|prod> --output=markdown` after GitHub readiness is clean.",
    ],
  };

  if (write) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, `${JSON.stringify(result, null, 2)}\n`);
  }

  if (outputMode === "json") {
    printJson(result);
  } else if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(renderMarkdown(result));
  } else {
    console.log(`GitHub readiness: ${result.ok ? "ready" : "needs attention"}`);
  }

  process.exit(result.ok ? 0 : 1);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
