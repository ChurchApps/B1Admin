import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as ts from "typescript";
import { createMigrationDbContext, setDataApiDbFactory } from "./lib/api-migration-data-api-shim.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const dataApiShimUrl = pathToFileURL(path.join(scriptDir, "lib", "api-migration-data-api-shim.mjs")).href;

const moduleOutputKeys = {
  membership: "MembershipDatabaseName",
  attendance: "AttendanceDatabaseName",
  content: "ContentDatabaseName",
  giving: "GivingDatabaseName",
  messaging: "MessagingDatabaseName",
  doing: "DoingDatabaseName",
  reporting: "ReportingDatabaseName",
};

const preferredModuleOrder = Object.keys(moduleOutputKeys);

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

function parseBoolean(value, fallback = false) {
  if (value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function fail(message) {
  console.error(message);
  process.exit(1);
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
    const stderr = error && typeof error === "object" && "stderr" in error ? String(error.stderr || "") : "";
    const message = error instanceof Error ? error.message : String(error);
    fail(`${failureLabel}: ${stderr.trim() || message}`);
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

function escapeIdentifier(value) {
  return `\`${String(value).replace(/`/g, "``")}\``;
}

function escapeSqlString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function sqlString(value) {
  return `'${escapeSqlString(value)}'`;
}

function decodeField(field) {
  if (!field || typeof field !== "object") return null;
  if (field.isNull) return null;
  if ("stringValue" in field) return field.stringValue;
  if ("longValue" in field) return field.longValue;
  if ("doubleValue" in field) return field.doubleValue;
  if ("booleanValue" in field) return field.booleanValue;
  return null;
}

function decodeRows(result) {
  const columns = (result.columnMetadata || []).map((column) => column.name || "");
  const records = result.records || [];
  return records.map((record) => {
    const row = {};
    record.forEach((field, index) => {
      row[columns[index] || `column${index + 1}`] = decodeField(field);
    });
    return row;
  });
}

function buildExecuteArgs({ region, resourceArn, secretArn, database, sql, transactionId, includeResultMetadata = false }) {
  const args = [
    "rds-data",
    "execute-statement",
    "--region",
    region,
    "--resource-arn",
    resourceArn,
    "--secret-arn",
    secretArn,
    "--sql",
    sql,
    "--output",
    "json",
  ];

  if (database) {
    args.push("--database", database);
  }

  if (transactionId) {
    args.push("--transaction-id", transactionId);
  }

  if (includeResultMetadata) {
    args.push("--include-result-metadata");
  }

  return args;
}

function beginTransaction({ region, resourceArn, secretArn, database }) {
  const result = runAwsJson([
    "rds-data",
    "begin-transaction",
    "--region",
    region,
    "--resource-arn",
    resourceArn,
    "--secret-arn",
    secretArn,
    "--database",
    database,
    "--output",
    "json",
  ], `Could not start transaction for database "${database}"`);

  return result.transactionId;
}

function commitTransaction({ region, resourceArn, secretArn, transactionId }) {
  runAwsJson([
    "rds-data",
    "commit-transaction",
    "--region",
    region,
    "--resource-arn",
    resourceArn,
    "--secret-arn",
    secretArn,
    "--transaction-id",
    transactionId,
    "--output",
    "json",
  ], "Could not commit migration transaction");
}

function rollbackTransaction({ region, resourceArn, secretArn, transactionId }) {
  try {
    runAwsJson([
      "rds-data",
      "rollback-transaction",
      "--region",
      region,
      "--resource-arn",
      resourceArn,
      "--secret-arn",
      secretArn,
      "--transaction-id",
      transactionId,
      "--output",
      "json",
    ], "Could not roll back migration transaction");
  } catch (_error) {
    // Best-effort rollback only.
  }
}

function loadMigrationFiles(moduleDir) {
  return fs.readdirSync(moduleDir)
    .filter((fileName) => /\.(ts|js|mjs|cjs)$/.test(fileName))
    .sort()
    .map((fileName) => ({
      name: fileName.replace(/\.(ts|js|mjs|cjs)$/, ""),
      fileName,
      filePath: path.join(moduleDir, fileName),
    }));
}

function loadMigrationDirectories(apiRepoPath) {
  const migrationsRoot = path.join(apiRepoPath, "tools", "migrations");
  if (!fs.existsSync(migrationsRoot)) return [];

  const directories = fs.readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const rank = new Map(preferredModuleOrder.map((name, index) => [name, index]));
  return directories.sort((left, right) => {
    const leftRank = rank.has(left) ? rank.get(left) : Number.MAX_SAFE_INTEGER;
    const rightRank = rank.has(right) ? rank.get(right) : Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.localeCompare(right);
  });
}

function replaceKyselyImport(source) {
  return source
    .replace(/from\s+["']kysely["']/g, `from "${dataApiShimUrl}"`)
    .replace(/from\s+["'][^"']*kysely-config\.js["']/g, `from "${dataApiShimUrl}"`);
}

function getFallbackCompilerOptions() {
  return {
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    allowJs: true,
    jsx: ts.JsxEmit.Preserve,
  };
}

function normalizeTranspileCompilerOptions(options = {}) {
  return {
    ...getFallbackCompilerOptions(),
    ...options,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    sourceMap: false,
    inlineSourceMap: false,
    inlineSources: false,
    declaration: false,
    declarationMap: false,
    emitDeclarationOnly: false,
    noEmit: false,
    noEmitOnError: false,
    incremental: false,
    composite: false,
    tsBuildInfoFile: undefined,
    outDir: undefined,
    rootDir: undefined,
  };
}

function loadApiCompilerOptions(apiRepoPath) {
  const tsconfigPath = path.join(apiRepoPath, "tsconfig.json");
  if (!fs.existsSync(tsconfigPath)) {
    return normalizeTranspileCompilerOptions();
  }

  try {
    const tsconfig = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (tsconfig.error) {
      return normalizeTranspileCompilerOptions();
    }

    const parsed = ts.parseJsonConfigFileContent(
      tsconfig.config,
      ts.sys,
      apiRepoPath,
      undefined,
      tsconfigPath,
    );

    return normalizeTranspileCompilerOptions(parsed.options);
  } catch (_error) {
    return normalizeTranspileCompilerOptions();
  }
}

function transpileText(source, fileName, compilerOptions) {
  const primaryOptions = normalizeTranspileCompilerOptions(compilerOptions);
  const fallbackOptions = normalizeTranspileCompilerOptions();

  try {
    const transpiled = ts.transpileModule(source, {
      fileName,
      compilerOptions: primaryOptions,
      reportDiagnostics: false,
    });

    if (transpiled.outputText === undefined) {
      throw new Error("Output generation failed");
    }

    return transpiled.outputText;
  } catch (primaryError) {
    try {
      const transpiled = ts.transpileModule(source, {
        fileName,
        compilerOptions: fallbackOptions,
        reportDiagnostics: false,
      });

      if (transpiled.outputText === undefined) {
        throw new Error("Output generation failed");
      }

      return transpiled.outputText;
    } catch {
      throw primaryError;
    }
  }
}

function symlinkIntoCache(sourcePath, targetPath) {
  try {
    fs.symlinkSync(sourcePath, targetPath, fs.lstatSync(sourcePath).isDirectory() ? "dir" : "file");
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "EEXIST")) throw error;
  }
}

function transpileCachePath(filePath) {
  if (/\.(ts|tsx)$/.test(filePath)) return filePath.replace(/\.(ts|tsx)$/, ".js");
  if (/\.mts$/.test(filePath)) return filePath.replace(/\.mts$/, ".mjs");
  if (/\.cts$/.test(filePath)) return filePath.replace(/\.cts$/, ".cjs");
  return filePath;
}

function transpileSourceFile(sourcePath, targetPath, compilerOptions) {
  const source = fs.readFileSync(sourcePath, "utf8");

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, transpileText(source, sourcePath, compilerOptions), "utf8");
}

