import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
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

function parseBoolean(value, fallback) {
  if (value === "") return fallback;
  return value.toLowerCase() === "true";
}

function requireValue(name, value) {
  if (!value) {
    console.error(`Missing required value: ${name}`);
    process.exit(1);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function exitForCommandError(error) {
  if (error && typeof error === "object") {
    const status = typeof error.status === "number" ? error.status : 1;
    process.exit(status);
  }

  process.exit(1);
}

function runJson(command, args) {
  return JSON.parse(execFileSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  }));
}

function normalizeOutputs(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) return Object.fromEntries(raw.map((output) => [output.OutputKey, output.OutputValue]));
  if (raw.Stacks?.[0]?.Outputs) return normalizeOutputs(raw.Stacks[0].Outputs);
  if (raw.Outputs) return normalizeOutputs(raw.Outputs);
  return raw;
}

function getStackOutputs(stackName, region) {
  const response = runJson("aws", [
    "cloudformation",
    "describe-stacks",
    "--stack-name",
    stackName,
    "--region",
    region,
    "--output",
    "json",
  ]);

  return normalizeOutputs(response);
}

function getStackOutputsSafe(stackName, region) {
  try {
    return getStackOutputs(stackName, region);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not read stack "${stackName}": ${message}`);
  }
}

function readJsonFile(filePath) {
  const resolved = path.resolve(rootDir, filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`JSON file not found: ${resolved}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(resolved, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not load JSON file "${resolved}": ${message}`);
  }
}

function getSecretJson(secretId, region) {
  let result;
  try {
    result = runJson("aws", [
      "secretsmanager",
      "get-secret-value",
      "--secret-id",
      secretId,
      "--region",
      region,
      "--output",
      "json",
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not read Secrets Manager secret "${secretId}": ${message}`);
  }

  if (!result.SecretString) {
    fail(`Secret does not contain SecretString: ${secretId}`);
  }

  try {
    return JSON.parse(result.SecretString);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`SecretString for "${secretId}" is not valid JSON: ${message}`);
  }
}

function buildMysqlConnectionString({ username, password, host, port, database }) {
  return `mysql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

// Writes each parameter through a 0600 temp file (--cli-input-json) so the
// secret value never appears on the process argv or in the echoed command.
function putParameter(parameter, region, overwrite) {
  console.log(`\n> aws ssm put-parameter --name ${parameter.name} --type SecureString (value hidden)`);
  const tempFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "b1admin-ssm-")), "put-parameter.json");
  try {
    fs.writeFileSync(tempFile, JSON.stringify({
      Name: parameter.name,
      Value: parameter.value,
      Type: "SecureString",
      Overwrite: overwrite,
    }), { mode: 0o600 });
    execFileSync("aws", [
      "ssm",
      "put-parameter",
      "--cli-input-json",
      `file://${tempFile}`,
      "--region",
      region,
    ], {
      cwd: rootDir,
      stdio: "inherit",
    });
  } catch (error) {
    exitForCommandError(error);
  } finally {
    fs.rmSync(path.dirname(tempFile), { recursive: true, force: true });
  }
}

function compactParameters(entries, includeEmpty) {
  return entries.filter((entry) => includeEmpty || entry.value !== "");
}

