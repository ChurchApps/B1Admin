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

function readSummary(summaryFileArg) {
  const summaryPath = path.resolve(rootDir, summaryFileArg);
  try {
    return {
      path: summaryPath,
      data: JSON.parse(fs.readFileSync(summaryPath, "utf8")),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not load deployment summary "${summaryFileArg}": ${message}`);
  }
}

function renderMarkdown(summary) {
  const lines = [
    `## ${summary.environment || "deployment"} summary`,
    "",
    `- Region: \`${summary.region || ""}\``,
    `- Backend stack: \`${summary.stackNames?.backend || ""}\``,
    `- Frontend stack: \`${summary.stackNames?.frontend || ""}\``,
    `- API base URL: \`${summary.resolved?.apiBaseUrl || ""}\``,
    `- Frontend app URL: \`${summary.resolved?.frontendAppUrl || ""}\``,
    `- Frontend bucket: \`${summary.resolved?.frontendBucketName || ""}\``,
    `- CloudFront distribution: \`${summary.resolved?.frontendDistributionId || ""}\``,
    `- App config secret ARN: \`${summary.resolved?.appConfigSecretArn || ""}\``,
    "",
    "### Saved files",
    "",
    `- Backend outputs: \`${summary.files?.backendOutputsFile || ""}\``,
    `- Frontend outputs: \`${summary.files?.frontendOutputsFile || ""}\``,
    `- Summary file: \`${summary.files?.summaryFile || ""}\``,
    "",
    "### Follow-up commands",
    "",
    `- Verify from saved outputs: \`${summary.followUpCommands?.verifyFromSavedOutputs || ""}\``,
    `- Verify with HTTP probe: \`${summary.followUpCommands?.verifyFromSavedOutputsWithHttp || ""}\``,
    `- Publish frontend assets later: \`${summary.followUpCommands?.publishFrontendAssetsFromSavedOutputs || ""}\``,
  ];

  if (summary.files?.preflightPlanFile) {
    lines.splice(lines.indexOf("### Follow-up commands") - 1, 0, `- Preflight plan: \`${summary.files.preflightPlanFile}\``);
  }

  if (summary.followUpCommands?.publishFromSavedOutputs) {
    lines.push(`- Re-run staged publish flow: \`${summary.followUpCommands.publishFromSavedOutputs}\``);
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderCommands(summary) {
  const lines = [];
  const commands = [
    summary.followUpCommands?.verifyFromSavedOutputs || "",
    summary.followUpCommands?.verifyFromSavedOutputsWithHttp || "",
    summary.followUpCommands?.publishFrontendAssetsFromSavedOutputs || "",
    summary.followUpCommands?.publishFromSavedOutputs || "",
    summary.followUpCommands?.showDeploymentSummary || "",
  ].filter((command, index, list) => command && list.indexOf(command) === index);

  commands.forEach((command) => lines.push(command));
  return `${lines.join("\n").trimEnd()}\n`;
}

function renderText(summary, summaryFileArg) {
  const lines = [
    `Deployment summary: ${summary.environment || "deployment"}`,
    `Region: ${summary.region || ""}`,
    `Backend stack: ${summary.stackNames?.backend || ""}`,
    `Frontend stack: ${summary.stackNames?.frontend || ""}`,
    `API base URL: ${summary.resolved?.apiBaseUrl || ""}`,
    `Frontend app URL: ${summary.resolved?.frontendAppUrl || ""}`,
    `Frontend bucket: ${summary.resolved?.frontendBucketName || ""}`,
    `CloudFront distribution: ${summary.resolved?.frontendDistributionId || ""}`,
    `App config secret ARN: ${summary.resolved?.appConfigSecretArn || ""}`,
    `Backend outputs file: ${summary.files?.backendOutputsFile || ""}`,
    `Frontend outputs file: ${summary.files?.frontendOutputsFile || ""}`,
    `Summary file: ${summary.files?.summaryFile || summaryFileArg}`,
    ...(summary.files?.preflightPlanFile ? [`Preflight plan file: ${summary.files.preflightPlanFile}`] : []),
    `Verify from saved outputs: ${summary.followUpCommands?.verifyFromSavedOutputs || ""}`,
    `Verify with HTTP probe: ${summary.followUpCommands?.verifyFromSavedOutputsWithHttp || ""}`,
    `Publish frontend assets later: ${summary.followUpCommands?.publishFrontendAssetsFromSavedOutputs || ""}`,
  ];

  if (summary.followUpCommands?.publishFromSavedOutputs) {
    lines.push(`Re-run staged publish flow: ${summary.followUpCommands.publishFromSavedOutputs}`);
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function main() {
  const summaryFile = getArg("summary-file", "deployment/staging/deployment-summary.json");
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";
  const markdownOutput = outputMode === "markdown" || outputMode === "md";
  const commandsOutput = outputMode === "commands" || outputMode === "shell";

  let summary = null;
  try {
    summary = readSummary(summaryFile).data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify({ ok: false, summaryFile, errors: [message] }, null, 2)}\n`);
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  const rendered = commandsOutput
    ? renderCommands(summary)
    : markdownOutput
      ? renderMarkdown(summary)
      : renderText(summary, summaryFile);
  process.stdout.write(rendered);
}

main();
