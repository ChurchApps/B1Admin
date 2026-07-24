import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getFieldMetadata,
  optionalBlankKeys,
  phaseMetadata,
  phaseOrder,
  requiredFiles,
  unsafeDefaultMatchers,
} from "./lib/environment-setup-metadata.mjs";

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

function resolveEnvironmentDir(environment, explicitDir = "") {
  if (explicitDir) {
    return path.resolve(rootDir, explicitDir);
  }
  return path.join(rootDir, "infrastructure", "environments", environment);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isPlaceholder(value) {
  return typeof value === "string" && value.includes("replace-me");
}

function isBlankString(value) {
  return typeof value === "string" && value.trim() === "";
}

function isResolvedSecretValue(value) {
  return typeof value === "string" && value.trim() !== "" && !value.includes("replace-me");
}

function isUnsafeDefault(fileName, key, value) {
  const matcher = unsafeDefaultMatchers[fileName]?.[key];
  return typeof matcher === "function" ? matcher(value) : false;
}

function getFieldState(fileName, key, value, secretOverride) {
  const overrideValue = secretOverride?.[key];
  const resolvedByOverride = isResolvedSecretValue(overrideValue);

  if (isPlaceholder(value)) {
    if (resolvedByOverride) return { state: "ready", source: "app-config-secret.json", value: overrideValue };
    return { state: "needs-value", reason: "placeholder" };
  }

  if (isUnsafeDefault(fileName, key, value)) {
    if (resolvedByOverride) return { state: "ready", source: "app-config-secret.json", value: overrideValue };
    return { state: "needs-value", reason: "starter-default" };
  }

  if (isBlankString(value)) {
    if (resolvedByOverride) return { state: "ready", source: "app-config-secret.json", value: overrideValue };
    const isOptional = optionalBlankKeys[fileName]?.has(key) ?? false;
    return { state: isOptional ? "optional-empty" : "needs-value", reason: isOptional ? "optional-blank" : "required-blank" };
  }

  return { state: "ready", value };
}

function buildPrepCommands(environment) {
  return [
    `yarn prepare:environment-starter -- --environment=${environment} --account-id=<aws-account-id> --output=markdown`,
    `yarn prepare:environment-starter -- --environment=${environment} --account-id=<aws-account-id> --root-domain=<your-domain> --output=markdown`,
    `yarn discover:github-aws-roles -- --environment=${environment} --output=markdown`,
    `yarn audit:environment-starter -- --environment=${environment} --only-blockers=true`,
  ];
}

function buildPhaseSummary(entries) {
  return {
    total: entries.length,
    ready: entries.filter((entry) => entry.state === "ready").length,
    needsValue: entries.filter((entry) => entry.state === "needs-value").length,
    optionalEmpty: entries.filter((entry) => entry.state === "optional-empty").length,
  };
}

function buildGuide(environment, environmentDir) {
  const missingFiles = requiredFiles.filter((fileName) => !fs.existsSync(path.join(environmentDir, fileName)));
  if (missingFiles.length > 0) {
    return {
      ok: false,
      environment,
      environmentDir: path.relative(rootDir, environmentDir),
      errors: [`Missing required starter files: ${missingFiles.join(", ")}`],
    };
  }

  const secretOverridePath = path.join(environmentDir, "app-config-secret.json");
  const secretOverride = fs.existsSync(secretOverridePath) ? readJson(secretOverridePath) : null;
  const groups = Object.fromEntries(phaseOrder.map((phase) => [phase, []]));

  requiredFiles.forEach((fileName) => {
    const filePath = path.join(environmentDir, fileName);
    const parsed = readJson(filePath);

    Object.entries(parsed).forEach(([key, value]) => {
      const metadata = getFieldMetadata(fileName, key);
      const state = getFieldState(
        fileName,
        key,
        value,
        fileName === "app-config-secret.template.json" ? secretOverride : null,
      );

      groups[metadata.phase].push({
        fileName,
        file: path.relative(rootDir, filePath),
        key,
        label: metadata.label,
        rationale: metadata.rationale,
        state: state.state,
        reason: state.reason || "",
        source: state.source || "",
        currentValue: state.value ?? value,
      });
    });
  });

  const summaries = Object.fromEntries(
    phaseOrder.map((phase) => [phase, buildPhaseSummary(groups[phase])]),
  );
  const firstDeployBlockers = groups["first-deploy"].filter((entry) => entry.state === "needs-value");

  return {
    ok: firstDeployBlockers.length === 0,
    environment,
    environmentDir: path.relative(rootDir, environmentDir),
    firstDeployReady: firstDeployBlockers.length === 0,
    usedSecretOverride: Boolean(secretOverride),
    summaries,
    groups,
    firstDeployBlockers,
    recommendedCommands: buildPrepCommands(environment),
  };
}

function formatValue(value) {
  if (typeof value === "string" && value.length > 90) return `${value.slice(0, 87)}...`;
  if (value === "") return "<blank>";
  return String(value);
}

function renderText(result, selectedPhase) {
  const showMode = getArg("show", "actionable").toLowerCase();
  const lines = [
    `Environment setup guide: ${result.environment}`,
    `Path: ${result.environmentDir}`,
    `First deploy status: ${result.firstDeployReady ? "ready" : "blocked"}`,
    `Secret override file present: ${result.usedSecretOverride ? "yes" : "no"}`,
    `View: ${showMode}`,
  ];

  if (result.firstDeployBlockers.length > 0) {
    lines.push("", "First deploy blockers:");
    result.firstDeployBlockers.forEach((entry) => {
      lines.push(`- ${entry.key} (${entry.file})`);
    });
  }

  const phasesToShow = selectedPhase === "all" ? phaseOrder : [selectedPhase];
  phasesToShow.forEach((phase) => {
    const phaseInfo = phaseMetadata[phase];
    const summary = result.summaries[phase];
    const entries = showMode === "all"
      ? result.groups[phase]
      : result.groups[phase].filter((entry) => entry.state !== "ready");
    lines.push(
      "",
      `${phaseInfo.title}: ${summary.ready} ready, ${summary.needsValue} needs value, ${summary.optionalEmpty} optional blank`,
      phaseInfo.description,
    );

    if (entries.length === 0) {
      lines.push("- No actionable items in this phase.");
      return;
    }

    entries.forEach((entry) => {
      const suffix = entry.source ? ` via ${entry.source}` : "";
      lines.push(`- [${entry.state}] ${entry.key} :: ${entry.file}${suffix}`);
      lines.push(`  ${entry.rationale}`);
      lines.push(`  Current: ${formatValue(entry.currentValue)}`);
    });
  });

  lines.push("", "Recommended commands:");
  result.recommendedCommands.forEach((command) => lines.push(`- ${command}`));

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderMarkdown(result, selectedPhase) {
  const showMode = getArg("show", "actionable").toLowerCase();
  const lines = [
    `# Environment Setup Guide: ${result.environment}`,
    "",
    `- Path: \`${result.environmentDir}\``,
    `- First deploy status: ${result.firstDeployReady ? "ready" : "blocked"}`,
    `- Secret override file present: ${result.usedSecretOverride ? "yes" : "no"}`,
    `- View: \`${showMode}\``,
  ];

  if (result.firstDeployBlockers.length > 0) {
    lines.push("", "## First Deploy Blockers", "");
    result.firstDeployBlockers.forEach((entry) => {
      lines.push(`- \`${entry.key}\` in \`${entry.file}\``);
    });
  }

  const phasesToShow = selectedPhase === "all" ? phaseOrder : [selectedPhase];
  phasesToShow.forEach((phase) => {
    const phaseInfo = phaseMetadata[phase];
    const summary = result.summaries[phase];
    const entries = showMode === "all"
      ? result.groups[phase]
      : result.groups[phase].filter((entry) => entry.state !== "ready");
    lines.push("", `## ${phaseInfo.title}`, "");
    lines.push(phaseInfo.description, "");
    lines.push(`- Ready: ${summary.ready}`);
    lines.push(`- Needs value: ${summary.needsValue}`);
    lines.push(`- Optional blank: ${summary.optionalEmpty}`, "");

    if (entries.length === 0) {
      lines.push("- No actionable items in this phase.");
      return;
    }

    entries.forEach((entry) => {
      const suffix = entry.source ? ` via \`${entry.source}\`` : "";
      lines.push(`- [${entry.state}] \`${entry.key}\` in \`${entry.file}\`${suffix}`);
      lines.push(`  ${entry.rationale}`);
      lines.push(`  Current: \`${formatValue(entry.currentValue)}\``);
    });
  });

  lines.push("", "## Recommended Commands", "");
  result.recommendedCommands.forEach((command) => lines.push(`- \`${command}\``));

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderCommands(result) {
  return `${result.recommendedCommands.join("\n")}\n`;
}

function main() {
  const environment = getArg("environment", "staging");
  const environmentDirArg = getArg("environment-dir");
  const outputMode = getArg("output", "text").toLowerCase();
  const selectedPhase = getArg("phase", "all").toLowerCase();
  const environmentDir = resolveEnvironmentDir(environment, environmentDirArg);

  if (!fs.existsSync(environmentDir)) {
    const message = `Unknown environment starter "${environment}". Expected a directory under infrastructure/environments/.`;
    if (outputMode === "json") {
      process.stdout.write(`${JSON.stringify({ ok: false, environment, errors: [message] }, null, 2)}\n`);
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  if (selectedPhase !== "all" && !phaseOrder.includes(selectedPhase)) {
    console.error(`Unsupported phase "${selectedPhase}". Use one of: all, ${phaseOrder.join(", ")}`);
    process.exit(1);
  }

  const result = buildGuide(environment, environmentDir);
  if (!result.ok && result.errors) {
    if (outputMode === "json") {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      console.error(result.errors.join("\n"));
    }
    process.exit(1);
  }

  if (outputMode === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(renderMarkdown(result, selectedPhase));
  } else if (outputMode === "commands" || outputMode === "shell") {
    process.stdout.write(renderCommands(result));
  } else {
    process.stdout.write(renderText(result, selectedPhase));
  }

  process.exit(result.firstDeployReady ? 0 : 1);
}

main();
