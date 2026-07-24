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

function exitForCommandError(error, quiet = false) {
  if (error && typeof error === "object") {
    if (quiet && error.stdout) process.stderr.write(String(error.stdout));
    if (quiet && error.stderr) process.stderr.write(String(error.stderr));
    const status = typeof error.status === "number" ? error.status : 1;
    process.exit(status);
  }

  process.exit(1);
}

function run(command, args, options = {}) {
  const { quiet = false, ...execOptions } = options;
  if (!quiet) console.log(`\n> ${command} ${args.join(" ")}`);

  try {
    return execFileSync(command, args, {
      cwd: rootDir,
      stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit",
      encoding: quiet ? "utf8" : undefined,
      maxBuffer: quiet ? 20 * 1024 * 1024 : undefined,
      ...execOptions,
    });
  } catch (error) {
    exitForCommandError(error, quiet);
  }
}

function runJson(command, args) {
  return JSON.parse(execFileSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  }));
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

function getStackOutputsSafe(stackName, region, label) {
  if (!stackName) return {};

  try {
    return getStackOutputs(stackName, region);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not read ${label} "${stackName}": ${message}`);
  }
}

function readJsonFile(filePath, label) {
  try {
    const resolved = path.resolve(rootDir, filePath);
    return normalizeOutputs(JSON.parse(fs.readFileSync(resolved, "utf8")));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not load ${label} "${filePath}": ${message}`);
  }
}

function getFrontendOutputs(region) {
  const stackName = getArg("stack-name");
  const outputsFile = getArg("frontend-outputs-file");

  if (stackName) return getStackOutputsSafe(stackName, region, "frontend stack");
  if (outputsFile) return readJsonFile(outputsFile, "frontend outputs file");

  return {};
}

function getFrontendOutputValue(outputs, keys) {
  for (const key of keys) {
    if (outputs[key]) return outputs[key];
  }
  return "";
}

function getOutputValue(outputs, keys) {
  for (const key of keys) {
    if (outputs[key]) return outputs[key];
  }
  return "";
}

function compactObject(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== ""));
}

function ensureFrontendPublishPrerequisites(skipBuild) {
  const distDir = path.join(rootDir, "dist");
  const serviceWorkerPath = path.join(distDir, "sw.js");

  if (skipBuild) {
    if (!fs.existsSync(distDir)) {
      fail(`Build output not found: ${distDir}`);
    }
    if (!fs.existsSync(serviceWorkerPath)) {
      fail(`Expected service worker not found: ${serviceWorkerPath}`);
    }
    return;
  }

  const nodeModulesPath = path.join(rootDir, "node_modules");
  const viteCliPath = path.join(nodeModulesPath, "vite", "dist", "node", "cli.js");
  if (!fs.existsSync(nodeModulesPath) || !fs.existsSync(viteCliPath)) {
    fail(`Frontend dependencies are not installed: ${nodeModulesPath}`);
  }
}

function getBackendBuildEnv(region) {
  const backendStackName = getArg("backend-stack-name");
  const backendOutputsFile = getArg("backend-outputs-file");

  let outputs = {};
  if (backendStackName) outputs = getStackOutputsSafe(backendStackName, region, "backend stack");
  else if (backendOutputsFile) outputs = readJsonFile(backendOutputsFile, "backend outputs file");

  return compactObject({
    REACT_APP_API_BASE: getOutputValue(outputs, ["ReactAppApiBase", "ApiBaseUrl", "ApiBase", "PublicApiBaseUrl"]),
    REACT_APP_CONTENT_ROOT: getOutputValue(outputs, ["ReactAppContentRoot", "ContentRootUrl", "ContentRoot", "PublicContentRootUrl"]),
    REACT_APP_B1_WEBSITE_URL: getOutputValue(outputs, ["ReactAppB1WebsiteUrl", "WebsiteBaseUrl", "WebsiteUrlPattern", "PublicWebsiteUrlPattern"]),
    REACT_APP_LESSONS_API: getOutputValue(outputs, ["ReactAppLessonsApi", "LessonsApiUrl", "LessonsApi"]),
    REACT_APP_GOOGLE_ANALYTICS: getOutputValue(outputs, ["ReactAppGoogleAnalytics", "GoogleAnalyticsTag"]),
    REACT_APP_SENTRY_DSN: getOutputValue(outputs, ["ReactAppSentryDsn", "SentryDsn"]),
    REACT_APP_TRANSFER_URL: getOutputValue(outputs, ["ReactAppTransferUrl", "TransferUrl"]),
    REACT_APP_SUPPORT_EMAIL: getOutputValue(outputs, ["ReactAppSupportEmail", "SupportEmail"]),
    REACT_APP_SUPPORT_PHONE: getOutputValue(outputs, ["ReactAppSupportPhone", "SupportPhone"]),
    REACT_APP_SUPPORT_SITE_URL: getOutputValue(outputs, ["ReactAppSupportSiteUrl", "SupportSiteUrl"]),
    REACT_APP_MOBILE_APP_URL: getOutputValue(outputs, ["ReactAppMobileAppUrl", "MobileAppUrl"]),
    REACT_APP_DOMAIN_CNAME_TARGET: getOutputValue(outputs, ["ReactAppDomainCnameTarget", "DomainCnameTarget"]),
    REACT_APP_DOMAIN_A_TARGET: getOutputValue(outputs, ["ReactAppDomainATarget", "DomainATarget"]),
    REACT_APP_DEFAULT_STOCK_PHOTO: getOutputValue(outputs, ["ReactAppDefaultStockPhoto", "DefaultStockPhoto"]),
  });
}

