import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  optionalBlankKeys,
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

function auditFile(fileName, filePath, options = {}) {
  const parsed = readJson(filePath);
  const placeholders = [];
  const unsafeDefaults = [];
  const requiredBlankValues = [];
  const optionalBlankValues = [];
  const optionalBlankSet = optionalBlankKeys[fileName] || new Set();
  const resolvedBySecretFile = [];
  const secretOverride = options.secretOverride || null;

  Object.entries(parsed).forEach(([key, value]) => {
    const overrideValue = secretOverride?.[key];
    const resolvedByOverride = isResolvedSecretValue(overrideValue);

    if (isPlaceholder(value)) {
      if (resolvedByOverride) {
        resolvedBySecretFile.push({ key, value: overrideValue });
        return;
      }
      placeholders.push({ key, value });
      return;
    }

    if (isUnsafeDefault(fileName, key, value)) {
      if (resolvedByOverride) {
        resolvedBySecretFile.push({ key, value: overrideValue });
        return;
      }
      unsafeDefaults.push({ key, value });
      return;
    }

    if (isBlankString(value)) {
      if (resolvedByOverride) {
        resolvedBySecretFile.push({ key, value: overrideValue });
        return;
      }
      if (optionalBlankSet.has(key)) {
        optionalBlankValues.push({ key, value });
      } else {
        requiredBlankValues.push({ key, value });
      }
    }
  });

  return {
    fileName,
    relativePath: path.relative(rootDir, filePath),
    placeholders,
    unsafeDefaults,
    requiredBlankValues,
    optionalBlankValues,
    resolvedBySecretFile,
  };
}

function buildNextSteps(displayedFiles) {
  const steps = [];

  displayedFiles.forEach((fileAudit) => {
    const blockerKeys = [
      ...fileAudit.placeholders.map((entry) => entry.key),
      ...fileAudit.unsafeDefaults.map((entry) => entry.key),
      ...fileAudit.requiredBlankValues.map((entry) => entry.key),
    ];

    if (blockerKeys.length === 0) return;

    steps.push({
      file: fileAudit.relativePath,
      action: `Replace or fill ${blockerKeys.length} blocker value${blockerKeys.length === 1 ? "" : "s"}.`,
      keys: blockerKeys,
    });
  });

  return steps;
}

function buildSuggestions(environment, displayedFiles) {
  const suggestions = [];

  displayedFiles.forEach((fileAudit) => {
    const placeholderKeys = new Set(fileAudit.placeholders.map((entry) => entry.key));
    const unsafeDefaultKeys = new Set(fileAudit.unsafeDefaults.map((entry) => entry.key));
    const requiredBlankKeys = new Set(fileAudit.requiredBlankValues.map((entry) => entry.key));

    if (fileAudit.fileName === "bootstrap-parameters.json" && (placeholderKeys.has("TemplateBucketName") || placeholderKeys.has("ArtifactBucketName") || requiredBlankKeys.has("TemplateBucketName") || requiredBlankKeys.has("ArtifactBucketName"))) {
      suggestions.push({
        file: fileAudit.relativePath,
        recommendation: "Choose globally unique S3 bucket names for the template and artifact buckets.",
        example: `b1admin-${environment}-templates-<account-id> and b1admin-${environment}-artifacts-<account-id>`,
      });
    }

    if (fileAudit.fileName === "backend-parameters.json" && (placeholderKeys.has("LambdaCodeS3Bucket") || requiredBlankKeys.has("LambdaCodeS3Bucket"))) {
      suggestions.push({
        file: fileAudit.relativePath,
        recommendation: "Point LambdaCodeS3Bucket at the same artifact bucket chosen in bootstrap-parameters.json.",
        example: `b1admin-${environment}-artifacts-<account-id>`,
      });
    }

    if (fileAudit.fileName === "backend-parameters.json" && unsafeDefaultKeys.size > 0) {
      suggestions.push({
        file: fileAudit.relativePath,
        recommendation: "Replace the checked-in starter hostnames and support values with real environment URLs and contact details before the first deploy.",
        example: `B1AdminRootUrl=https://admin-${environment}.yourdomain.com, CorsOrigin=https://admin-${environment}.yourdomain.com, SupportEmail=support@yourdomain.com`,
      });
    }

    if (fileAudit.fileName === "app-config-secret.template.json" && (
      placeholderKeys.has("jwtSecret")
      || placeholderKeys.has("encryptionKey")
      || requiredBlankKeys.has("jwtSecret")
      || requiredBlankKeys.has("encryptionKey")
      || unsafeDefaultKeys.has("webPushSubject")
    )) {
      suggestions.push({
        file: fileAudit.relativePath,
        recommendation: "Copy the template to app-config-secret.json, replace jwtSecret and encryptionKey with long random values, and set webPushSubject to the real support mailbox before syncing the secret.",
        example: `cp infrastructure/environments/${environment}/app-config-secret.template.json infrastructure/environments/${environment}/app-config-secret.json`,
      });
    }
  });

  return suggestions;
}