function mirrorApiTree(sourceDir, targetDir, compilerOptions, skip = () => false) {
  if (!fs.existsSync(sourceDir)) return;

  fs.mkdirSync(targetDir, { recursive: true });
  const queue = [{ sourceDir, targetDir }];

  while (queue.length > 0) {
    const current = queue.pop();
    for (const entry of fs.readdirSync(current.sourceDir, { withFileTypes: true })) {
      const sourcePath = path.join(current.sourceDir, entry.name);
      if (skip(sourcePath)) continue;

      const targetPath = path.join(current.targetDir, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(targetPath, { recursive: true });
        queue.push({ sourceDir: sourcePath, targetDir: targetPath });
        continue;
      }

      if (/\.(ts|tsx|mts|cts)$/.test(entry.name)) {
        transpileSourceFile(sourcePath, transpileCachePath(targetPath), compilerOptions);
        continue;
      }

      symlinkIntoCache(sourcePath, targetPath);
    }
  }
}

function createMigrationCacheContext(apiRepoPath) {
  const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), "b1admin-data-api-migrations-"));
  const cacheRepoRoot = path.join(cacheRoot, path.basename(apiRepoPath));
  const compilerOptions = loadApiCompilerOptions(apiRepoPath);
  fs.mkdirSync(cacheRepoRoot, { recursive: true });

  for (const entryName of ["node_modules", ".pnp.cjs", ".pnp.loader.mjs", ".yarn", "config", "dist", "reports", "package.json"]) {
    const sourcePath = path.join(apiRepoPath, entryName);
    if (!fs.existsSync(sourcePath)) continue;

    const targetPath = path.join(cacheRepoRoot, entryName);
    symlinkIntoCache(sourcePath, targetPath);
  }

  mirrorApiTree(
    path.join(apiRepoPath, "src"),
    path.join(cacheRepoRoot, "src"),
    compilerOptions,
  );

  mirrorApiTree(
    path.join(apiRepoPath, "tools"),
    path.join(cacheRepoRoot, "tools"),
    compilerOptions,
    (sourcePath) => sourcePath === path.join(apiRepoPath, "tools", "migrations"),
  );

  return { cacheRoot, cacheRepoRoot, compilerOptions };
}

