import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  boolArg,
  failText,
  getArg,
  inferDeployRepo,
  printJson,
  relativeToRoot,
  resolveEnvironmentDir,
  runNodeJson,
} from "./installer-common.mjs";

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

function readJsonFile(filePath, label, outputMode) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    failText(`Could not read ${label}: ${filePath}. ${error instanceof Error ? error.message : String(error)}`, outputMode);
  }
}

function isStarterSecret(value) {
  return !value || String(value).startsWith("replace-me");
}

function renderMarkdown(result) {
  const lines = [
    `# App Config Secret: ${result.environment}`,
    "",
    `- Status: ${result.ok ? "ok" : "needs attention"}`,
    `- Secret file: \`${result.secretFile}\``,
    `- File action: ${result.fileAction}`,
    `- GitHub sync: ${result.githubSync.action}`,
    `- GitHub environment: \`${result.githubSync.githubEnvironment}\``,
    `- Secret name: \`${result.githubSync.secretName}\``,
  ];

  if (result.githubSync.commandPreview) {
    lines.push("", "## GitHub Secret Command", "", `\`${result.githubSync.commandPreview}\``);
  }

  if (result.nextSteps.length > 0) {
    lines.push("", "## Next Steps", "");
    result.nextSteps.forEach((step) => lines.push(`- ${step}`));
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const environment = getArg("environment", "staging");
  const outputMode = getArg("output", "text").toLowerCase();
  const environmentDir = resolveEnvironmentDir(environment, getArg("environment-dir"));
  const write = boolArg("write", false);
  const force = boolArg("force", false);
  const syncGithubSecret = boolArg("sync-github-secret", false);
  const githubDryRun = !boolArg("confirm-github-sync", false);
  const repo = inferDeployRepo(getArg("repo"));
  const githubEnvironment = getArg("github-environment", `aws-${environment}`);
  const secretName = getArg("secret-name", "AWS_APP_CONFIG_SECRET_JSON");
  const skipGhAuthCheck = boolArg("skip-gh-auth-check", false);

  const templateFile = path.join(environmentDir, "app-config-secret.template.json");
  const secretFile = path.join(environmentDir, "app-config-secret.json");

  if (!fs.existsSync(templateFile)) {
    failText(`Missing app config secret template: ${relativeToRoot(templateFile)}`, outputMode);
  }

  const template = readJsonFile(templateFile, "app config secret template", outputMode);
  const existingSecret = fs.existsSync(secretFile)
    ? readJsonFile(secretFile, "existing app config secret", outputMode)
    : null;
  const sourceSecret = existingSecret && !force ? existingSecret : template;
  const supportEmail = getArg("support-email");
  const explicitWebPushSubject = getArg("web-push-subject");
  const webPushSubject = explicitWebPushSubject
    || (supportEmail ? `mailto:${supportEmail}` : sourceSecret.webPushSubject);
  const generated = {
    ...sourceSecret,
    jwtSecret: isStarterSecret(sourceSecret.jwtSecret) || force ? randomHex(48) : sourceSecret.jwtSecret,
    encryptionKey: isStarterSecret(sourceSecret.encryptionKey) || force ? randomHex(32) : sourceSecret.encryptionKey,
    webPushSubject,
  };

  const missingRequired = ["jwtSecret", "encryptionKey", "webPushSubject"]
    .filter((key) => typeof generated[key] !== "string" || generated[key].trim() === "" || isStarterSecret(generated[key]));
  if (missingRequired.length > 0) {
    failText(`App config secret still has unresolved values: ${missingRequired.join(", ")}`, outputMode);
  }

  let fileAction = "preview";
  if (existingSecret && !force) fileAction = "reuse-existing";
  if (write && (!existingSecret || force)) {
    fs.writeFileSync(secretFile, `${JSON.stringify(generated, null, 2)}\n`);
    fileAction = existingSecret ? "replaced" : "created";
  } else if (write && existingSecret && !force) {
    fileAction = "kept-existing";
  }

  let githubSync = {
    action: syncGithubSecret ? "preview" : "not requested",
    secretName,
    githubEnvironment,
    repo: repo || null,
    commandPreview: repo
      ? `gh secret set ${secretName} --repo ${repo} --env ${githubEnvironment} --body-file '${relativeToRoot(secretFile)}'`
      : `gh secret set ${secretName} --env ${githubEnvironment} --body-file '${relativeToRoot(secretFile)}'`,
  };

  if (syncGithubSecret) {
    if (!write && !existingSecret) {
      failText("Use --write=true before syncing a newly generated app config secret.", outputMode);
    }

    const syncArgs = [
      `--environment=${environment}`,
      `--github-environment=${githubEnvironment}`,
      `--secret-name=${secretName}`,
      `--secret-file=${secretFile}`,
      `--dry-run=${githubDryRun ? "true" : "false"}`,
      `--skip-gh-auth-check=${skipGhAuthCheck ? "true" : "false"}`,
      "--output=json",
    ];
    if (repo) syncArgs.push(`--repo=${repo}`);

    const sync = runNodeJson("scripts/sync-github-app-config-secret.mjs", syncArgs);
    if (!sync.ok || !sync.parsed) {
      failText(sync.stderr.trim() || sync.stdout.trim() || "GitHub app-config secret sync failed.", outputMode);
    }

    githubSync = {
      action: sync.parsed.action,
      secretName: sync.parsed.secretName,
      githubEnvironment: sync.parsed.githubEnvironment,
      repo: sync.parsed.repo,
      commandPreview: sync.parsed.commandPreview,
    };
  }

  const nextSteps = [];
  if (!write && (!existingSecret || force)) {
    nextSteps.push("Re-run with `--write=true` to create `app-config-secret.json`.");
  }
  if (write && !syncGithubSecret) {
    nextSteps.push("Re-run with `--sync-github-secret=true` to validate the GitHub secret sync.");
  }
  if (syncGithubSecret && githubDryRun) {
    nextSteps.push("Re-run with `--sync-github-secret=true --confirm-github-sync=true` to store `AWS_APP_CONFIG_SECRET_JSON` in GitHub.");
  }

  const result = {
    ok: true,
    environment,
    environmentDir: relativeToRoot(environmentDir),
    secretFile: relativeToRoot(secretFile),
    fileAction,
    keyCount: Object.keys(generated).length,
    githubSync,
    nextSteps,
  };

  if (outputMode === "json") {
    printJson(result);
  } else if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(renderMarkdown(result));
  } else {
    console.log(`App config secret: ${environment}`);
    console.log(`Secret file: ${result.secretFile}`);
    console.log(`File action: ${fileAction}`);
    console.log(`GitHub sync: ${githubSync.action}`);
    nextSteps.forEach((step) => console.log(`- ${step}`));
  }
}

main();
