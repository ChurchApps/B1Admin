#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getArg, getBooleanArg } from "./lib/arg-utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runAws(args, options = {}) {
  const result = spawnSync("aws", args, {
    cwd: rootDir,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 1024 * 1024 * 64,
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`aws ${args.join(" ")} failed.\nSTDOUT:\n${result.stdout || ""}\nSTDERR:\n${result.stderr || result.error?.message || ""}`);
  }

  return (result.stdout || "").trim();
}

function runAwsJson(args) {
  const output = runAws(args);
  return output ? JSON.parse(output) : {};
}

function stackExists(stackName, region) {
  try {
    runAws(["cloudformation", "describe-stacks", "--stack-name", stackName, "--region", region, "--output", "json"]);
    return true;
  } catch {
    return false;
  }
}

function secretExists(secretId, region) {
  try {
    runAws(["secretsmanager", "describe-secret", "--secret-id", secretId, "--region", region, "--output", "json"]);
    return true;
  } catch {
    return false;
  }
}

function uniq(values) {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

function getStackResource(stackName, logicalId, region) {
  const output = runAwsJson([
    "cloudformation", "describe-stack-resources",
    "--stack-name", stackName,
    "--region", region,
    "--output", "json",
  ]);

  const resources = Array.isArray(output.StackResources) ? output.StackResources : [];
  const match = resources.find((resource) => resource.LogicalResourceId === logicalId);
  return match?.PhysicalResourceId || "";
}

function listBucketNames() {
  const output = runAwsJson(["s3api", "list-buckets", "--output", "json"]);
  return Array.isArray(output.Buckets) ? output.Buckets.map((bucket) => bucket.Name).filter(Boolean) : [];
}

function findBucketsByPrefix(prefixes) {
  const bucketNames = listBucketNames();
  return uniq(bucketNames.filter((name) => prefixes.some((prefix) => name.startsWith(prefix))));
}

function listBucketObjectVersions(bucketName, region) {
  const args = [
    "s3api",
    "list-object-versions",
    "--bucket", bucketName,
    "--region", region,
    "--max-items", "500",
    "--output", "json",
  ];

  return runAwsJson(args);
}

function deleteBucketBatch(bucketName, region, objects) {
  if (objects.length === 0) return;

  const payload = JSON.stringify({
    Objects: objects.map((entry) => ({
      Key: entry.Key,
      VersionId: entry.VersionId,
    })),
    Quiet: true,
  });

  runAws([
    "s3api",
    "delete-objects",
    "--bucket", bucketName,
    "--region", region,
    "--delete", payload,
  ]);
}

function emptyBucket(bucketName, region) {
  if (!bucketName) return;
  if (!bucketExists(bucketName, region)) return;

  while (true) {
    let page;
    try {
      page = listBucketObjectVersions(bucketName, region);
    } catch (error) {
      if (String(error.message || "").includes("NoSuchBucket")) return;
      throw error;
    }
    const objects = [
      ...(page.Versions || []),
      ...(page.DeleteMarkers || []),
    ];

    if (objects.length === 0) break;

    for (let index = 0; index < objects.length; index += 1000) {
      deleteBucketBatch(bucketName, region, objects.slice(index, index + 1000));
    }
  }

  try {
    runAws(["s3", "rm", `s3://${bucketName}`, "--recursive", "--region", region]);
  } catch {
    // `s3 rm` is only a final sweep for any non-versioned remnants.
  }
}

function bucketExists(bucketName, region) {
  try {
    runAws(["s3api", "head-bucket", "--bucket", bucketName, "--region", region]);
    return true;
  } catch {
    return false;
  }
}

function deleteBucket(bucketName, region) {
  if (!bucketName) return;
  if (!bucketExists(bucketName, region)) return;
  runAws(["s3api", "delete-bucket", "--bucket", bucketName, "--region", region]);
}

function listLogGroupsByPrefix(prefix, region) {
  const names = [];
  let nextToken = "";

  while (true) {
    const args = [
      "logs",
      "describe-log-groups",
      "--region", region,
      "--log-group-name-prefix", prefix,
      "--output", "json",
    ];
    if (nextToken) args.push("--next-token", nextToken);

    const output = runAwsJson(args);
    const groups = Array.isArray(output.logGroups) ? output.logGroups : [];
    names.push(...groups.map((group) => group.logGroupName).filter(Boolean));

    nextToken = output.nextToken || "";
    if (!nextToken) break;
  }

  return uniq(names);
}

function deleteLogGroup(logGroupName, region) {
  if (!logGroupName) return;
  try {
    runAws(["logs", "delete-log-group", "--log-group-name", logGroupName, "--region", region]);
  } catch (error) {
    if (String(error.message || "").includes("ResourceNotFoundException")) return;
    throw error;
  }
}

function deleteStack(stackName, region) {
  runAws(["cloudformation", "delete-stack", "--stack-name", stackName, "--region", region]);
  runAws(["cloudformation", "wait", "stack-delete-complete", "--stack-name", stackName, "--region", region], { stdio: "inherit" });
}

function deleteSecret(secretId, region, forceDelete) {
  const args = ["secretsmanager", "delete-secret", "--secret-id", secretId, "--region", region];
  if (forceDelete) args.push("--force-delete-without-recovery");
  else args.push("--recovery-window-in-days", "7");
  runAws(args, { stdio: "inherit" });
}

function buildResetPlan(options) {
  const { region, stackPrefix, appConfigSecretName, forceDeleteSecret, removeLocalEvidence } = options;
  const frontendStack = `${stackPrefix}-frontend`;
  const backendStack = `${stackPrefix}-backend`;
  const bootstrapStack = `${stackPrefix}-bootstrap`;
  const deploymentDir = path.join(rootDir, "deployment", options.environment);
  const lambdaLogGroups = listLogGroupsByPrefix(`/aws/lambda/${stackPrefix}`, region);

  const frontendExists = stackExists(frontendStack, region);
  const backendExists = stackExists(backendStack, region);
  const bootstrapExists = stackExists(bootstrapStack, region);

  const frontendBucket = frontendExists ? getStackResource(frontendStack, "SiteBucket", region) : "";
  const backendBucket = backendExists ? getStackResource(backendStack, "ManagedAssetBucket", region) : "";
  const databaseMasterSecret = backendExists ? getStackResource(backendStack, "DatabaseMasterSecret", region) : "";
  const bootstrapArtifactBucket = bootstrapExists ? getStackResource(bootstrapStack, "ArtifactBucket", region) : "";
  const bootstrapTemplateBucket = bootstrapExists ? getStackResource(bootstrapStack, "TemplateBucket", region) : "";
  const frontendBuckets = uniq([
    frontendBucket,
    ...findBucketsByPrefix([`${frontendStack.toLowerCase()}-sitebucket-`]),
  ]);
  const backendBuckets = uniq([
    backendBucket,
    ...findBucketsByPrefix([`${backendStack.toLowerCase()}-managedassetbucket-`]),
  ]);
  const bootstrapArtifactBuckets = uniq([
    bootstrapArtifactBucket,
    ...findBucketsByPrefix([`${stackPrefix.toLowerCase()}-artifacts-`]),
  ]);
  const bootstrapTemplateBuckets = uniq([
    bootstrapTemplateBucket,
    ...findBucketsByPrefix([`${stackPrefix.toLowerCase()}-templates-`]),
  ]);

  const actions = [];

  frontendBuckets.forEach((bucket) => actions.push(`Empty frontend site bucket ${bucket}`));
  if (frontendExists) actions.push(`Delete stack ${frontendStack}`);
  backendBuckets.forEach((bucket) => actions.push(`Empty backend managed asset bucket ${bucket}`));
  if (backendExists) actions.push(`Delete stack ${backendStack}`);
  lambdaLogGroups.forEach((logGroupName) => actions.push(`Delete Lambda log group ${logGroupName}`));
  if (databaseMasterSecret) {
    actions.push(`Delete database master secret ${databaseMasterSecret}${forceDeleteSecret ? " immediately" : " with recovery window"}`);
  }
  if (secretExists(appConfigSecretName, region)) {
    actions.push(`Delete app config secret ${appConfigSecretName}${forceDeleteSecret ? " immediately" : " with recovery window"}`);
  }
  bootstrapArtifactBuckets.forEach((bucket) => actions.push(`Empty bootstrap artifact bucket ${bucket}`));
  bootstrapTemplateBuckets.forEach((bucket) => actions.push(`Empty bootstrap template bucket ${bucket}`));
  if (bootstrapExists) actions.push(`Delete stack ${bootstrapStack}`);
  if (removeLocalEvidence && fs.existsSync(deploymentDir)) {
    actions.push(`Remove local deployment evidence in ${path.relative(rootDir, deploymentDir)}`);
  }

  return {
    frontendStack,
    backendStack,
    bootstrapStack,
    frontendExists,
    backendExists,
    bootstrapExists,
    frontendBuckets,
    backendBuckets,
    lambdaLogGroups,
    databaseMasterSecret,
    bootstrapArtifactBuckets,
    bootstrapTemplateBuckets,
    deploymentDir,
    actions,
  };
}

function main() {
  const region = getArg("region", "us-east-1");
  const projectName = getArg("project-name", "b1admin");
  const environment = getArg("environment", "staging");
  const stackPrefix = `${projectName}-${environment}`;
  const appConfigSecretName = `${projectName}/${environment}/app-config`;
  const forceDeleteSecret = getBooleanArg("force-delete-secret", true);
  const removeLocalEvidence = getBooleanArg("remove-local-evidence", true);
  const dryRun = getBooleanArg("dry-run", false);

  const plan = buildResetPlan({
    region,
    environment,
    stackPrefix,
    appConfigSecretName,
    forceDeleteSecret,
    removeLocalEvidence,
  });

  if (dryRun) {
    console.log(JSON.stringify({
      ok: true,
      region,
      environment,
      actions: plan.actions,
    }, null, 2));
    return;
  }

  for (const bucket of plan.frontendBuckets) emptyBucket(bucket, region);
  if (plan.frontendExists) deleteStack(plan.frontendStack, region);
  for (const bucket of plan.frontendBuckets) {
    if (bucketExists(bucket, region)) deleteBucket(bucket, region);
  }

  for (const bucket of plan.backendBuckets) emptyBucket(bucket, region);
  if (plan.backendExists) deleteStack(plan.backendStack, region);
  for (const bucket of plan.backendBuckets) {
    if (bucketExists(bucket, region)) deleteBucket(bucket, region);
  }
  for (const logGroupName of plan.lambdaLogGroups) deleteLogGroup(logGroupName, region);

  if (plan.databaseMasterSecret && secretExists(plan.databaseMasterSecret, region)) {
    deleteSecret(plan.databaseMasterSecret, region, forceDeleteSecret);
  }

  if (secretExists(appConfigSecretName, region)) {
    deleteSecret(appConfigSecretName, region, forceDeleteSecret);
  }

  for (const bucket of plan.bootstrapArtifactBuckets) emptyBucket(bucket, region);
  for (const bucket of plan.bootstrapTemplateBuckets) emptyBucket(bucket, region);
  if (plan.bootstrapExists) deleteStack(plan.bootstrapStack, region);
  for (const bucket of plan.bootstrapArtifactBuckets) {
    if (bucketExists(bucket, region)) deleteBucket(bucket, region);
  }
  for (const bucket of plan.bootstrapTemplateBuckets) {
    if (bucketExists(bucket, region)) deleteBucket(bucket, region);
  }

  if (removeLocalEvidence && fs.existsSync(plan.deploymentDir)) {
    fs.rmSync(plan.deploymentDir, { recursive: true, force: true });
  }

  console.log(`Reset complete for ${environment} in ${region}.`);
}

main();