function buildCachedMigrationPath({ apiRepoPath, filePath, cacheRepoRoot }) {
  const relativeFilePath = path.relative(apiRepoPath, filePath);
  if (!relativeFilePath || relativeFilePath.startsWith("..") || path.isAbsolute(relativeFilePath)) {
    fail(`Migration file is outside the API repo path: ${filePath}`);
  }

  return path.join(
    cacheRepoRoot,
    relativeFilePath.replace(/\.(ts|js|mjs|cjs)$/, ".mjs"),
  );
}

async function importMigrationModule(filePath, { apiRepoPath, cacheRepoRoot }) {
  const source = fs.readFileSync(filePath, "utf8");
  const tempFilePath = buildCachedMigrationPath({ apiRepoPath, filePath, cacheRepoRoot });
  fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
  fs.writeFileSync(tempFilePath, transpileText(replaceKyselyImport(source), filePath, loadApiCompilerOptions(apiRepoPath)), "utf8");
  return import(`${pathToFileURL(tempFilePath).href}?v=${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

function ensureValue(name, value) {
  if (!value) fail(`Missing required value: ${name}`);
  return value;
}

function getDatabaseName(outputs, moduleName) {
  return outputs[moduleOutputKeys[moduleName]] || "";
}

function formatExecutedAt(timestampValue) {
  if (timestampValue === null || timestampValue === undefined || timestampValue === "") return "";
  const numeric = Number(timestampValue);
  if (Number.isFinite(numeric) && numeric > 0) {
    return new Date(numeric).toISOString();
  }
  return String(timestampValue);
}

async function runDryMigration(moduleExport, action) {
  const statements = [];
  const db = createMigrationDbContext(async (sql) => {
    statements.push(sql);
    return { rows: [] };
  });

  if (action === "up") {
    if (typeof moduleExport.up !== "function") fail("Dry-run requested for a migration that does not export up().");
    await moduleExport.up(db);
  } else if (action === "down") {
    if (typeof moduleExport.down !== "function") fail("Dry-run requested for a migration that does not export down().");
    await moduleExport.down(db);
  } else {
    fail("Dry-run is only supported for action=up or action=down.");
  }

  return statements;
}

function executeSqlFactory(baseContext, dryRun) {
  return async (sql, transactionId = "") => {
    if (dryRun) return { rows: [] };

    const result = runAwsJson(
      buildExecuteArgs({
        ...baseContext,
        sql,
        transactionId,
        includeResultMetadata: true,
      }),
      `Could not execute SQL in database "${baseContext.database || "<none>"}"`,
    );

    return { rows: decodeRows(result) };
  };
}

async function ensureDatabaseExists(context, executeAdminSql) {
  await executeAdminSql(`CREATE DATABASE IF NOT EXISTS ${escapeIdentifier(context.database)}`);
}

async function ensureMigrationTables(context, executeSql) {
  await executeSql(`
    CREATE TABLE IF NOT EXISTS kysely_migration (
      name varchar(255) NOT NULL PRIMARY KEY,
      timestamp varchar(255) NOT NULL
    ) ENGINE=InnoDB
  `);

  await executeSql(`
    CREATE TABLE IF NOT EXISTS kysely_migration_lock (
      id varchar(255) NOT NULL PRIMARY KEY,
      is_locked integer NOT NULL DEFAULT 0
    ) ENGINE=InnoDB
  `);

  await executeSql(`
    INSERT INTO kysely_migration_lock (id, is_locked)
    VALUES ('migration_lock', 0)
    ON DUPLICATE KEY UPDATE id = id
  `);
}

async function readAppliedMigrations(executeSql) {
  const result = await executeSql("SELECT name, timestamp FROM kysely_migration ORDER BY timestamp ASC, name ASC");
  return new Map(result.rows.map((row) => [String(row.name), String(row.timestamp)]));
}

async function applyMigration({
  moduleName,
  migrationFile,
  migrationExport,
  databaseContext,
  executeSql,
  baseContext,
}) {
  const transactionId = beginTransaction(baseContext);

  try {
    await executeSql("SELECT id FROM kysely_migration_lock WHERE id = 'migration_lock' FOR UPDATE", transactionId);
    const existing = await executeSql(`SELECT name FROM kysely_migration WHERE name = ${sqlString(migrationFile.name)} LIMIT 1`, transactionId);
    if (existing.rows.length > 0) {
      commitTransaction({ ...baseContext, transactionId });
      return {
        name: migrationFile.name,
        status: "already-applied",
      };
    }

    if (typeof migrationExport.up !== "function") {
      throw new Error(`[${moduleName}] ${migrationFile.fileName} does not export up().`);
    }

    const db = createMigrationDbContext((sql) => executeSql(sql, transactionId));
    await migrationExport.up(db);
    await executeSql(
      `INSERT INTO kysely_migration (name, timestamp) VALUES (${sqlString(migrationFile.name)}, ${sqlString(String(Date.now()))})`,
      transactionId,
    );
    commitTransaction({ ...baseContext, transactionId });

    return {
      name: migrationFile.name,
      status: "applied",
    };
  } catch (error) {
    rollbackTransaction({ ...baseContext, transactionId });
    throw error;
  }
}

async function revertMigration({
  moduleName,
  migrationFile,
  migrationExport,
  executeSql,
  baseContext,
}) {
  const transactionId = beginTransaction(baseContext);

  try {
    await executeSql("SELECT id FROM kysely_migration_lock WHERE id = 'migration_lock' FOR UPDATE", transactionId);

    if (typeof migrationExport.down !== "function") {
      throw new Error(`[${moduleName}] ${migrationFile.fileName} does not export down().`);
    }

    const db = createMigrationDbContext((sql) => executeSql(sql, transactionId));
    await migrationExport.down(db);
    await executeSql(`DELETE FROM kysely_migration WHERE name = ${sqlString(migrationFile.name)}`, transactionId);
    commitTransaction({ ...baseContext, transactionId });

    return {
      name: migrationFile.name,
      status: "reverted",
    };
  } catch (error) {
    rollbackTransaction({ ...baseContext, transactionId });
    throw error;
  }
}

async function main() {
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const stackName = getArg("stack-name");
  const outputsFile = getArg("outputs-file");
  const apiRepoPathArg = getArg("api-repo-path", "../Api");
  const action = getArg("action", "up");
  const moduleArg = getArg("module");
  const dbClusterArnArg = getArg("db-cluster-arn");
  const dbSecretArnArg = getArg("db-secret-arn");
  const dbSecretFile = getArg("db-secret-file");
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";
  const dryRun = parseBoolean(getArg("dry-run", "false"), false);

  if (!["up", "down", "status"].includes(action)) {
    fail(`Invalid action "${action}". Use up, down, or status.`);
  }

  if (!moduleArg) {
    fail("--module is required (e.g. --module=membership or --module=all)");
  }

  if (dryRun && action === "status") {
    fail("--dry-run is not supported with --action=status.");
  }

  const apiRepoPath = path.resolve(rootDir, apiRepoPathArg);
  if (!fs.existsSync(apiRepoPath)) {
    fail(`API repo path not found: ${apiRepoPath}`);
  }

  const migrationsRoot = path.join(apiRepoPath, "tools", "migrations");
  if (!fs.existsSync(migrationsRoot)) {
    fail(`API repo is missing tools/migrations: ${migrationsRoot}`);
  }

  const allModules = loadMigrationDirectories(apiRepoPath);
  const targetModules = moduleArg === "all" ? allModules : [moduleArg];
  if (targetModules.length === 0) {
    fail(`No migration modules found in ${migrationsRoot}`);
  }

  targetModules.forEach((moduleName) => {
    if (!allModules.includes(moduleName)) {
      fail(`API repo has no tools/migrations/${moduleName} directory.`);
    }
  });

  const outputs = stackName
    ? getStackOutputs(stackName, region)
    : outputsFile
      ? normalizeOutputs(loadJsonFile(outputsFile, "stack outputs file"))
      : {};

  const resolvedDbClusterArn = dbClusterArnArg || outputs.DatabaseClusterArn || "";
  const resolvedDbSecretArn = dbSecretArnArg || outputs.DatabaseSecretArn || "";

  if (!dryRun) {
    ensureValue("stack-name, outputs-file, or db-cluster-arn", stackName || outputsFile || dbClusterArnArg);
    ensureValue("db-cluster-arn or DatabaseClusterArn output", resolvedDbClusterArn);
    ensureValue("db-secret-arn or DatabaseSecretArn output", resolvedDbSecretArn);
  } else if (!resolvedDbSecretArn && dbSecretFile) {
    // Dry runs do not call AWS, but the file path is still worth validating for operator clarity.
    if (!fs.existsSync(path.resolve(rootDir, dbSecretFile))) {
      fail(`API migration DB secret file not found: ${path.resolve(rootDir, dbSecretFile)}`);
    }
  }

  if (!dryRun && dbSecretFile && !resolvedDbSecretArn) {
    fail("Data API migrations need a Secrets Manager ARN. Provide --db-secret-arn or use stack outputs that include DatabaseSecretArn.");
  }

  const adminContext = {
    region,
    resourceArn: resolvedDbClusterArn,
    secretArn: resolvedDbSecretArn,
    database: "",
  };
  const executeAdminSql = executeSqlFactory(adminContext, dryRun);
  const cacheContext = createMigrationCacheContext(apiRepoPath);
  const moduleDbContextCache = new Map();
  const getModuleDbContext = (moduleName) => {
    if (!moduleDbContextCache.has(moduleName)) {
      const moduleBaseContext = {
        region,
        resourceArn: resolvedDbClusterArn,
        secretArn: resolvedDbSecretArn,
        database: getDatabaseName(outputs, moduleName) || moduleName,
      };
      moduleDbContextCache.set(
        moduleName,
        createMigrationDbContext(executeSqlFactory(moduleBaseContext, dryRun)),
      );
    }
    return moduleDbContextCache.get(moduleName);
  };
  setDataApiDbFactory((moduleName) => getModuleDbContext(moduleName));
  const result = {
    ok: true,
    action,
    module: moduleArg,
    dryRun,
    region,
    stackName: stackName || "",
    outputsFile: outputsFile ? path.resolve(rootDir, outputsFile) : "",
    apiRepoPath,
    runner: "data-api",
    modules: [],
  };

  try {
    for (const moduleName of targetModules) {
      const moduleDir = path.join(migrationsRoot, moduleName);
      const migrationFiles = loadMigrationFiles(moduleDir);
      const databaseName = getDatabaseName(outputs, moduleName) || moduleName;
      const moduleBaseContext = {
        region,
        resourceArn: resolvedDbClusterArn,
        secretArn: resolvedDbSecretArn,
        database: databaseName,
      };
      const executeSql = executeSqlFactory(moduleBaseContext, dryRun);
      const moduleResult = {
        moduleName,
        database: databaseName,
        migrations: [],
      };

      if (!dryRun) {
        await ensureDatabaseExists(moduleBaseContext, executeAdminSql);
        await ensureMigrationTables(moduleBaseContext, executeSql);
      }

      if (action === "status") {
        const applied = await readAppliedMigrations(executeSql);
        moduleResult.migrations = migrationFiles.map((migrationFile) => ({
          name: migrationFile.name,
          status: applied.has(migrationFile.name) ? "applied" : "pending",
          executedAt: applied.has(migrationFile.name) ? formatExecutedAt(applied.get(migrationFile.name)) : "",
        }));
        result.modules.push(moduleResult);
        continue;
      }

      if (action === "down") {
        if (dryRun) {
          const newestMigration = migrationFiles[migrationFiles.length - 1];
          if (newestMigration) {
            const migrationExport = await importMigrationModule(newestMigration.filePath, { apiRepoPath, cacheRepoRoot: cacheContext.cacheRepoRoot });
            const statements = await runDryMigration(migrationExport, "down");
            moduleResult.migrations.push({
              name: newestMigration.name,
              status: "dry-run",
              statements,
            });
          }
          result.modules.push(moduleResult);
          continue;
        }

        const applied = await readAppliedMigrations(executeSql);
        const lastApplied = [...migrationFiles].reverse().find((migrationFile) => applied.has(migrationFile.name));
        if (!lastApplied) {
          moduleResult.migrations.push({
            name: "",
            status: "no-op",
          });
          result.modules.push(moduleResult);
          continue;
        }

        const migrationExport = await importMigrationModule(lastApplied.filePath, { apiRepoPath, cacheRepoRoot: cacheContext.cacheRepoRoot });
        const reverted = await revertMigration({
          moduleName,
          migrationFile: lastApplied,
          migrationExport,
          executeSql,
          baseContext: moduleBaseContext,
        });
        moduleResult.migrations.push(reverted);
        result.modules.push(moduleResult);
        continue;
      }

      const applied = dryRun ? new Map() : await readAppliedMigrations(executeSql);
      for (const migrationFile of migrationFiles) {
        const migrationExport = await importMigrationModule(migrationFile.filePath, { apiRepoPath, cacheRepoRoot: cacheContext.cacheRepoRoot });

        if (dryRun) {
          const statements = await runDryMigration(migrationExport, "up");
          moduleResult.migrations.push({
            name: migrationFile.name,
            status: "dry-run",
            statements,
          });
          continue;
        }

        if (applied.has(migrationFile.name)) {
          moduleResult.migrations.push({
            name: migrationFile.name,
            status: "already-applied",
            executedAt: formatExecutedAt(applied.get(migrationFile.name)),
          });
          continue;
        }

        const appliedResult = await applyMigration({
          moduleName,
          migrationFile,
          migrationExport,
          databaseContext: moduleBaseContext,
          executeSql,
          baseContext: moduleBaseContext,
        });
        moduleResult.migrations.push(appliedResult);
      }

      result.modules.push(moduleResult);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.ok = false;
    result.error = message;
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exit(1);
    }
    fail(message);
  } finally {
    setDataApiDbFactory(null);
    fs.rmSync(cacheContext.cacheRoot, { recursive: true, force: true });
  }

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  for (const moduleResult of result.modules) {
    console.log(`\n[${moduleResult.moduleName}] Database: ${moduleResult.database}`);
    for (const migration of moduleResult.migrations) {
      console.log(`- ${migration.status}: ${migration.name || "(none)"}`);
    }
  }

  if (dryRun) {
    console.log("\nDry-run complete.");
  } else {
    console.log("\nData API migration run complete.");
  }
}

main();
