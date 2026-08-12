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

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function exitForCommandError(error) {
  if (error && typeof error === "object") {
    const status = typeof error.status === "number" ? error.status : 1;
    process.exit(status);
  }

  process.exit(1);
}

function run(command, args, cwd, options = {}) {
  const { quiet = false } = options;
  if (!quiet) console.log(`\n> ${command} ${args.join(" ")}`);
  try {
    execFileSync(command, args, { cwd, stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit" });
  } catch (error) {
    exitForCommandError(error);
  }
}

function resolveYarnCommand() {
  try {
    execFileSync("corepack", ["--version"], { stdio: "ignore" });
    return { command: "corepack", argsPrefix: ["yarn"] };
  } catch (_error) {
    return { command: "yarn", argsPrefix: [] };
  }
}

function requirePathExists(label, targetPath) {
  if (!fs.existsSync(targetPath)) {
    console.error(`${label} not found: ${targetPath}`);
    process.exit(1);
  }
}

function requirePathReadable(label, targetPath) {
  try {
    fs.accessSync(targetPath, fs.constants.R_OK);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${label} is not readable: ${targetPath} (${message})`);
    process.exit(1);
  }
}

function hasPath(targetPath) {
  return fs.existsSync(targetPath);
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function removeIfExists(filePath) {
  if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
}

function parseBoolean(value, fallback) {
  if (value === "") return fallback;
  return value.toLowerCase() === "true";
}

function deriveArtifactKey(projectName, environment, fileName) {
  return `${projectName}/${environment}/backend/${fileName}`;
}

function relativeToManifest(manifestPath, targetPath) {
  return path.relative(path.dirname(manifestPath), targetPath) || ".";
}

function main() {
  const apiRepoPath = path.resolve(rootDir, getArg("api-repo-path", "../Api"));
  const outputDir = path.resolve(rootDir, getArg("output-dir", "infrastructure/artifacts/api"));
  const packageMode = getArg("package-mode", "self-contained");
  const environment = getArg("environment", "prod");
  const projectName = getArg("project-name", "b1admin");
  const build = parseBoolean(getArg("build", "true"), true);
  const buildLayer = parseBoolean(getArg("build-layer", packageMode === "layered" ? "true" : "false"), packageMode === "layered");
  const cleanOutput = parseBoolean(getArg("clean-output", "true"), true);
  const backendZipName = getArg("backend-zip-name", `api-${environment}-${packageMode}.zip`);
  const layerZipName = getArg("layer-zip-name", `api-${environment}-dependencies-layer.zip`);
  const manifestName = getArg("manifest-name", `api-${environment}-${packageMode}.manifest.json`);
  const migrationArtifactPathArg = getArg("migration-artifact-path");
  const buildCommand = getArg("build-command", "build:prod");
  const buildLayerCommand = getArg("build-layer-command", "build-layer");
  const outputMode = getArg("output", "text");
  const jsonOutput = outputMode === "json";
  const yarnCommand = resolveYarnCommand();
  const migrationArtifactPath = migrationArtifactPathArg ? path.resolve(rootDir, migrationArtifactPathArg) : "";

  if (!["self-contained", "layered"].includes(packageMode)) {
    console.error(`Unsupported package mode: ${packageMode}`);
    process.exit(1);
  }

  requirePathExists("API repo", apiRepoPath);
  requirePathReadable("API repo", apiRepoPath);
  requirePathExists("API package.json", path.join(apiRepoPath, "package.json"));
  requirePathReadable("API package.json", path.join(apiRepoPath, "package.json"));
  if (build && !hasPath(path.join(apiRepoPath, "node_modules"))) {
    console.error(`API repo dependencies are not installed: ${path.join(apiRepoPath, "node_modules")}`);
    console.error("Run 'corepack yarn install' in the Api repo before packaging.");
    process.exit(1);
  }
  if (build) {
    requirePathReadable("API node_modules", path.join(apiRepoPath, "node_modules"));
  }

  if (build) {
    run(yarnCommand.command, [...yarnCommand.argsPrefix, buildCommand], apiRepoPath, { quiet: jsonOutput });
  }

  if (packageMode === "layered" && buildLayer) {
    run(yarnCommand.command, [...yarnCommand.argsPrefix, buildLayerCommand], apiRepoPath, { quiet: jsonOutput });
  }

  const requiredEntries = [
    "config",
    "dist",
    "lambda.js",
    "package.json",
  ];

  if (packageMode === "self-contained") {
    requiredEntries.push("node_modules");
  } else if (buildLayer) {
    requiredEntries.push("layer");
  }

  requiredEntries.forEach((entry) => {
    const entryPath = path.join(apiRepoPath, entry);
    requirePathExists(`Required package entry "${entry}"`, entryPath);
    requirePathReadable(`Required package entry "${entry}"`, entryPath);
  });

  if (migrationArtifactPath) {
    requirePathExists("Migration artifact", migrationArtifactPath);
    requirePathReadable("Migration artifact", migrationArtifactPath);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const backendZipPath = path.join(outputDir, backendZipName);
  const layerZipPath = path.join(outputDir, layerZipName);
  const manifestPath = path.join(outputDir, manifestName);

  if (cleanOutput) {
    removeIfExists(backendZipPath);
    removeIfExists(layerZipPath);
    removeIfExists(manifestPath);
  }

  ensureParentDir(backendZipPath);
  ensureParentDir(manifestPath);

  const backendEntries = ["config", "dist", "lambda.js", "package.json"];
  if (packageMode === "self-contained") backendEntries.push("node_modules");

  run("zip", ["-rq", backendZipPath, ...backendEntries], apiRepoPath, { quiet: jsonOutput });

  let createdLayerZip = "";
  if (packageMode === "layered") {
    requirePathExists("Layer directory", path.join(apiRepoPath, "layer"));
    ensureParentDir(layerZipPath);
    run("zip", ["-rq", layerZipPath, "layer"], apiRepoPath, { quiet: jsonOutput });
    createdLayerZip = layerZipPath;
  }

  const relativeBackendZipPath = path.relative(rootDir, backendZipPath);
  const relativeMigrationArtifactPath = migrationArtifactPath ? path.relative(rootDir, migrationArtifactPath) : "";
  const relativeLayerZipPath = createdLayerZip ? path.relative(rootDir, createdLayerZip) : "";
  const relativeManifestPath = path.relative(rootDir, manifestPath);
  const recommendedBackendArtifactKey = deriveArtifactKey(projectName, environment, "api.zip");
  const recommendedMigrationArtifactKey = deriveArtifactKey(projectName, environment, "migrations.zip");

  const result = {
    apiRepoPath,
    projectName,
    packageMode,
    environment,
    build,
    buildCommand,
    buildLayer,
    buildLayerCommand: packageMode === "layered" ? buildLayerCommand : "",
    backendArtifactPath: relativeToManifest(manifestPath, backendZipPath),
    migrationArtifactPath: migrationArtifactPath ? relativeToManifest(manifestPath, migrationArtifactPath) : "",
    dependenciesLayerArtifactPath: createdLayerZip ? relativeToManifest(manifestPath, createdLayerZip) : "",
    manifestPath: relativeManifestPath,
    recommendedBackendArtifactKey,
    recommendedMigrationArtifactKey,
    recommendedNextSteps: {
      uploadBackendArtifact: `yarn upload:backend-artifact -- --source-file=${relativeBackendZipPath} --artifact-key=${recommendedBackendArtifactKey}`,
      uploadMigrationArtifact: migrationArtifactPath
        ? `yarn upload:backend-artifact -- --source-file=${relativeMigrationArtifactPath} --artifact-key=${recommendedMigrationArtifactKey} --artifact-label="Migration artifact"`
        : "",
      publishDependenciesLayer: createdLayerZip
        ? `yarn publish:lambda-layer -- --source-file=${relativeLayerZipPath} --layer-name=${projectName}-${environment}-dependencies`
        : "",
      deployBackend: `yarn deploy:backend -- --package-manifest-file=${relativeManifestPath}`,
      deployAws: `yarn deploy:aws -- --package-manifest-file=${relativeManifestPath}`,
      deployMode:
        packageMode === "self-contained"
          ? "Use the resulting backend zip directly with deploy:backend or deploy:aws."
          : "Upload the backend zip and dependencies layer zip separately. Then publish the layer and pass its ARN through DependenciesLayerArn.",
    },
    includedBackendEntries: backendEntries,
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(result, null, 2)}\n`);

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  console.log("\nBackend packaging complete.");
  console.log(`API repo: ${apiRepoPath}`);
  console.log(`Mode: ${packageMode}`);
  console.log(`Backend artifact: ${backendZipPath}`);
  if (createdLayerZip) console.log(`Dependencies layer artifact: ${createdLayerZip}`);
  console.log(`Manifest: ${manifestPath}`);
}

main();
