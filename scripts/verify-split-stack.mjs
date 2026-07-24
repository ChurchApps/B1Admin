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

function normalizeOutputs(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) return Object.fromEntries(raw.map((output) => [output.OutputKey, output.OutputValue]));
  if (raw.Stacks?.[0]?.Outputs) return normalizeOutputs(raw.Stacks[0].Outputs);
  if (raw.Outputs) return normalizeOutputs(raw.Outputs);
  return raw;
}

function readOutputsFile(filePath, label) {
  const resolved = path.resolve(rootDir, filePath);
  try {
    return normalizeOutputs(JSON.parse(fs.readFileSync(resolved, "utf8")));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not load ${label} "${filePath}": ${message}`);
  }
}

function getStackOutputs(stackName, region, label) {
  try {
    const response = JSON.parse(execFileSync("aws", [
      "cloudformation",
      "describe-stacks",
      "--stack-name",
      stackName,
      "--region",
      region,
      "--output",
      "json",
    ], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 20 * 1024 * 1024,
    }));
    return normalizeOutputs(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read ${label} "${stackName}": ${message}`);
  }
}

function getOutputValue(outputs, keys) {
  for (const key of keys) {
    if (outputs[key]) return outputs[key];
  }
  return "";
}

function runAwsCheck(args, label) {
  try {
    execFileSync("aws", args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 20 * 1024 * 1024,
    });
    return { ok: true, detail: label };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: `${label}: ${message}` };
  }
}