function main() {
  const stackName = getArg("stack-name");
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const environmentName = getArg("environment", process.env.REACT_APP_STAGE || "prod");
  const skipBuild = hasFlag("skip-build");
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";
  const backendBuildEnv = skipBuild ? {} : getBackendBuildEnv(region);
  const frontendOutputs = getFrontendOutputs(region);
  const bucket = getArg("bucket", getFrontendOutputValue(frontendOutputs, ["SiteBucketName", "FrontendBucketName"]));
  const distributionId = getArg("distribution-id", getFrontendOutputValue(frontendOutputs, ["CloudFrontDistributionId", "FrontendDistributionId"]));
  const appUrl = getArg("app-url", getFrontendOutputValue(frontendOutputs, ["AppUrl", "FrontendAppUrl"]));

  if (!stackName && !getArg("frontend-outputs-file") && (!bucket || !distributionId)) {
    console.error("Provide --stack-name, --frontend-outputs-file, or both --bucket and --distribution-id.");
    process.exit(1);
  }

  ensureFrontendPublishPrerequisites(skipBuild);

  requireValue("SiteBucketName output", bucket);
  requireValue("CloudFrontDistributionId output", distributionId);

  if (!skipBuild) {
    if (!jsonOutput && Object.keys(backendBuildEnv).length > 0) {
      console.log("\nUsing backend-provided frontend env:");
      Object.entries(backendBuildEnv).forEach(([key, value]) => console.log(`- ${key}=${value}`));
    }

    run("npm", ["run", "build"], {
      env: {
        ...process.env,
        ...backendBuildEnv,
        REACT_APP_STAGE: environmentName,
      },
      shell: true,
      quiet: jsonOutput,
    });
  }

  const distDir = path.join(rootDir, "dist");
  const serviceWorkerPath = path.join(distDir, "sw.js");
  if (!fs.existsSync(distDir)) {
    console.error(`Build output not found: ${distDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(serviceWorkerPath)) {
    console.error(`Expected service worker not found: ${serviceWorkerPath}`);
    process.exit(1);
  }

  run("aws", [
    "s3",
    "sync",
    "dist/",
    `s3://${bucket}`,
    "--delete",
    "--exclude",
    "sw.js",
    "--region",
    region,
  ], { quiet: jsonOutput });

  run("aws", [
    "s3",
    "cp",
    "dist/sw.js",
    `s3://${bucket}/sw.js`,
    "--cache-control",
    "no-cache",
    "--region",
    region,
  ], { quiet: jsonOutput });

  run("aws", [
    "cloudfront",
    "create-invalidation",
    "--distribution-id",
    distributionId,
    "--paths",
    "/*",
  ], { quiet: jsonOutput });

  const result = {
    stackName,
    region,
    environmentName,
    bucket,
    distributionId,
    appUrl,
    outputs: frontendOutputs,
    backendBuildEnv,
    skipBuild,
    frontendPublished: true,
  };

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  console.log("\nFrontend asset publish complete.");
  console.log(`Bucket: ${bucket}`);
  console.log(`Distribution: ${distributionId}`);
  if (appUrl) console.log(`URL: ${appUrl}`);
}

main();