function main() {
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const stackName = getArg("stack-name");
  const environment = getArg("environment");
  const prefix = getArg("prefix", `/${environment}`);
  const appConfigSecretFile = getArg("app-config-secret-file");
  const appConfigSecretArn = getArg("app-config-secret-arn");
  const includeEmpty = parseBoolean(getArg("include-empty", "false"), false);
  const overwrite = parseBoolean(getArg("overwrite", "true"), true);
  const outputMode = getArg("output", "text");
  // JSON output has historically been a side-effect-free preview; keep that
  // contract by defaulting json mode to dry-run. Pass --dry-run=false
  // explicitly to sync while emitting JSON.
  const dryRun = parseBoolean(getArg("dry-run", outputMode === "json" ? "true" : "false"), outputMode === "json");

  requireValue("stack-name", stackName);
  requireValue("environment", environment);

  const outputs = getStackOutputsSafe(stackName, region);
  const requiredOutputKeys = [
    "DatabaseEndpoint",
    "DatabasePort",
    "DatabaseSecretArn",
    "MembershipDatabaseName",
    "AttendanceDatabaseName",
    "ContentDatabaseName",
    "GivingDatabaseName",
    "MessagingDatabaseName",
    "DoingDatabaseName",
    "ReportingDatabaseName",
  ];

  for (const key of requiredOutputKeys) {
    requireValue(`stack output ${key}`, outputs[key] || "");
  }

  const dbSecret = getSecretJson(outputs.DatabaseSecretArn, region);
  requireValue("database secret username", dbSecret.username || "");
  requireValue("database secret password", dbSecret.password || "");

  let appConfig = {};
  if (appConfigSecretFile) appConfig = readJsonFile(appConfigSecretFile);
  else if (appConfigSecretArn) appConfig = getSecretJson(appConfigSecretArn, region);
  else if (outputs.AppConfigSecretArn) appConfig = getSecretJson(outputs.AppConfigSecretArn, region);

  const dbBase = {
    username: dbSecret.username,
    password: dbSecret.password,
    host: outputs.DatabaseEndpoint,
    port: outputs.DatabasePort,
  };

  const parameters = compactParameters([
    { name: `${prefix}/jwtSecret`, value: appConfig.jwtSecret || "" },
    { name: `${prefix}/encryptionKey`, value: appConfig.encryptionKey || "" },
    { name: `${prefix}/membershipApi/connectionString`, value: buildMysqlConnectionString({ ...dbBase, database: outputs.MembershipDatabaseName }) },
    { name: `${prefix}/attendanceApi/connectionString`, value: buildMysqlConnectionString({ ...dbBase, database: outputs.AttendanceDatabaseName }) },
    { name: `${prefix}/contentApi/connectionString`, value: buildMysqlConnectionString({ ...dbBase, database: outputs.ContentDatabaseName }) },
    { name: `${prefix}/givingApi/connectionString`, value: buildMysqlConnectionString({ ...dbBase, database: outputs.GivingDatabaseName }) },
    { name: `${prefix}/messagingApi/connectionString`, value: buildMysqlConnectionString({ ...dbBase, database: outputs.MessagingDatabaseName }) },
    { name: `${prefix}/doingApi/connectionString`, value: buildMysqlConnectionString({ ...dbBase, database: outputs.DoingDatabaseName }) },
    { name: `${prefix}/reportingApi/connectionString`, value: buildMysqlConnectionString({ ...dbBase, database: outputs.ReportingDatabaseName }) },
    { name: `${prefix}/hubspotKey`, value: appConfig.hubspotKey || "" },
    { name: `${prefix}/mauticUrl`, value: appConfig.mauticUrl || "" },
    { name: `${prefix}/mauticUser`, value: appConfig.mauticUser || "" },
    { name: `${prefix}/mauticPassword`, value: appConfig.mauticPassword || "" },
    { name: `${prefix}/caddyHost`, value: appConfig.caddyHost || "" },
    { name: `${prefix}/caddyPort`, value: appConfig.caddyPort || "" },
    { name: `${prefix}/youTubeApiKey`, value: appConfig.youTubeApiKey || "" },
    { name: `${prefix}/pexelsKey`, value: appConfig.pexelsKey || "" },
    { name: `${prefix}/vimeoToken`, value: appConfig.vimeoToken || "" },
    { name: `${prefix}/apiBibleKey`, value: appConfig.apiBibleKey || "" },
    { name: `${prefix}/youVersionApiKey`, value: appConfig.youVersionApiKey || "" },
    { name: `${prefix}/praiseChartsConsumerKey`, value: appConfig.praiseChartsConsumerKey || "" },
    { name: `${prefix}/praiseChartsConsumerSecret`, value: appConfig.praiseChartsConsumerSecret || "" },
    { name: `${prefix}/recaptcha-secret-key`, value: appConfig.googleRecaptchaSecretKey || "" },
    { name: `${prefix}/openRouterApiKey`, value: appConfig.openRouterApiKey || "" },
    { name: `${prefix}/openAiApiKey`, value: appConfig.openAiApiKey || "" },
    { name: `${prefix}/webPushPublicKey`, value: appConfig.webPushPublicKey || "" },
    { name: `${prefix}/webPushPrivateKey`, value: appConfig.webPushPrivateKey || "" },
    { name: `${prefix}/webPushSubject`, value: appConfig.webPushSubject || "" },
  ], includeEmpty);

  if (!dryRun) {
    for (const parameter of parameters) {
      putParameter(parameter, region, overwrite);
    }
  }

  // Parameter values are secrets; report names only.
  const result = {
    stackName,
    region,
    environment,
    prefix,
    overwrite,
    dryRun,
    parameterCount: parameters.length,
    parameters: parameters.map((parameter) => ({ name: parameter.name })),
  };

  if (outputMode === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (dryRun) {
    console.log("\nLegacy SSM parameter sync dry run.");
    console.log(`Stack: ${stackName}`);
    console.log(`Prefix: ${prefix}`);
    console.log(`Parameters: ${parameters.length}`);
    parameters.forEach((parameter) => console.log(`- ${parameter.name}`));
    return;
  }

  console.log("\nLegacy SSM parameter sync complete.");
  console.log(`Stack: ${stackName}`);
  console.log(`Prefix: ${prefix}`);
  console.log(`Parameters synced: ${parameters.length}`);
}

main();