function runHttpCheck(url) {
  try {
    execFileSync("curl", ["-fsSIL", url], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 20 * 1024 * 1024,
    });
    return { ok: true, detail: `HTTP check passed for ${url}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: `HTTP check failed for ${url}: ${message}` };
  }
}

function main() {
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const backendStackName = getArg("backend-stack-name");
  const frontendStackName = getArg("frontend-stack-name");
  const backendOutputsFile = getArg("backend-outputs-file");
  const frontendOutputsFile = getArg("frontend-outputs-file");
  const frontendAppUrlArg = getArg("frontend-app-url");
  const frontendBucketArg = getArg("frontend-bucket");
  const frontendDistributionIdArg = getArg("frontend-distribution-id");
  const apiBaseUrlArg = getArg("api-base-url");
  const apiProbeUrl = getArg("api-probe-url");
  const checkAws = getArg("check-aws", "true").toLowerCase() === "true";
  const checkHttp = getArg("check-http", "false").toLowerCase() === "true";
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";

  const checks = [];
  const errors = [];

  if (!backendStackName && !backendOutputsFile) {
    errors.push("Provide --backend-stack-name or --backend-outputs-file.");
  }
  if (!frontendStackName && !frontendOutputsFile) {
    errors.push("Provide --frontend-stack-name or --frontend-outputs-file.");
  }
  if (errors.length > 0) {
    const result = {
      ok: false,
      mode: "split-stack",
      region,
      backendStackName,
      frontendStackName,
      backendOutputsFile,
      frontendOutputsFile,
      checkAws,
      checkHttp,
      resolved: {},
      checks,
      errors,
    };
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      errors.forEach((line) => console.error(line));
    }
    process.exit(1);
  }

  let backendOutputs = {};
  let frontendOutputs = {};

  try {
    backendOutputs = backendOutputsFile
      ? readOutputsFile(backendOutputsFile, "backend outputs file")
      : getStackOutputs(backendStackName, region, "backend stack");
    checks.push({
      name: "backend outputs source",
      ok: true,
      detail: backendOutputsFile ? `Loaded backend outputs file ${path.resolve(rootDir, backendOutputsFile)}` : `Read backend stack ${backendStackName}`,
    });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    checks.push({
      name: "backend outputs source",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    frontendOutputs = frontendOutputsFile
      ? readOutputsFile(frontendOutputsFile, "frontend outputs file")
      : getStackOutputs(frontendStackName, region, "frontend stack");
    checks.push({
      name: "frontend outputs source",
      ok: true,
      detail: frontendOutputsFile ? `Loaded frontend outputs file ${path.resolve(rootDir, frontendOutputsFile)}` : `Read frontend stack ${frontendStackName}`,
    });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    checks.push({
      name: "frontend outputs source",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  const resolved = {
    apiBaseUrl: apiBaseUrlArg || getOutputValue(backendOutputs, ["ApiBaseUrl", "PublicApiBaseUrl", "ReactAppApiBase"]),
    contentRootUrl: getOutputValue(backendOutputs, ["ContentRootUrl", "ReactAppContentRoot"]),
    websiteBaseUrl: getOutputValue(backendOutputs, ["WebsiteBaseUrl", "ReactAppB1WebsiteUrl"]),
    frontendAppUrl: frontendAppUrlArg || getOutputValue(frontendOutputs, ["AppUrl", "FrontendAppUrl"]),
    frontendBucketName: frontendBucketArg || getOutputValue(frontendOutputs, ["SiteBucketName", "FrontendBucketName"]),
    frontendDistributionId: frontendDistributionIdArg || getOutputValue(frontendOutputs, ["CloudFrontDistributionId", "FrontendDistributionId"]),
  };

  [
    ["api base url output", resolved.apiBaseUrl, "ApiBaseUrl/PublicApiBaseUrl"],
    ["frontend app url output", resolved.frontendAppUrl, "AppUrl/FrontendAppUrl"],
    ["frontend bucket output", resolved.frontendBucketName, "SiteBucketName/FrontendBucketName"],
    ["frontend distribution output", resolved.frontendDistributionId, "CloudFrontDistributionId/FrontendDistributionId"],
  ].forEach(([name, value, source]) => {
    const ok = Boolean(value);
    checks.push({
      name,
      ok,
      detail: ok ? `Resolved from ${source}: ${value}` : `Missing ${source}`,
    });
    if (!ok) errors.push(`Missing required output for ${name}.`);
  });

  if (checkAws && resolved.frontendBucketName) {
    const bucketCheck = runAwsCheck([
      "s3api",
      "head-bucket",
      "--bucket",
      resolved.frontendBucketName,
    ], `Bucket ${resolved.frontendBucketName} is reachable`);
    checks.push({ name: "frontend bucket aws reachability", ...bucketCheck });
    if (!bucketCheck.ok) errors.push(bucketCheck.detail);
  } else {
    checks.push({
      name: "frontend bucket aws reachability",
      ok: true,
      skipped: true,
      detail: checkAws ? "Skipped because no frontend bucket was resolved." : "Skipped because --check-aws=false.",
    });
  }

  if (checkAws && resolved.frontendDistributionId) {
    const distributionCheck = runAwsCheck([
      "cloudfront",
      "get-distribution",
      "--id",
      resolved.frontendDistributionId,
    ], `Distribution ${resolved.frontendDistributionId} is reachable`);
    checks.push({ name: "frontend distribution aws reachability", ...distributionCheck });
    if (!distributionCheck.ok) errors.push(distributionCheck.detail);
  } else {
    checks.push({
      name: "frontend distribution aws reachability",
      ok: true,
      skipped: true,
      detail: checkAws ? "Skipped because no distribution ID was resolved." : "Skipped because --check-aws=false.",
    });
  }

  if (checkHttp && resolved.frontendAppUrl) {
    const httpCheck = runHttpCheck(resolved.frontendAppUrl);
    checks.push({ name: "frontend app http reachability", ...httpCheck });
    if (!httpCheck.ok) errors.push(httpCheck.detail);
  } else {
    checks.push({
      name: "frontend app http reachability",
      ok: true,
      skipped: true,
      detail: checkHttp ? "Skipped because no frontend app URL was resolved." : "Skipped because --check-http=false.",
    });
  }

  if (checkHttp && apiProbeUrl) {
    const apiHttpCheck = runHttpCheck(apiProbeUrl);
    checks.push({ name: "api probe http reachability", ...apiHttpCheck });
    if (!apiHttpCheck.ok) errors.push(apiHttpCheck.detail);
  } else {
    checks.push({
      name: "api probe http reachability",
      ok: true,
      skipped: true,
      detail: checkHttp ? "Skipped because no --api-probe-url was provided." : "Skipped because --check-http=false.",
    });
  }

  const result = {
    ok: errors.length === 0,
    mode: "split-stack",
    region,
    backendStackName,
    frontendStackName,
    backendOutputsFile,
    frontendOutputsFile,
    checkAws,
    checkHttp,
    resolved,
    checks,
    errors,
  };

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    console.log(`Split-stack verification (${result.ok ? "ok" : "failed"})`);
    console.log(`Region: ${region}`);
    if (backendStackName) console.log(`Backend stack: ${backendStackName}`);
    if (frontendStackName) console.log(`Frontend stack: ${frontendStackName}`);
    if (backendOutputsFile) console.log(`Backend outputs file: ${path.resolve(rootDir, backendOutputsFile)}`);
    if (frontendOutputsFile) console.log(`Frontend outputs file: ${path.resolve(rootDir, frontendOutputsFile)}`);
    console.log("");
    checks.forEach((check) => {
      const status = check.skipped ? "SKIP" : check.ok ? "OK" : "FAIL";
      console.log(`[${status}] ${check.name}: ${check.detail}`);
    });
    if (errors.length > 0) {
      console.log("");
      errors.forEach((line) => console.error(line));
    }
  }

  process.exit(result.ok ? 0 : 1);
}

main();
