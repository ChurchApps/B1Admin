import fs from "node:fs";
import path from "node:path";
import {
  boolArg,
  failText,
  getArg,
  inferDeployRepo,
  printJson,
  relativeToRoot,
  rootDir,
} from "./installer-common.mjs";

const iamDir = path.join(rootDir, "infrastructure", "iam");

function splitRepo(repo) {
  const [owner, name] = String(repo || "").split("/");
  return { owner, name };
}

function readTemplate(fileName, outputMode) {
  const templatePath = path.join(iamDir, fileName);
  try {
    return fs.readFileSync(templatePath, "utf8");
  } catch (error) {
    failText(`Could not read IAM template ${fileName}: ${error instanceof Error ? error.message : String(error)}`, outputMode);
  }
}

function replacePlaceholders(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`<${key}>`, value),
    template,
  );
}

function formatJson(text, label, outputMode) {
  try {
    return `${JSON.stringify(JSON.parse(text), null, 2)}\n`;
  } catch (error) {
    failText(`Rendered ${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`, outputMode);
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function fileUri(filePath) {
  return `file://${filePath}`;
}

function renderMarkdown(result) {
  const lines = [
    `# AWS IAM Role Setup: ${result.environment}`,
    "",
    `- Status: ${result.ok ? "ok" : "needs attention"}`,
    `- Mode: ${result.write ? "write files" : "preview"}`,
    `- AWS account: \`${result.accountId}\``,
    `- AWS region: \`${result.region}\``,
    `- Private deploy repo: \`${result.repo}\``,
    `- GitHub environment: \`${result.githubEnvironment}\``,
    `- Deploy role: \`${result.roleNames.deployRoleName}\``,
    `- CloudFormation execution role: \`${result.roleNames.cfnRoleName}\``,
    "",
    "## Files",
    "",
  ];

  result.files.forEach((file) => {
    lines.push(`- ${file.written ? "wrote" : "planned"} \`${file.path}\``);
  });

  lines.push("", "## AWS Commands", "");
  result.awsCommands.forEach((command) => lines.push(`- \`${command}\``));

  lines.push("", "## GitHub Secret Commands", "");
  result.githubSecretCommands.forEach((command) => lines.push(`- \`${command}\``));

  if (result.nextSteps.length > 0) {
    lines.push("", "## Next Steps", "");
    result.nextSteps.forEach((step) => lines.push(`- ${step}`));
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const outputMode = getArg("output", "text").toLowerCase();
  const environment = getArg("environment", "staging");
  const projectName = getArg("project-name", "b1admin");
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const accountId = getArg("account-id", process.env.AWS_ACCOUNT_ID || "");
  const repo = inferDeployRepo(getArg("repo"));
  const githubEnvironment = getArg("github-environment", `aws-${environment}`);
  const deployRoleName = getArg("deploy-role-name", `${projectName}-${environment}-github-deploy`);
  const cfnRoleName = getArg("cloudformation-execution-role-name", `${projectName}-${environment}-cfn-exec`);
  const outputDir = path.resolve(rootDir, getArg("output-dir", path.join("infrastructure", "iam", "generated", environment)));
  const write = boolArg("write", false);
  const force = boolArg("force", false);

  if (!accountId.match(/^\d{12}$/)) {
    failText("--account-id or AWS_ACCOUNT_ID must be a 12-digit AWS account id.", outputMode);
  }
  if (!repo) {
    failText("DEPLOY_REPO or --repo is required.", outputMode);
  }
  const { owner, name } = splitRepo(repo);
  if (!owner || !name) {
    failText(`Repository must use owner/name format: ${repo}`, outputMode);
  }

  const replacements = {
    "account-id": accountId,
    "repo-owner": owner,
    "deploy-repo": name,
    "github-environment": githubEnvironment,
    region,
    "project-name": projectName,
    environment,
    "cloudformation-execution-role-name": cfnRoleName,
  };

  const rendered = [
    {
      key: "githubDeployTrust",
      fileName: `${deployRoleName}-trust.json`,
      template: "github-oidc-deploy-role-trust.sample.json",
      label: "GitHub deploy role trust policy",
    },
    {
      key: "githubDeployPolicy",
      fileName: `${deployRoleName}-policy.json`,
      template: "github-oidc-deploy-policy.sample.json",
      label: "GitHub deploy role inline policy",
    },
    {
      key: "cloudFormationTrust",
      fileName: `${cfnRoleName}-trust.json`,
      template: "cloudformation-execution-role-trust.sample.json",
      label: "CloudFormation execution role trust policy",
    },
    {
      key: "cloudFormationPolicy",
      fileName: `${cfnRoleName}-policy.json`,
      template: "cloudformation-execution-policy.sample.json",
      label: "CloudFormation execution role inline policy",
    },
  ].map((entry) => {
    const body = formatJson(replacePlaceholders(readTemplate(entry.template, outputMode), replacements), entry.label, outputMode);
    const targetPath = path.join(outputDir, entry.fileName);
    return {
      ...entry,
      targetPath,
      path: relativeToRoot(targetPath),
      body,
      exists: fs.existsSync(targetPath),
      written: false,
    };
  });

  const existing = rendered.filter((file) => file.exists);
  if (write && existing.length > 0 && !force) {
    failText(`IAM files already exist. Re-run with --force=true to replace: ${existing.map((file) => file.path).join(", ")}`, outputMode);
  }

  if (write) {
    fs.mkdirSync(outputDir, { recursive: true });
    rendered.forEach((file) => {
      fs.writeFileSync(file.targetPath, file.body);
      file.written = true;
    });
  }

  const deployRoleArn = `arn:aws:iam::${accountId}:role/${deployRoleName}`;
  const cfnRoleArn = `arn:aws:iam::${accountId}:role/${cfnRoleName}`;
  const fileFor = (key) => rendered.find((file) => file.key === key).path;
  const awsCommands = [
    "aws iam list-open-id-connect-providers",
    "aws iam create-open-id-connect-provider --url https://token.actions.githubusercontent.com --client-id-list sts.amazonaws.com",
    `aws iam create-role --role-name ${deployRoleName} --assume-role-policy-document ${fileUri(fileFor("githubDeployTrust"))}`,
    `aws iam put-role-policy --role-name ${deployRoleName} --policy-name ${deployRoleName}-policy --policy-document ${fileUri(fileFor("githubDeployPolicy"))}`,
    `aws iam create-role --role-name ${cfnRoleName} --assume-role-policy-document ${fileUri(fileFor("cloudFormationTrust"))}`,
    `aws iam put-role-policy --role-name ${cfnRoleName} --policy-name ${cfnRoleName}-policy --policy-document ${fileUri(fileFor("cloudFormationPolicy"))}`,
  ];
  const githubSecretCommands = [
    `gh secret set AWS_ROLE_TO_ASSUME --repo ${repo} --env ${githubEnvironment} --body ${shellQuote(deployRoleArn)}`,
    `gh secret set AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN --repo ${repo} --env ${githubEnvironment} --body ${shellQuote(cfnRoleArn)}`,
  ];
  const nextSteps = [
    write
      ? "Run the AWS commands from an administrator-authenticated shell, skipping the OIDC provider create command if the provider already exists."
      : "Re-run with `--write=true` to create the rendered IAM JSON files.",
    "Run the GitHub secret commands after the AWS roles exist.",
    `Run \`yarn installer:aws-preflight -- --environment=${environment} --account-id=${accountId} --cloudformation-execution-role-arn=${cfnRoleArn} --output=markdown\`.`,
  ];

  const result = {
    ok: true,
    write,
    accountId,
    region,
    repo,
    githubEnvironment,
    projectName,
    environment,
    roleNames: {
      deployRoleName,
      cfnRoleName,
    },
    roleArns: {
      deployRoleArn,
      cfnRoleArn,
    },
    outputDir: relativeToRoot(outputDir),
    files: rendered.map(({ label, path: filePath, exists: fileExists, written }) => ({
      label,
      path: filePath,
      exists: fileExists,
      written,
    })),
    awsCommands,
    githubSecretCommands,
    nextSteps,
  };

  if (outputMode === "json") {
    printJson(result);
  } else if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(renderMarkdown(result));
  } else {
    console.log(`AWS IAM role setup: ${environment}`);
    result.awsCommands.forEach((command) => console.log(command));
    result.githubSecretCommands.forEach((command) => console.log(command));
  }
}

main();
