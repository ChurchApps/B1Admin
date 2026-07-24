import path from "node:path";

import {
  boolArg,
  failText,
  getArg,
  printJson,
  readJsonFile,
  relativeToRoot,
  requireEnvironmentDir,
  resolveEnvironmentDir,
  rootDir,
  runCommandJson,
} from "./installer-common.mjs";

function roleNameFromArn(arn) {
  const match = String(arn || "").match(/^arn:aws:iam::\d{12}:role\/(.+)$/);
  return match ? match[1] : "";
}

function checkAwsCli(region, expectedAccountId) {
  const result = runCommandJson("aws", ["sts", "get-caller-identity", "--output", "json"]);
  if (!result.ok) {
    return { ok: false, name: "AWS CLI identity", detail: result.stderr.trim() || "Could not read AWS caller identity." };
  }

  const accountId = result.parsed?.Account || "";
  if (expectedAccountId && accountId && expectedAccountId !== accountId) {
    return {
      ok: false,
      name: "AWS CLI identity",
      detail: `AWS CLI is authenticated to account ${accountId}, but --account-id expects ${expectedAccountId}.`,
      accountId,
      region,
    };
  }

  return {
    ok: true,
    name: "AWS CLI identity",
    detail: `Authenticated to AWS account ${accountId || "<unknown>"} for region ${region}.`,
    accountId,
    region,
  };
}

function checkCloudFormationRole(roleArn, { skipResourceLookup = false } = {}) {
  if (!roleArn) {
    return {
      ok: true,
      skipped: true,
      name: "CloudFormation execution role",
      detail: "Skipped because --cloudformation-execution-role-arn was not provided.",
    };
  }

  const roleName = roleNameFromArn(roleArn);
  if (!roleName) {
    return {
      ok: false,
      name: "CloudFormation execution role",
      detail: `CloudFormation execution role ARN is not an IAM role ARN: ${roleArn}`,
    };
  }

  if (skipResourceLookup) {
    return {
      ok: true,
      skipped: true,
      name: "CloudFormation execution role",
      detail: `Role ARN format is valid; AWS lookup skipped: ${roleArn}`,
    };
  }

  const result = runCommandJson("aws", ["iam", "get-role", "--role-name", roleName, "--output", "json"]);
  if (!result.ok) {
    return {
      ok: false,
      name: "CloudFormation execution role",
      detail: result.stderr.trim() || `Could not read IAM role ${roleName}.`,
    };
  }

  return {
    ok: true,
    name: "CloudFormation execution role",
    detail: `IAM role is readable: ${roleArn}`,
  };
}

function checkFrontendCertificate(certificateArn, { skipResourceLookup = false } = {}) {
  if (!certificateArn) {
    return {
      ok: true,
      skipped: true,
      name: "frontend ACM certificate",
      detail: "Skipped because no custom frontend domain is configured.",
    };
  }

  const regionMatch = String(certificateArn).match(/^arn:aws:acm:([^:]+):\d{12}:certificate\/.+$/);
  if (!regionMatch) {
    return {
      ok: false,
      name: "frontend ACM certificate",
      detail: `Frontend ACM certificate ARN is not valid: ${certificateArn}`,
    };
  }

  if (regionMatch[1] !== "us-east-1") {
    return {
      ok: false,
      name: "frontend ACM certificate",
      detail: `CloudFront requires the frontend ACM certificate in us-east-1, but this ARN is in ${regionMatch[1]}.`,
    };
  }

  if (skipResourceLookup) {
    return {
      ok: true,
      skipped: true,
      name: "frontend ACM certificate",
      detail: `Certificate ARN is in us-east-1; AWS lookup skipped: ${certificateArn}`,
    };
  }

  const result = runCommandJson("aws", ["acm", "describe-certificate", "--certificate-arn", certificateArn, "--region", "us-east-1", "--output", "json"]);
  if (!result.ok) {
    return {
      ok: false,
      name: "frontend ACM certificate",
      detail: result.stderr.trim() || `Could not read ACM certificate ${certificateArn}.`,
    };
  }

  const status = result.parsed?.Certificate?.Status || "";
  return {
    ok: status === "ISSUED",
    name: "frontend ACM certificate",
    detail: status === "ISSUED" ? "Certificate exists and is ISSUED in us-east-1." : `Certificate exists but status is ${status || "<unknown>"}.`,
  };
}

