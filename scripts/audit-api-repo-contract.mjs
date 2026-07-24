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

function exists(targetPath) {
  return fs.existsSync(targetPath);
}

function canRead(targetPath) {
  try {
    fs.accessSync(targetPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function tryReadText(targetPath) {
  try {
    return {
      ok: true,
      value: fs.readFileSync(targetPath, "utf8"),
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      value: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function tryReadJson(targetPath) {
  const text = tryReadText(targetPath);
  if (!text.ok) {
    return {
      ok: false,
      value: null,
      error: text.error,
    };
  }

  try {
    return {
      ok: true,
      value: JSON.parse(text.value),
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      value: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function extractModules(apiRepoPath) {
  const kyselyConfigPath = path.join(apiRepoPath, "tools", "kysely-config.ts");
  if (exists(kyselyConfigPath) && canRead(kyselyConfigPath)) {
    const source = fs.readFileSync(kyselyConfigPath, "utf8");
    const match = source.match(/const\s+MODULES\s*=\s*\[(.*?)\]\s+as const/s);
    if (match) {
      return Array.from(match[1].matchAll(/"([^"]+)"/g)).map((item) => item[1]);
    }
  }

  const migrationsRoot = path.join(apiRepoPath, "tools", "migrations");
  if (exists(migrationsRoot) && canRead(migrationsRoot)) {
    try {
      return fs.readdirSync(migrationsRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    } catch {
      return [];
    }
  }

  return [];
}

function renderMarkdown(result) {
  const lines = [
    `# Api Repo Contract Audit`,
    "",
    `- Status: ${result.ok ? "ready" : "blocked"}`,
    `- Api repo: \`${result.apiRepoPath}\``,
    `- Package mode recommendation: \`${result.recommended.packageMode}\``,
    `- Auto-package ready: ${result.packaging.autoPackageReady ? "yes" : "no"}`,
    `- Deployment contract ready: ${result.contract.ready ? "yes" : "no"}`,
    `- Migration support detected: ${result.migrations.detected ? "yes" : "no"}`,
  ];

  if (result.errors.length > 0) {
    lines.push("", "## Errors", "");
    result.errors.forEach((error) => lines.push(`- ${error}`));
  }

  if (result.warnings.length > 0) {
    lines.push("", "## Warnings", "");
    result.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  lines.push("", "## Findings", "");
  lines.push(`- Runtime hint: \`${result.contract.runtimeHint}\``);
  lines.push(`- HTTP handler hint: \`${result.contract.httpHandlerHint}\``);
  lines.push(`- Socket handler detected: ${result.contract.socketHandlerDetected ? "yes" : "no"}`);
  lines.push(`- Timer handlers detected: ${result.contract.timerHandlersDetected ? "yes" : "no"}`);
  lines.push(`- Membership connection string wiring detected: ${result.contract.membershipConnectionDetected ? "yes" : "no"}`);
  lines.push(`- Modules: ${result.migrations.modules.length > 0 ? `\`${result.migrations.modules.join("`, `")}\`` : "<none detected>"}`);
  lines.push(`- Build script \`build:prod\`: ${result.packaging.buildScriptPresent ? "yes" : "no"}`);
  lines.push(`- Build script \`build-layer\`: ${result.packaging.buildLayerScriptPresent ? "yes" : "no"}`);
  lines.push(`- node_modules present: ${result.packaging.nodeModulesPresent ? "yes" : "no"}`);
  lines.push(`- dist present: ${result.packaging.distPresent ? "yes" : "no"}`);
  lines.push(`- layer present: ${result.packaging.layerPresent ? "yes" : "no"}`);

  if (result.recommended.nextSteps.length > 0) {
    lines.push("", "## Next Steps", "");
    result.recommended.nextSteps.forEach((step) => lines.push(`- ${step}`));
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function main() {
  const apiRepoPath = path.resolve(rootDir, getArg("api-repo-path", "../Api"));
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";
  const markdownOutput = outputMode === "markdown" || outputMode === "md";
  const errors = [];
  const warnings = [];
  const info = [];

  const packageJsonPath = path.join(apiRepoPath, "package.json");
  const serverlessPath = path.join(apiRepoPath, "serverless.yml");
  const lambdaPath = path.join(apiRepoPath, "lambda.js");
  const configPath = path.join(apiRepoPath, "config");
  const distPath = path.join(apiRepoPath, "dist");
  const nodeModulesPath = path.join(apiRepoPath, "node_modules");
  const layerPath = path.join(apiRepoPath, "layer");

  if (!exists(apiRepoPath)) {
    errors.push(`API repo path not found: ${apiRepoPath}`);
  } else if (!canRead(apiRepoPath)) {
    errors.push(`API repo path is not readable: ${apiRepoPath}`);
  }

  const packageJson = tryReadJson(packageJsonPath);
  const serverless = tryReadText(serverlessPath);

  if (!packageJson.ok) {
    errors.push(`API package.json could not be read: ${packageJsonPath} (${packageJson.error})`);
  }

  if (!serverless.ok) {
    warnings.push(`API serverless.yml could not be read: ${serverlessPath} (${serverless.error})`);
  }

  const packageScripts = packageJson.value?.scripts || {};
  const modules = errors.length === 0 ? extractModules(apiRepoPath) : [];
  const serverlessText = serverless.value || "";

  const runtimeHint = /runtime:\s*nodejs22\.x/m.test(serverlessText) ? "nodejs22.x" : "";
  const httpHandlerHint = /handler:\s+lambda\.web/m.test(serverlessText) ? "lambda.web" : "";
  const socketHandlerDetected = /handler:\s+lambda\.socket/m.test(serverlessText);
  const timerHandlersDetected = /handler:\s+lambda\.timer(?:15Min|Midnight|ScheduledTasks|Webhooks)/m.test(serverlessText);
  const membershipConnectionDetected = /MEMBERSHIP_CONNECTION_STRING/m.test(serverlessText);

  const buildScriptPresent = typeof packageScripts["build:prod"] === "string";
  const buildLayerScriptPresent = typeof packageScripts["build-layer"] === "string";
  const nodeModulesPresent = exists(nodeModulesPath) && canRead(nodeModulesPath);
  const distPresent = exists(distPath) && canRead(distPath);
  const layerPresent = exists(layerPath) && canRead(layerPath);
  const lambdaPresent = exists(lambdaPath) && canRead(lambdaPath);
  const configPresent = exists(configPath) && canRead(configPath);

  if (!buildScriptPresent) {
    warnings.push("Expected build:prod script was not found in Api package.json.");
  }
  if (!lambdaPresent) {
    errors.push(`Required Lambda entrypoint is missing or unreadable: ${lambdaPath}`);
  }
  if (!configPresent) {
    errors.push(`Required config directory is missing or unreadable: ${configPath}`);
  }
  if (!serverless.ok) {
    warnings.push("Serverless-driven handler/runtime checks were skipped.");
  } else {
    if (!runtimeHint) warnings.push("serverless.yml did not show runtime nodejs22.x.");
    if (!httpHandlerHint) warnings.push("serverless.yml did not show handler lambda.web.");
    if (!socketHandlerDetected) warnings.push("serverless.yml did not show handler lambda.socket.");
    if (!timerHandlersDetected) warnings.push("serverless.yml did not show the expected timer handlers.");
    if (!membershipConnectionDetected) warnings.push("serverless.yml did not show MEMBERSHIP_CONNECTION_STRING wiring.");
  }
  if (modules.length === 0) {
    warnings.push("No migration modules were detected from tools/kysely-config.ts or tools/migrations/.");
  }
  if (!nodeModulesPresent) {
    warnings.push("node_modules is missing or unreadable. Auto-packaging will fail until dependencies are installed.");
  }
  if (!distPresent) {
    warnings.push("dist is missing or unreadable. Build output is not present yet.");
  }

  const layeredSupported = buildLayerScriptPresent || layerPresent;
  const selfContainedSupported = lambdaPresent && configPresent;
  const autoPackageReady = selfContainedSupported && buildScriptPresent && nodeModulesPresent;
  const contractReady = runtimeHint === "nodejs22.x"
    && httpHandlerHint === "lambda.web"
    && socketHandlerDetected
    && timerHandlersDetected
    && membershipConnectionDetected;

  const packageMode = layeredSupported ? "layered-or-self-contained" : "self-contained";
  const nextSteps = [];

  if (!nodeModulesPresent) {
    nextSteps.push(`Run \`corepack yarn install\` in ${apiRepoPath}.`);
  }
  if (!distPresent) {
    nextSteps.push(`Run \`corepack yarn build:prod\` in ${apiRepoPath}, or use \`yarn package:api-backend -- --api-repo-path=${apiRepoPath}\` once dependencies are installed.`);
  }
  if (layeredSupported && !layerPresent) {
    nextSteps.push("If you want layered packaging, run the Api repo layer build before using --package-mode=layered.");
  }
  if (!contractReady) {
    nextSteps.push("Review serverless/runtime assumptions before relying on the current CloudFormation backend contract.");
  }
  if (autoPackageReady) {
    nextSteps.push(`Run \`yarn package:api-backend -- --api-repo-path=${apiRepoPath}\` from B1Admin to produce a deploy manifest.`);
  }

  const result = {
    ok: errors.length === 0,
    apiRepoPath,
    errors,
    warnings,
    info,
    packaging: {
      autoPackageReady,
      buildScriptPresent,
      buildLayerScriptPresent,
      nodeModulesPresent,
      distPresent,
      layerPresent,
      lambdaPresent,
      configPresent,
      supportedModes: [
        ...(selfContainedSupported ? ["self-contained"] : []),
        ...(layeredSupported ? ["layered"] : []),
      ],
    },
    contract: {
      ready: contractReady,
      runtimeHint,
      httpHandlerHint,
      socketHandlerDetected,
      timerHandlersDetected,
      membershipConnectionDetected,
    },
    migrations: {
      detected: modules.length > 0,
      modules,
    },
    recommended: {
      packageMode,
      nextSteps,
    },
  };

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (markdownOutput) {
    process.stdout.write(renderMarkdown(result));
  } else {
    console.log(`Api repo contract audit: ${apiRepoPath}`);
    console.log(`Status: ${result.ok ? "ready" : "blocked"}`);
    console.log(`Package mode recommendation: ${packageMode}`);
    console.log(`Auto-package ready: ${autoPackageReady ? "yes" : "no"}`);
    console.log(`Deployment contract ready: ${contractReady ? "yes" : "no"}`);
    if (errors.length > 0) {
      console.log("Errors:");
      errors.forEach((error) => console.log(`- ${error}`));
    }
    if (warnings.length > 0) {
      console.log("Warnings:");
      warnings.forEach((warning) => console.log(`- ${warning}`));
    }
    if (nextSteps.length > 0) {
      console.log("Next steps:");
      nextSteps.forEach((step) => console.log(`- ${step}`));
    }
  }

  process.exit(result.ok ? 0 : 1);
}

main();
