import {
  boolArg,
  failText,
  getArg,
  printJson,
  relativeToRoot,
  rootDir,
  runNodeJson,
} from "./installer-common.mjs";
import fs from "node:fs";
import path from "node:path";

function main() {
  const environment = getArg("environment", "staging");
  const outputMode = getArg("output", "text").toLowerCase();
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const stackName = getArg("stack-name", `b1admin-${environment}-backend`);
  const dryRun = boolArg("dry-run", true);
  const writeEvidence = boolArg("write-evidence", true);
  const deploymentRoot = getArg("deployment-root", "deployment");
  const outputFile = path.resolve(rootDir, getArg("output-file", path.join(deploymentRoot, environment, "bootstrap-admin.json")));
  const adminEmail = getArg("bootstrap-admin-email") || getArg("first-admin-email");
  const adminPassword = getArg("bootstrap-admin-password") || getArg("first-admin-password");
  const churchName = getArg("bootstrap-church-name") || getArg("first-church-name");

  const required = [
    ["bootstrap-admin-email or firstAdminEmail", adminEmail],
    ["bootstrap-admin-password or firstAdminPassword", adminPassword],
    ["bootstrap-church-name or firstChurchName", churchName],
  ].filter(([, value]) => !value);

  if (required.length > 0) {
    failText(`Missing required first-admin values: ${required.map(([name]) => name).join(", ")}`, outputMode);
  }

  const args = [
    `--region=${region}`,
    `--stack-name=${stackName}`,
    `--bootstrap-admin-email=${adminEmail}`,
    `--bootstrap-admin-password=${adminPassword}`,
    `--bootstrap-church-name=${churchName}`,
    `--dry-run=${dryRun ? "true" : "false"}`,
    "--output=json",
  ];

  [
    "bootstrap-admin-first-name",
    "bootstrap-admin-last-name",
    "bootstrap-admin-display-name",
    "bootstrap-church-subdomain",
    "bootstrap-church-address1",
    "bootstrap-church-address2",
    "bootstrap-church-city",
    "bootstrap-church-state",
    "bootstrap-church-zip",
    "bootstrap-church-country",
    "bootstrap-membership-status",
    "bootstrap-admin-reset-password",
  ].forEach((name) => {
    const value = getArg(name);
    if (value !== "") args.push(`--${name}=${value}`);
  });

  const run = runNodeJson("scripts/bootstrap-initial-admin.mjs", args);
  if (!run.ok || !run.parsed) {
    failText(run.stderr.trim() || run.stdout.trim() || "Could not run first-admin bootstrap helper.", outputMode);
  }

  const bootstrapOk = run.parsed.ok !== false;

  if (writeEvidence && !dryRun) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, `${JSON.stringify({
      ...run.parsed,
      evidenceFile: relativeToRoot(outputFile),
      writtenAt: new Date().toISOString(),
    }, null, 2)}\n`);
    run.parsed.evidenceFile = relativeToRoot(outputFile);
  }

  if (outputMode === "json") {
    printJson(run.parsed);
  } else if (outputMode === "markdown" || outputMode === "md") {
    const lines = [
      `# Installer First Admin: ${environment}`,
      "",
      `- Status: ${bootstrapOk ? "ok" : "failed"}`,
      `- Dry run: ${run.parsed.dryRun ? "yes" : "no"}`,
      `- Stack: \`${stackName}\``,
      `- Admin email: \`${run.parsed.adminEmail || adminEmail}\``,
      `- Church: \`${run.parsed.churchName || churchName}\``,
    ];
    if (run.parsed.evidenceFile) lines.push(`- Evidence: \`${run.parsed.evidenceFile}\``);
    process.stdout.write(`${lines.join("\n")}\n`);
  } else {
    console.log(`Installer first admin: ${bootstrapOk ? "ok" : "failed"}`);
    console.log(`Dry run: ${run.parsed.dryRun ? "yes" : "no"}`);
    console.log(`Stack: ${stackName}`);
  }

  process.exit(bootstrapOk ? 0 : 1);
}

main();