function renderMarkdown(result) {
  const lines = [
    `# Environment Starter Audit: ${result.environment}`,
    "",
    `- Status: ${result.ok ? "ready" : "blocked"}`,
    `- Environment dir: \`${result.environmentDir}\``,
    `- Placeholders: ${result.summary.placeholderCount}`,
    `- Unsafe starter defaults: ${result.summary.unsafeDefaultCount}`,
    `- Required blanks: ${result.summary.requiredBlankCount}`,
    `- Optional blanks: ${result.summary.optionalBlankCount}`,
  ];

  if (result.onlyBlockers) {
    lines.push(`- Blocker-only view: yes (${result.blockerSummary.blockerCount} blockers)`);
  }

  if (result.nextSteps.length > 0) {
    lines.push("", "## Next Steps", "");
    result.nextSteps.forEach((step) => {
      lines.push(`- ${step.action} \`${step.file}\``);
      lines.push(`  Keys: ${step.keys.join(", ")}`);
    });
  }

  if (result.suggestions.length > 0) {
    lines.push("", "## Suggestions", "");
    result.suggestions.forEach((suggestion) => {
      lines.push(`- ${suggestion.recommendation} \`${suggestion.file}\``);
      lines.push(`  Example: \`${suggestion.example}\``);
    });
  }

  if (result.files.length > 0) {
    lines.push("", "## Findings", "");
    result.files.forEach((fileAudit) => {
      lines.push(`### ${fileAudit.relativePath}`, "");
      fileAudit.placeholders.forEach((entry) => lines.push(`- Placeholder: \`${entry.key}=${entry.value}\``));
      fileAudit.unsafeDefaults.forEach((entry) => lines.push(`- Unsafe starter default: \`${entry.key}=${entry.value}\``));
      fileAudit.requiredBlankValues.forEach((entry) => lines.push(`- Required blank: \`${entry.key}\``));
      fileAudit.optionalBlankValues.forEach((entry) => lines.push(`- Optional blank: \`${entry.key}\``));
      if (fileAudit.placeholders.length === 0 && fileAudit.unsafeDefaults.length === 0 && fileAudit.requiredBlankValues.length === 0 && fileAudit.optionalBlankValues.length === 0) {
        lines.push("- No unresolved values.");
      }
      lines.push("");
    });
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function main() {
  const environment = getArg("environment", "staging");
  const environmentDirArg = getArg("environment-dir");
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";
  const markdownOutput = outputMode === "markdown" || outputMode === "md";
  const onlyBlockers = getArg("only-blockers", "false").toLowerCase() === "true";
  const environmentDir = resolveEnvironmentDir(environment, environmentDirArg);

  if (!fs.existsSync(environmentDir)) {
    const message = `Unknown environment starter "${environment}". Expected a directory under infrastructure/environments/.`;
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify({ ok: false, environment, errors: [message] }, null, 2)}\n`);
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  const missingFiles = requiredFiles.filter((fileName) => !fs.existsSync(path.join(environmentDir, fileName)));
  if (missingFiles.length > 0) {
    const message = `Environment starter "${environment}" is missing required files: ${missingFiles.join(", ")}`;
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify({ ok: false, environment, missingFiles, errors: [message] }, null, 2)}\n`);
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  const secretOverridePath = path.join(environmentDir, "app-config-secret.json");
  const secretOverride = fs.existsSync(secretOverridePath) ? readJson(secretOverridePath) : null;
  const fileAudits = requiredFiles.map((fileName) => auditFile(
    fileName,
    path.join(environmentDir, fileName),
    fileName === "app-config-secret.template.json" ? { secretOverride } : {},
  ));
  const summary = {
    placeholderCount: fileAudits.reduce((total, fileAudit) => total + fileAudit.placeholders.length, 0),
    unsafeDefaultCount: fileAudits.reduce((total, fileAudit) => total + fileAudit.unsafeDefaults.length, 0),
    requiredBlankCount: fileAudits.reduce((total, fileAudit) => total + fileAudit.requiredBlankValues.length, 0),
    optionalBlankCount: fileAudits.reduce((total, fileAudit) => total + fileAudit.optionalBlankValues.length, 0),
  };
  const blockerSummary = {
    placeholderCount: summary.placeholderCount,
    unsafeDefaultCount: summary.unsafeDefaultCount,
    requiredBlankCount: summary.requiredBlankCount,
    blockerCount: summary.placeholderCount + summary.unsafeDefaultCount + summary.requiredBlankCount,
  };
  const ok = summary.placeholderCount === 0 && summary.unsafeDefaultCount === 0 && summary.requiredBlankCount === 0;
  const displayedFiles = onlyBlockers
    ? fileAudits
      .filter((fileAudit) => fileAudit.placeholders.length > 0 || fileAudit.unsafeDefaults.length > 0 || fileAudit.requiredBlankValues.length > 0)
      .map((fileAudit) => ({
        ...fileAudit,
        optionalBlankValues: [],
      }))
    : fileAudits;

  const result = {
    ok,
    environment,
    onlyBlockers,
    environmentDir: path.relative(rootDir, environmentDir),
    summary,
    blockerSummary,
    nextSteps: buildNextSteps(displayedFiles),
    suggestions: buildSuggestions(environment, displayedFiles),
    files: displayedFiles,
  };

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (markdownOutput) {
    process.stdout.write(renderMarkdown(result));
  } else {
    console.log(`Environment starter audit: ${environment}`);
    console.log(`Path: ${result.environmentDir}`);
    console.log(`Placeholders: ${summary.placeholderCount}`);
    console.log(`Unsafe starter defaults: ${summary.unsafeDefaultCount}`);
    console.log(`Required blanks: ${summary.requiredBlankCount}`);
    console.log(`Optional blanks: ${summary.optionalBlankCount}`);
    if (onlyBlockers) {
      console.log(`Showing blocker-only view (${blockerSummary.blockerCount} items).`);
    }

    if (result.nextSteps.length > 0) {
      console.log("\nNext steps:");
      result.nextSteps.forEach((step) => {
        console.log(`- ${step.action} ${step.file}`);
        console.log(`  Keys: ${step.keys.join(", ")}`);
      });
    }

    if (result.suggestions.length > 0) {
      console.log("\nSuggestions:");
      result.suggestions.forEach((suggestion) => {
        console.log(`- ${suggestion.recommendation} ${suggestion.file}`);
        console.log(`  Example: ${suggestion.example}`);
      });
    }

    displayedFiles.forEach((fileAudit) => {
      if (fileAudit.placeholders.length === 0 && fileAudit.unsafeDefaults.length === 0 && fileAudit.requiredBlankValues.length === 0 && fileAudit.optionalBlankValues.length === 0) {
        return;
      }

      console.log(`\n${fileAudit.relativePath}`);
      fileAudit.placeholders.forEach((entry) => console.log(`  placeholder: ${entry.key}=${entry.value}`));
      fileAudit.unsafeDefaults.forEach((entry) => console.log(`  unsafe starter default: ${entry.key}=${entry.value}`));
      fileAudit.requiredBlankValues.forEach((entry) => console.log(`  required blank: ${entry.key}`));
      fileAudit.optionalBlankValues.forEach((entry) => console.log(`  optional blank: ${entry.key}`));
    });
  }

  process.exit(ok ? 0 : 1);
}

main();
