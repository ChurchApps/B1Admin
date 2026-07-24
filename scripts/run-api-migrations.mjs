import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modules = ["membership", "attendance", "content", "giving", "messaging", "doing", "reporting"];

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

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseBoolean(value, fallback) {
  if (value === "") return fallback;
  return value.toLowerCase() === "true";
}

function normalizeOutputs(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) return Object.fromEntries(raw.map((output) => [output.OutputKey, output.OutputValue]));
  if (raw.Stacks?.[0]?.Outputs) return normalizeOutputs(raw.Stacks[0].Outputs);
  if (raw.Outputs) return normalizeOutputs(raw.Outputs);
  return raw;
}

function loadJsonFile(filePath, label) {
  try {
    const resolved = path.resolve(rootDir, filePath);
    return JSON.parse(fs.readFileSync(resolved, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not load ${label} "${filePath}": ${message}`);
  }
}

function runAwsJson(args, failureLabel) {
  try {
    return JSON.parse(execFileSync("aws", args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 20 * 1024 * 1024,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`${failureLabel}: ${message}`);
  }
}

function getStackOutputs(stackName, region) {
  const response = runAwsJson([
    "cloudformation",
    "describe-stacks",
    "--stack-name",
    stackName,
    "--region",
    region,
    "--output",
    "json",
  ], `Could not read stack "${stackName}"`);

  return normalizeOutputs(response);
}

function getSecretJson(secretId, region) {
  const result = runAwsJson([
    "secretsmanager",
    "get-secret-value",
    "--secret-id",
    secretId,
    "--region",
    region,
    "--output",
    "json",
  ], `Could not read Secrets Manager secret "${secretId}"`);

  if (!result.SecretString) fail(`Secret does not contain SecretString: ${secretId}`);

  try {
    return JSON.parse(result.SecretString);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`SecretString for "${secretId}" is not valid JSON: ${message}`);
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

function runChild(command, args, cwd, env, captureOutput) {
  try {
    if (captureOutput) {
      return {
        stdout: execFileSync(command, args, {
          cwd,
          env,
          encoding: "utf8",
          stdio: "pipe",
          maxBuffer: 20 * 1024 * 1024,
        }),
        stderr: "",
      };
    }

    execFileSync(command, args, {
      cwd,
      stdio: "inherit",
      env,
    });
    return { stdout: "", stderr: "" };
  } catch (error) {
    if (captureOutput && error && typeof error === "object") {
      if (error.stdout) process.stderr.write(String(error.stdout));
      if (error.stderr) process.stderr.write(String(error.stderr));
      const status = typeof error.status === "number" ? error.status : 1;
      process.exit(status);
    }

    if (error && typeof error === "object") {
      const status = typeof error.status === "number" ? error.status : 1;
      process.exit(status);
    }

    process.exit(1);
  }
}

function ensurePathExists(label, targetPath) {
  if (!fs.existsSync(targetPath)) {
    fail(`${label} not found: ${targetPath}`);
  }
}

function loadApiRepoMigrationModules(apiRepoPath) {
  const kyselyConfigPath = path.join(apiRepoPath, "tools", "kysely-config.ts");
  if (!fs.existsSync(kyselyConfigPath)) return modules;

  try {
    const source = fs.readFileSync(kyselyConfigPath, "utf8");
    const match = source.match(/const\s+MODULES\s*=\s*\[(.*?)\]\s+as const/s);
    if (!match) return modules;

    const values = Array.from(match[1].matchAll(/"([^"]+)"/g)).map((item) => item[1]);
    return values.length > 0 ? values : modules;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not read API migration module config from "${kyselyConfigPath}": ${message}`);
  }
}

function loadApiRepoMigrationDirectories(apiRepoPath) {
  const migrationsRoot = path.join(apiRepoPath, "tools", "migrations");
  if (!fs.existsSync(migrationsRoot)) return [];

  try {
    return fs.readdirSync(migrationsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not read API migration directories from "${migrationsRoot}": ${message}`);
  }
}

function buildMysqlConnectionString({ username, password, host, port, database }) {
  const encodedUsername = encodeURIComponent(String(username));
  const encodedPassword = encodeURIComponent(String(password));
  const encodedDatabase = encodeURIComponent(String(database));
  return `mysql://${encodedUsername}:${encodedPassword}@${host}:${port}/${encodedDatabase}`;
}

function getDatabaseNameForModule(outputs, moduleName) {
  const outputKeys = {
    membership: "MembershipDatabaseName",
    attendance: "AttendanceDatabaseName",
    content: "ContentDatabaseName",
    giving: "GivingDatabaseName",
    messaging: "MessagingDatabaseName",
    doing: "DoingDatabaseName",
    reporting: "ReportingDatabaseName",
  };

  return outputs[outputKeys[moduleName]];
}

function getTargetModules(moduleName) {
  return moduleName === "all" ? modules : [moduleName];
}

function requireOutput(outputs, key) {
  if (!outputs[key]) fail(`Missing required stack output: ${key}`);
  return outputs[key];
}

function main() {
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const stackName = getArg("stack-name");
  const outputsFile = getArg("outputs-file");
  const dbSecretArn = getArg("db-secret-arn");
  const dbSecretFile = getArg("db-secret-file");
  const apiRepoPath = path.resolve(rootDir, getArg("api-repo-path", "../Api"));
  const action = getArg("action", "up");
  const moduleName = getArg("module", "all");
  const dryRun = parseBoolean(getArg("dry-run", "false"), false);
  const outputMode = getArg("output", "text").toLowerCase();

  if (!["up", "down", "status"].includes(action)) {
    fail(`Invalid action "${action}". Use up, down, or status.`);
  }

  if (moduleName !== "all" && !modules.includes(moduleName)) {
    fail(`Invalid module "${moduleName}". Use one of ${modules.join(", ")} or all.`);
  }

  if (!stackName && !outputsFile) {
    fail("Provide --stack-name or --outputs-file.");
  }

  ensurePathExists("API repo", apiRepoPath);
  ensurePathExists("API package.json", path.join(apiRepoPath, "package.json"));
  ensurePathExists("API migrate tool", path.join(apiRepoPath, "tools", "migrate.ts"));
  const apiRepoMigrationModules = loadApiRepoMigrationModules(apiRepoPath);
  const apiRepoMigrationDirectories = loadApiRepoMigrationDirectories(apiRepoPath);

  const outputs = stackName
    ? getStackOutputs(stackName, region)
    : normalizeOutputs(loadJsonFile(outputsFile, "stack outputs file"));

  const databaseEndpoint = requireOutput(outputs, "DatabaseEndpoint");
  const databasePort = requireOutput(outputs, "DatabasePort");
  const resolvedDbSecretArn = dbSecretArn || outputs.DatabaseSecretArn || "";
  if (!dbSecretFile && !resolvedDbSecretArn) {
    fail("Provide --db-secret-file, --db-secret-arn, or stack outputs with DatabaseSecretArn.");
  }

  const dbSecret = dbSecretFile
    ? loadJsonFile(dbSecretFile, "database secret file")
    : getSecretJson(resolvedDbSecretArn, region);

  if (!dbSecret.username) fail("Database secret is missing username.");
  if (!dbSecret.password) fail("Database secret is missing password.");

  const targetModules = moduleName === "all" ? apiRepoMigrationModules : getTargetModules(moduleName);
  const connectionStrings = {};
  targetModules.forEach((name) => {
    const databaseName = getDatabaseNameForModule(outputs, name);
    if (!databaseName) fail(`Could not resolve ${name} database name from stack outputs.`);

    connectionStrings[`${name.toUpperCase()}_CONNECTION_STRING`] = buildMysqlConnectionString({
      username: dbSecret.username,
      password: dbSecret.password,
      host: databaseEndpoint,
      port: databasePort,
      database: databaseName,
    });
  });

  if (connectionStrings.MEMBERSHIP_CONNECTION_STRING) {
    connectionStrings.DOING_MEMBERSHIP_CONNECTION_STRING = connectionStrings.MEMBERSHIP_CONNECTION_STRING;
  }

  const yarnCommand = resolveYarnCommand();
  const command = yarnCommand.command;
  const args = [...yarnCommand.argsPrefix, "migrate", `--action=${action}`, `--module=${moduleName}`];

  const redactedConnectionStrings = Object.fromEntries(Object.entries(connectionStrings).map(([key, value]) => {
    const redacted = String(value).replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
    return [key, redacted];
  }));

  const result = {
    apiRepoPath,
    region,
    stackName,
    outputsFile,
    action,
    module: moduleName,
    dryRun,
    command: `${command} ${args.join(" ")}`,
    databaseEndpoint,
    databasePort,
    resolvedDbSecretSource: dbSecretFile ? path.resolve(rootDir, dbSecretFile) : resolvedDbSecretArn,
    apiRepoMigrationModules,
    apiRepoMigrationDirectories,
    effectiveModules: targetModules,
    skippedConfiguredModules: moduleName === "all"
      ? modules.filter((name) => !apiRepoMigrationModules.includes(name))
      : [],
    warnings: [],
    connectionStrings: redactedConnectionStrings,
    executed: false,
  };

  if (moduleName !== "all" && !apiRepoMigrationModules.includes(moduleName)) {
    result.warnings.push(`The current Api repo's --module=all migration set does not include ${moduleName}.`);
  }

  const modulesWithoutMigrationDirectories = targetModules.filter((name) => !apiRepoMigrationDirectories.includes(name));
  if (modulesWithoutMigrationDirectories.length > 0) {
    result.warnings.push(`No migration directory exists in the Api repo for: ${modulesWithoutMigrationDirectories.join(", ")}.`);
  }

  if (!dryRun && moduleName !== "all" && modulesWithoutMigrationDirectories.length > 0) {
    fail(`The current Api repo has no tools/migrations/${moduleName} directory. Refusing to run a direct ${moduleName} migration outside dry-run mode.`);
  }

  if (outputMode === "json") {
    if (dryRun) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }
  } else {
    console.log("\nAPI migration helper ready.");
    console.log(`API repo: ${apiRepoPath}`);
    console.log(`Action: ${action}`);
    console.log(`Module: ${moduleName}`);
    if (moduleName === "all") {
      console.log(`Effective modules: ${targetModules.join(", ")}`);
      if (result.skippedConfiguredModules.length > 0) {
        console.warn(`Warning: --module=all in the current Api repo does not include: ${result.skippedConfiguredModules.join(", ")}`);
      }
    }
    result.warnings.forEach((warning) => console.warn(`Warning: ${warning}`));
    console.log(`Database host: ${databaseEndpoint}:${databasePort}`);
    if (dryRun) {
      console.log("Dry run only. No migrations executed.");
      Object.keys(redactedConnectionStrings).forEach((key) => console.log(`- ${key}=${redactedConnectionStrings[key]}`));
      return;
    }
  }

  if (!fs.existsSync(path.join(apiRepoPath, "node_modules"))) {
    fail(`API repo dependencies are not installed: ${path.join(apiRepoPath, "node_modules")}`);
  }

  const childResult = runChild(
    command,
    args,
    apiRepoPath,
    {
      ...process.env,
      ...connectionStrings,
    },
    outputMode === "json",
  );

  result.executed = true;
  if (outputMode === "json") {
    result.stdout = childResult.stdout;
    result.stderr = childResult.stderr;
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
}

main();