function checkHostedZone(hostedZoneId, label, { skipResourceLookup = false } = {}) {
  if (!hostedZoneId) {
    return {
      ok: true,
      skipped: true,
      name: label,
      detail: "Skipped because no hosted zone ID is configured.",
    };
  }

  if (skipResourceLookup) {
    return {
      ok: true,
      skipped: true,
      name: label,
      detail: `Hosted zone ID is configured; AWS lookup skipped: ${hostedZoneId}`,
    };
  }

  const result = runCommandJson("aws", ["route53", "get-hosted-zone", "--id", hostedZoneId, "--output", "json"]);
  if (!result.ok) {
    return {
      ok: false,
      name: label,
      detail: result.stderr.trim() || `Could not read Route53 hosted zone ${hostedZoneId}.`,
    };
  }

  return {
    ok: true,
    name: label,
    detail: `Hosted zone is readable: ${result.parsed?.HostedZone?.Name || hostedZoneId}`,
  };
}

function renderMarkdown(result) {
  const lines = [
    `# Installer AWS Preflight: ${result.environment}`,
    "",
    `- Status: ${result.ok ? "ready" : "blocked"}`,
    `- Environment dir: \`${result.environmentDir}\``,
    `- Region: \`${result.region}\``,
    "",
    "## Checks",
    "",
  ];

  result.checks.forEach((check) => {
    const status = check.skipped ? "SKIP" : check.ok ? "OK" : "BLOCKED";
    lines.push(`- ${status}: ${check.name} - ${check.detail}`);
  });

  return `${lines.join("\n")}\n`;
}

function main() {
  const environment = getArg("environment", "staging");
  const environmentDirArg = getArg("environment-dir");
  const outputMode = getArg("output", "text").toLowerCase();
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const expectedAccountId = getArg("account-id");
  const cfnRoleArn = getArg("cloudformation-execution-role-arn", process.env.AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN || "");
  const skipAwsIdentityCheck = boolArg("skip-aws-identity-check", false);
  const skipAwsResourceLookups = boolArg("skip-aws-resource-lookups", false);
  const environmentDir = resolveEnvironmentDir(environment, environmentDirArg);

  try {
    requireEnvironmentDir(environmentDir);
  } catch (error) {
    failText(error instanceof Error ? error.message : String(error), outputMode);
  }

  if (boolArg("skip-aws-check", false)) {
    const result = {
      ok: true,
      skipped: true,
      environment,
      environmentDir: relativeToRoot(environmentDir),
      region,
      checks: [
        {
          ok: true,
          skipped: true,
          name: "AWS checks",
          detail: "Skipped by --skip-aws-check=true.",
        },
      ],
    };
    if (outputMode === "json") printJson(result);
    else if (outputMode === "markdown" || outputMode === "md") process.stdout.write(renderMarkdown(result));
    else console.log("Installer AWS preflight skipped by --skip-aws-check=true.");
    process.exit(0);
  }

  const frontend = readJsonFile(path.join(environmentDir, "frontend-parameters.json"));
  const backend = readJsonFile(path.join(environmentDir, "backend-parameters.json"));
  const checks = [
    skipAwsIdentityCheck
      ? { ok: true, skipped: true, name: "AWS CLI identity", detail: "Skipped by --skip-aws-identity-check=true." }
      : checkAwsCli(region, expectedAccountId),
    checkCloudFormationRole(cfnRoleArn, { skipResourceLookup: skipAwsResourceLookups }),
    checkFrontendCertificate(frontend.AcmCertificateArn, { skipResourceLookup: skipAwsResourceLookups }),
    checkHostedZone(frontend.HostedZoneId, "frontend Route53 hosted zone", { skipResourceLookup: skipAwsResourceLookups }),
  ];

  if (backend.ApiCustomDomainName || backend.ApiCertificateArn || backend.ApiHostedZoneId) {
    checks.push(checkHostedZone(backend.ApiHostedZoneId, "API Route53 hosted zone", { skipResourceLookup: skipAwsResourceLookups }));
  }

  const result = {
    ok: checks.every((check) => check.ok),
    environment,
    environmentDir: relativeToRoot(environmentDir),
    region,
    checks,
  };

  if (outputMode === "json") {
    printJson(result);
  } else if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(renderMarkdown(result));
  } else {
    console.log(`Installer AWS preflight: ${result.ok ? "ready" : "blocked"}`);
    checks.forEach((check) => {
      const status = check.skipped ? "SKIP" : check.ok ? "OK" : "BLOCKED";
      console.log(`[${status}] ${check.name}: ${check.detail}`);
    });
  }

  process.exit(result.ok ? 0 : 1);
}

main();
