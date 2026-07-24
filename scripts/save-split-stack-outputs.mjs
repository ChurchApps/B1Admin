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

function toRepoRelative(resolvedPath) {
  const relative = path.relative(rootDir, resolvedPath);
  return relative.startsWith("..") ? resolvedPath : relative;
}

function normalizeOutputs(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) return Object.fromEntries(raw.map((output) => [output.OutputKey, output.OutputValue]));
  if (raw.Stacks?.[0]?.Outputs) return normalizeOutputs(raw.Stacks[0].Outputs);
  if (raw.Outputs) return normalizeOutputs(raw.Outputs);
  return raw;
}

function getOutputValue(outputs, keys) {
  for (const key of keys) {
    if (outputs[key]) return outputs[key];
  }
  return "";
}

function readEnvironmentConfig(environment) {
  const environmentDir = path.join(rootDir, "infrastructure", "environments", environment);
  const bootstrapPath = path.join(environmentDir, "bootstrap-parameters.json");

  if (!fs.existsSync(bootstrapPath)) {
    throw new Error(`Could not find bootstrap-parameters.json for environment "${environment}".`);
  }

  const bootstrap = JSON.parse(fs.readFileSync(bootstrapPath, "utf8"));
  const projectName = bootstrap.ProjectName || "b1admin";
  const environmentName = bootstrap.EnvironmentName || environment;
  const stackPrefix = `${projectName}-${environmentName}`;

  return {
    environmentDir,
    projectName,
    environmentName,
    backendStackName: `${stackPrefix}-backend`,
    frontendStackName: `${stackPrefix}-frontend`,
  };
}

function describeStack(stackName, region, label) {
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

    return {
      raw: response,
      outputs: normalizeOutputs(response),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read ${label} "${stackName}": ${message}`);
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function main() {
  const environment = getArg("environment");
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";

  let environmentConfig = null;
  try {
    environmentConfig = environment ? readEnvironmentConfig(environment) : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify({ ok: false, environment, region, errors: [message] }, null, 2)}\n`);
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  const backendStackName = getArg("backend-stack-name", environmentConfig?.backendStackName || "");
  const frontendStackName = getArg("frontend-stack-name", environmentConfig?.frontendStackName || "");
  const projectName = environmentConfig?.projectName || getArg("project-name", "b1admin");
  const environmentName = environmentConfig?.environmentName || environment || "";
  const defaultOutputDir = environment ? `deployment/${environment}` : "deployment/manual";
  const outputDirArg = getArg("output-dir", defaultOutputDir);
  const outputDir = path.resolve(rootDir, outputDirArg);
  const backendOutputsFile = path.resolve(outputDir, getArg("backend-outputs-file", "backend-outputs.json"));
  const frontendOutputsFile = path.resolve(outputDir, getArg("frontend-outputs-file", "frontend-outputs.json"));
  const summaryFile = path.resolve(outputDir, getArg("summary-file", "deployment-summary.json"));
  const preflightPlanFile = path.resolve(outputDir, getArg("preflight-plan-file", "preflight-plan.md"));

  const errors = [];
  if (!backendStackName) errors.push("Provide --backend-stack-name or --environment.");
  if (!frontendStackName) errors.push("Provide --frontend-stack-name or --environment.");

  if (errors.length > 0) {
    const result = {
      ok: false,
      environment,
      region,
      errors,
    };
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      errors.forEach((message) => console.error(message));
    }
    process.exit(1);
  }

  let backend = null;
  let frontend = null;

  try {
    backend = describeStack(backendStackName, region, "backend stack");
    frontend = describeStack(frontendStackName, region, "frontend stack");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify({
        ok: false,
        environment,
        region,
        stackNames: {
          backend: backendStackName,
          frontend: frontendStackName,
        },
        errors: [message],
      }, null, 2)}\n`);
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  writeJson(backendOutputsFile, backend.raw);
  writeJson(frontendOutputsFile, frontend.raw);

  const backendOutputsPath = toRepoRelative(backendOutputsFile);
  const frontendOutputsPath = toRepoRelative(frontendOutputsFile);
  const summaryPath = toRepoRelative(summaryFile);
  const preflightPlanPath = fs.existsSync(preflightPlanFile) ? toRepoRelative(preflightPlanFile) : "";
  const environmentDirRelative = environmentConfig ? toRepoRelative(environmentConfig.environmentDir) : "";

  const summary = {
    ok: true,
    environment,
    projectName,
    environmentName,
    region,
    stackNames: {
      backend: backendStackName,
      frontend: frontendStackName,
    },
    outputDir: toRepoRelative(outputDir),
    files: {
      backendOutputsFile: backendOutputsPath,
      frontendOutputsFile: frontendOutputsPath,
      summaryFile: summaryPath,
      preflightPlanFile: preflightPlanPath,
    },
    resolved: {
      apiBaseUrl: getOutputValue(backend.outputs, ["ApiBaseUrl", "PublicApiBaseUrl", "ReactAppApiBase"]),
      frontendAppUrl: getOutputValue(frontend.outputs, ["AppUrl", "FrontendAppUrl"]),
      frontendBucketName: getOutputValue(frontend.outputs, ["SiteBucketName", "FrontendBucketName"]),
      frontendDistributionId: getOutputValue(frontend.outputs, ["CloudFrontDistributionId", "FrontendDistributionId"]),
      appConfigSecretArn: getOutputValue(backend.outputs, ["AppConfigSecretArn"]),
    },
    followUpCommands: {
      showDeploymentSummary: `yarn show:deployment-summary -- --summary-file=${summaryPath} --output=markdown`,
      verifyFromSavedOutputs: `yarn verify:split-stack -- --region=${region} --backend-outputs-file=${backendOutputsPath} --frontend-outputs-file=${frontendOutputsPath}`,
      verifyFromSavedOutputsWithHttp: `yarn verify:split-stack -- --region=${region} --backend-outputs-file=${backendOutputsPath} --frontend-outputs-file=${frontendOutputsPath} --check-http=true`,
      publishFrontendAssetsFromSavedOutputs: `yarn publish:frontend-assets -- --frontend-outputs-file=${frontendOutputsPath} --backend-outputs-file=${backendOutputsPath}`,
      publishFromSavedOutputs: environmentDirRelative
        ? `yarn deploy:aws -- --region=${region} --project-name=${projectName} --environment=${environment || environmentName} --frontend-parameters-file=${environmentDirRelative}/frontend-parameters.json --backend-parameters-file=${environmentDirRelative}/backend-parameters.json --frontend-outputs-file=${frontendOutputsPath} --backend-outputs-file=${backendOutputsPath} --skip-backend --skip-frontend --publish-frontend-assets`
        : "",
    },
  };

  writeJson(summaryFile, summary);

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  console.log("Saved split-stack outputs.");
  console.log(`Backend outputs: ${backendOutputsPath}`);
  console.log(`Frontend outputs: ${frontendOutputsPath}`);
  console.log(`Summary: ${summaryPath}`);
  if (preflightPlanPath) console.log(`Preflight plan: ${preflightPlanPath}`);
  if (summary.resolved.apiBaseUrl) console.log(`API base URL: ${summary.resolved.apiBaseUrl}`);
  if (summary.resolved.frontendAppUrl) console.log(`Frontend app URL: ${summary.resolved.frontendAppUrl}`);
}

main();
