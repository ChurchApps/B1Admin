import fs from "node:fs";
import path from "node:path";
import {
  boolArg,
  getArg,
  printJson,
  relativeToRoot,
  rootDir,
  runNodeJson,
} from "./installer-common.mjs";

function environmentsFromArg() {
  const value = getArg("environment", "all");
  if (value === "all") return ["staging", "prod"];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function renderMarkdown(result) {
  const lines = [
    "# B1Admin AWS Admin Handoff",
    "",
    "Use this handoff to create the AWS roles that let the private GitHub deployment repository deploy B1Admin.",
    "",
    "The recommended path uses GitHub OIDC. Do not create long-lived AWS access keys for GitHub unless your organization has deliberately rejected OIDC.",
    "",
    "## Summary",
    "",
    `- AWS account: \`${result.accountId}\``,
    `- AWS region: \`${result.region}\``,
    `- Private deploy repo: \`${result.repo}\``,
    `- Role files root: \`${result.roleOutputRoot}\``,
    "",
    "## AWS Administrator Steps",
    "",
    "1. Sign in to the target AWS account with IAM administration permissions.",
    "2. Confirm whether the GitHub OIDC provider already exists.",
    "3. Run the commands below for prod. Run staging too only if the operator wants an optional practice deployment. Skip the create-provider command if the provider already exists.",
    "4. Send the role ARNs in the Role ARNs section back to the deployment operator.",
    "",
  ];

  result.environments.forEach((environment) => {
    lines.push(
      `## ${environment.name}`,
      "",
      `- GitHub Environment: \`${environment.githubEnvironment}\``,
      `- Deploy role ARN: \`${environment.roleArns.deployRoleArn}\``,
      `- CloudFormation execution role ARN: \`${environment.roleArns.cfnRoleArn}\``,
      "",
      "### Files",
      "",
    );
    environment.files.forEach((file) => lines.push(`- \`${file.path}\``));
    lines.push("", "### AWS Commands", "", "```bash");
    environment.awsCommands.forEach((command) => lines.push(command));
    lines.push("```", "", "### Operator GitHub Secret Commands", "", "```bash");
    environment.githubSecretCommands.forEach((command) => lines.push(command));
    lines.push("```", "");
  });

  lines.push(
    "## After AWS Is Ready",
    "",
    "The deployment operator should run:",
    "",
    "```bash",
    "# Smallest AWS footprint: continue with prod first.",
    "yarn installer:next -- --customer-file=../b1admin-deploy/customer-values.json --environment=prod --output=markdown",
    "",
    "# Optional practice deployment: run staging first, then prod after staging is verified.",
    "yarn installer:next -- --customer-file=../b1admin-deploy/customer-values.json --environment=staging --output=markdown",
    "```",
    "",
    "Then continue with the next command shown by the installer.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

function main() {
  const outputMode = getArg("output", "text").toLowerCase();
  const accountId = getArg("account-id");
  const repo = getArg("repo");
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const deployRepoDir = getArg("deploy-repo-dir", "../b1admin-deploy");
  const customerFile = getArg("customer-file", path.join(deployRepoDir, "customer-values.json"));
  const roleOutputRoot = getArg("role-output-root", path.join(deployRepoDir, "iam"));
  const outputFile = path.resolve(rootDir, getArg("output-file", path.join(deployRepoDir, "aws-admin-handoff.md")));
  const write = boolArg("write", false);
  const force = boolArg("force", true);
  const environments = environmentsFromArg();

  const generated = environments.map((environment) => {
    const roleOutputDir = path.join(roleOutputRoot, environment);
    const result = runNodeJson("scripts/installer-aws-roles.mjs", [
      `--environment=${environment}`,
      `--customer-file=${customerFile}`,
      `--output-dir=${roleOutputDir}`,
      `--write=${write ? "true" : "false"}`,
      `--force=${force ? "true" : "false"}`,
      "--output=json",
    ]);

    if (!result.ok || !result.parsed?.ok) {
      throw new Error(result.stderr.trim() || result.stdout.trim() || `Could not generate AWS role handoff for ${environment}.`);
    }

    return {
      name: environment,
      githubEnvironment: result.parsed.githubEnvironment,
      roleNames: result.parsed.roleNames,
      roleArns: result.parsed.roleArns,
      files: result.parsed.files,
      awsCommands: result.parsed.awsCommands,
      githubSecretCommands: result.parsed.githubSecretCommands,
    };
  });

  const result = {
    ok: true,
    write,
    outputFile: relativeToRoot(outputFile),
    accountId,
    region,
    repo,
    customerFile: relativeToRoot(path.resolve(rootDir, customerFile)),
    roleOutputRoot,
    environments: generated,
  };

  const body = renderMarkdown(result);
  if (write) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, body);
  }

  if (outputMode === "json") {
    printJson({ ...result, markdown: write ? undefined : body });
  } else if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(body);
  } else {
    console.log(write ? `Wrote ${result.outputFile}` : body);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
