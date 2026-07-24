import {
  boolArg,
  failText,
  getArg,
  printJson,
  relativeToRoot,
  requireEnvironmentDir,
  resolveEnvironmentDir,
  rootDir,
  runNodeJson,
} from "./installer-common.mjs";

function passThroughArgs(environment, environmentDirArg) {
  const names = [
    "account-id",
    "root-domain",
    "support-email",
    "support-phone",
    "support-site-url",
    "website-base-url",
    "content-root-url",
    "admin-root-url",
    "cors-origin",
    "frontend-domain",
    "frontend-certificate-arn",
    "frontend-hosted-zone-id",
    "store-api-url",
    "transfer-url",
    "mobile-app-url",
    "domain-cname-target",
    "domain-a-target",
    "default-stock-photo",
    "google-analytics-tag",
    "project-name",
    "force",
    "generate-secrets",
    "write-secret-file",
  ];

  const args = [
    `--environment=${environment}`,
    "--output=json",
  ];
  if (environmentDirArg) args.push(`--environment-dir=${environmentDirArg}`);
  if (boolArg("write")) args.push("--write=true");

  names.forEach((name) => {
    const value = getArg(name);
    if (value !== "") args.push(`--${name}=${value}`);
  });

  return args;
}

function renderMarkdown(result) {
  const lines = [
    `# Installer Configure: ${result.environment}`,
    "",
    `- Status: ${result.ok ? "configured" : "needs attention"}`,
    `- Write mode: ${result.write ? "yes" : "preview only"}`,
    `- Environment dir: \`${result.environmentDir}\``,
    `- Proposed changes: ${result.changeCount}`,
    `- Audit blockers after configure: ${result.auditBlockerCount}`,
    "",
    "## Next Commands",
    "",
    `- Preflight: \`${result.nextCommands.preflight}\``,
    `- Preview deploy: \`${result.nextCommands.previewDeploy}\``,
    `- Real deploy: \`${result.nextCommands.realDeploy}\``,
  ];

  if (result.auditBlockers.length > 0) {
    lines.push("", "## Remaining Blockers", "");
    result.auditBlockers.forEach((blocker) => lines.push(`- ${blocker}`));
  }

  return `${lines.join("\n")}\n`;
}

function installerSafeNextSteps(nextSteps) {
  return (nextSteps || []).map((line) => String(line)
    .replace("frontend/API custom-domain values", "frontend custom-domain values")
    .replace(" and --api-domain/--api-certificate-arn/--api-hosted-zone-id", ""));
}

function main() {
  const environment = getArg("environment", "staging");
  const environmentDirArg = getArg("environment-dir");
  const outputMode = getArg("output", "text").toLowerCase();
  const includeDetails = boolArg("include-details", false);
  const environmentDir = resolveEnvironmentDir(environment, environmentDirArg);

  try {
    requireEnvironmentDir(environmentDir);
  } catch (error) {
    failText(error instanceof Error ? error.message : String(error), outputMode);
  }

  const prepare = runNodeJson("scripts/prepare-environment-starter.mjs", passThroughArgs(environment, environmentDirArg));
  if (!prepare.parsed) {
    failText(`Could not parse prepare output.\n${prepare.stderr || prepare.stdout}`, outputMode);
  }

  const audit = runNodeJson("scripts/audit-environment-starter.mjs", [
    `--environment=${environment}`,
    ...(environmentDirArg ? [`--environment-dir=${environmentDirArg}`] : []),
    "--only-blockers=true",
    "--output=json",
  ]);

  const auditBlockers = (audit.parsed?.nextSteps || []).flatMap((step) => (
    Array.isArray(step.keys) ? step.keys.map((key) => `${step.file}: ${key}`) : [step.action]
  ));

  const envDirDisplay = relativeToRoot(environmentDir);
  const result = {
    ok: prepare.ok && audit.ok,
    environment,
    environmentDir: envDirDisplay,
    write: Boolean(prepare.parsed.write),
    changeCount: prepare.parsed.changes?.length || 0,
    auditBlockerCount: audit.parsed?.blockerSummary?.blockerCount ?? auditBlockers.length,
    auditBlockers,
    prepareSummary: {
      ok: prepare.parsed.ok,
      generatedSecrets: prepare.parsed.generatedSecrets,
      usedExistingSecretFile: prepare.parsed.usedExistingSecretFile,
      writeSecretFile: prepare.parsed.writeSecretFile,
      nextSteps: installerSafeNextSteps(prepare.parsed.nextSteps),
    },
    nextCommands: {
      preflight: `yarn installer:preflight -- --environment=${environment}${environmentDirArg ? ` --environment-dir=${environmentDirArg}` : ""} --output=markdown`,
      previewDeploy: `yarn installer:deploy -- --environment=${environment}${environmentDirArg ? ` --environment-dir=${environmentDirArg}` : ""} --preview-only=true`,
      realDeploy: `yarn installer:deploy -- --environment=${environment}${environmentDirArg ? ` --environment-dir=${environmentDirArg}` : ""} --confirm=true`,
    },
  };

  if (includeDetails) {
    result.prepare = prepare.parsed;
    result.audit = audit.parsed;
  }

  if (outputMode === "json") {
    printJson(result);
  } else if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(renderMarkdown(result));
  } else {
    console.log(`Installer configure: ${environment}`);
    console.log(`Environment dir: ${envDirDisplay}`);
    console.log(`Write mode: ${result.write ? "yes" : "preview only"}`);
    console.log(`Proposed changes: ${result.changeCount}`);
    console.log(`Audit blockers after configure: ${result.auditBlockerCount}`);
    console.log("");
    console.log("Next commands:");
    Object.values(result.nextCommands).forEach((command) => console.log(`- ${command}`));
  }

  process.exit(result.ok ? 0 : 1);
}

main();
