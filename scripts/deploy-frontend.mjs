import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = path.join(rootDir, "infrastructure", "cloudformation", "frontend-site.yaml");

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

function runNodeJson(scriptPath, args) {
  try {
    return JSON.parse(execFileSync("node", [scriptPath, ...args], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 20 * 1024 * 1024,
    }));
  } catch (error) {
    exitForCommandError(error, true);
  }
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

function loadParamsFromFile(filePath) {
  if (!filePath) return {};

  try {
    const resolved = path.resolve(rootDir, filePath);
    const data = JSON.parse(fs.readFileSync(resolved, "utf8"));

    if (Array.isArray(data)) {
      return Object.fromEntries(data.map((item) => [item.ParameterKey, item.ParameterValue]));
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not load parameters file "${filePath}": ${message}`);
  }
}

function buildParameterOverrides(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}=${value}`);
}

function describeStack(stackName, region) {
  return runJson("aws", [
    "cloudformation",
    "describe-stacks",
    "--stack-name",
    stackName,
    "--region",
    region,
    "--output",
    "json",
  ]);
}

function normalizeOutputs(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) return Object.fromEntries(raw.map((output) => [output.OutputKey, output.OutputValue]));
  if (raw.Stacks?.[0]?.Outputs) return normalizeOutputs(raw.Stacks[0].Outputs);
  if (raw.Outputs) return normalizeOutputs(raw.Outputs);
  return raw;
}

function getStackOutputs(stackName, region) {
  return normalizeOutputs(describeStack(stackName, region));
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

function readOutputsFile(filePath, label) {
  try {
    const resolved = path.resolve(rootDir, filePath);
    return normalizeOutputs(JSON.parse(fs.readFileSync(resolved, "utf8")));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not load ${label} "${filePath}": ${message}`);
  }
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

function ensureFrontendPublishPrerequisites({ skipBuild, jsonOutput }) {
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
  if (!jsonOutput) {
    // No-op branch to keep signature parallel with publish helper; normal logs continue later.
  }
}

function getBackendBuildEnv(region) {
  const backendStackName = getArg("backend-stack-name");
  const backendOutputsFile = getArg("backend-outputs-file");

  let outputs = {};
  if (backendStackName) outputs = getStackOutputsSafe(backendStackName, region, "backend stack");
  else if (backendOutputsFile) outputs = readOutputsFile(backendOutputsFile, "backend outputs file");

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
  if (!fs.existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`);
    process.exit(1);
  }

  const stackName = getArg("stack-name");
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const cloudformationExecutionRoleArn = getArg("cloudformation-execution-role-arn", process.env.CLOUDFORMATION_EXECUTION_ROLE_ARN || "");
  const paramsFile = getArg("parameters-file");
  const fileParams = loadParamsFromFile(paramsFile);
  const projectName = getArg("project-name", fileParams.ProjectName || "b1admin");
  const environmentName = getArg("environment", fileParams.EnvironmentName || process.env.REACT_APP_STAGE || "prod");
  const bucketName = getArg("bucket-name", fileParams.BucketName);
  const alternateDomainName = getArg("alternate-domain-name", fileParams.AlternateDomainName);
  const acmCertificateArn = getArg("acm-certificate-arn", fileParams.AcmCertificateArn);
  const hostedZoneId = getArg("hosted-zone-id", fileParams.HostedZoneId);
  const priceClass = getArg("price-class", fileParams.PriceClass || "PriceClass_100");
  const skipBuild = hasFlag("skip-build");
  const infrastructureOnly = hasFlag("infrastructure-only");
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";
  const backendBuildEnv = skipBuild ? {} : getBackendBuildEnv(region);

  requireValue("stack-name", stackName);
  if (skipBuild && infrastructureOnly) {
    console.error("--skip-build has no effect when --infrastructure-only is set. Remove it and use --skip-build later during the frontend publish phase.");
    process.exit(1);
  }
  if (!infrastructureOnly) {
    ensureFrontendPublishPrerequisites({ skipBuild, jsonOutput });
  }

  const parameterOverrides = buildParameterOverrides({
    ProjectName: projectName,
    EnvironmentName: environmentName,
    BucketName: bucketName,
    AlternateDomainName: alternateDomainName,
    AcmCertificateArn: acmCertificateArn,
    HostedZoneId: hostedZoneId,
    PriceClass: priceClass,
  });

  const deployArgs = [
    "cloudformation",
    "deploy",
    "--stack-name",
    stackName,
    "--template-file",
    templatePath,
    "--region",
    region,
    "--no-fail-on-empty-changeset",
    "--capabilities",
    "CAPABILITY_NAMED_IAM",
    "--parameter-overrides",
    ...parameterOverrides,
  ];
  if (cloudformationExecutionRoleArn) {
    deployArgs.push("--role-arn", cloudformationExecutionRoleArn);
  }
  run("aws", deployArgs, { quiet: jsonOutput });

  const outputs = getStackOutputs(stackName, region);
  const bucket = outputs.SiteBucketName;
  const distributionId = outputs.CloudFrontDistributionId;

  requireValue("SiteBucketName output", bucket);
  requireValue("CloudFrontDistributionId output", distributionId);

  const result = {
    stackName,
    region,
    environmentName,
    bucket,
    distributionId,
    appUrl: outputs.AppUrl || "",
    outputs,
    backendBuildEnv,
    skipBuild,
    infrastructureOnly,
    frontendPublished: false,
  };

  if (infrastructureOnly) {
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }

    console.log("\nFrontend infrastructure deployment complete.");
    console.log(`Bucket: ${bucket}`);
    console.log(`Distribution: ${distributionId}`);
    if (outputs.AppUrl) console.log(`URL: ${outputs.AppUrl}`);
    return;
  }

  const publishArgs = [
    `--region=${region}`,
    `--environment=${environmentName}`,
    `--bucket=${bucket}`,
    `--distribution-id=${distributionId}`,
  ];
  if (outputs.AppUrl) publishArgs.push(`--app-url=${outputs.AppUrl}`);
  const backendStackName = getArg("backend-stack-name");
  const backendOutputsFile = getArg("backend-outputs-file");
  if (backendStackName) publishArgs.push(`--backend-stack-name=${backendStackName}`);
  if (backendOutputsFile) publishArgs.push(`--backend-outputs-file=${backendOutputsFile}`);
  if (skipBuild) publishArgs.push("--skip-build");

  const publishResult = jsonOutput
    ? runNodeJson("scripts/publish-frontend-assets.mjs", [...publishArgs, "--output=json"])
    : run("node", ["scripts/publish-frontend-assets.mjs", ...publishArgs]);

  if (jsonOutput) {
    result.frontendPublished = publishResult.frontendPublished;
    result.backendBuildEnv = publishResult.backendBuildEnv || result.backendBuildEnv;
  } else {
    result.frontendPublished = true;
  }

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  console.log("\nDeployment complete.");
  console.log(`Bucket: ${bucket}`);
  console.log(`Distribution: ${distributionId}`);
  if (outputs.AppUrl) console.log(`URL: ${outputs.AppUrl}`);
}

main();
