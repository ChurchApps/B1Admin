import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  boolArg,
  explainFailure,
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

function runAws(args) {
  const result = spawnSync("aws", args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function applyRole(roleName, trustPath, policyPath, actions) {
  const create = runAws(["iam", "create-role", "--role-name", roleName, "--assume-role-policy-document", fileUri(trustPath)]);
  if (create.ok) {
    actions.push({ ok: true, label: `Created role ${roleName}` });
  } else if (/EntityAlreadyExists/.test(create.stderr)) {
    const update = runAws(["iam", "update-assume-role-policy", "--role-name", roleName, "--policy-document", fileUri(trustPath)]);
    if (!update.ok) {
      actions.push({ ok: false, label: `Could not update trust policy for existing role ${roleName}`, detail: update.stderr.trim() });
      return false;
    }
    actions.push({ ok: true, label: `Role ${roleName} already existed; refreshed its trust policy` });
  } else {
    actions.push({ ok: false, label: `Could not create role ${roleName}`, detail: create.stderr.trim() });
    return false;
  }

  const putPolicy = runAws(["iam", "put-role-policy", "--role-name", roleName, "--policy-name", `${roleName}-policy`, "--policy-document", fileUri(policyPath)]);
  if (!putPolicy.ok) {
    actions.push({ ok: false, label: `Could not attach permissions to role ${roleName}`, detail: putPolicy.stderr.trim() });
    return false;
  }
  actions.push({ ok: true, label: `Attached permissions policy to ${roleName}` });
  return true;
}

function applyOidcProvider(actions) {
  const list = runAws(["iam", "list-open-id-connect-providers", "--output", "json"]);
  if (list.ok) {
    try {
      const providers = JSON.parse(list.stdout)?.OpenIDConnectProviderList || [];
      if (providers.some((provider) => String(provider.Arn || "").endsWith("/token.actions.githubusercontent.com"))) {
        actions.push({ ok: true, label: "GitHub OIDC provider already exists" });
        return true;
      }
    } catch {
      // fall through to create
    }
  }

  const create = runAws(["iam", "create-open-id-connect-provider", "--url", "https://token.actions.githubusercontent.com", "--client-id-list", "sts.amazonaws.com"]);
  if (create.ok || /EntityAlreadyExists/.test(create.stderr)) {
    actions.push({ ok: true, label: "GitHub OIDC provider is in place" });
    return true;
  }
  actions.push({ ok: false, label: "Could not create the GitHub OIDC provider", detail: create.stderr.trim() });
  return false;
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

  if (result.applied) {
    lines.push("", "## AWS Apply Results", "");
    result.applied.actions.forEach((action) => {
      lines.push(`- ${action.ok ? "OK" : "FAILED"}: ${action.label}${action.detail ? ` - ${action.detail}` : ""}`);
    });
  }

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
  const apply = boolArg("apply", false);

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

  if (apply && rendered.some((file) => !fs.existsSync(file.targetPath))) {
    failText("The IAM role files have not been written yet. Re-run with `--write=true` (or `--write=true --apply=true`) first.", outputMode);
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
  let applied = null;
  if (apply) {
    const filePathFor = (key) => rendered.find((file) => file.key === key).targetPath;
    const actions = [];
    const oidcOk = applyOidcProvider(actions);
    const deployOk = oidcOk && applyRole(deployRoleName, filePathFor("githubDeployTrust"), filePathFor("githubDeployPolicy"), actions);
    const cfnOk = deployOk && applyRole(cfnRoleName, filePathFor("cloudFormationTrust"), filePathFor("cloudFormationPolicy"), actions);
    applied = {
      ok: oidcOk && deployOk && cfnOk,
      appliedAt: new Date().toISOString(),
      accountId,
      environment,
      roleArns: { deployRoleArn, cfnRoleArn },
      actions,
    };
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, "apply-result.json"), `${JSON.stringify(applied, null, 2)}\n`);
  }

  const nextSteps = [];
  if (applied?.ok) {
    nextSteps.push("The AWS roles exist. The installer will confirm the GitHub secrets in the GitHub setup step.");
  } else if (apply) {
    const failureDetail = applied.actions.filter((action) => !action.ok).map((action) => action.detail || "").join("\n");
    const hint = explainFailure(failureDetail);
    nextSteps.push(hint || "Fix the AWS problem shown above and re-run this command, or send `aws-admin-handoff.md` to whoever manages your AWS account.");
  } else {
    nextSteps.push(
      write
        ? "Run `--apply=true` to create the roles with your own AWS sign-in, or have an AWS administrator run the AWS commands from `aws-admin-handoff.md`."
        : "Re-run with `--write=true` to create the rendered IAM JSON files.",
    );
    nextSteps.push("Run the GitHub secret commands after the AWS roles exist.");
  }
  nextSteps.push(`Run \`yarn installer:aws-preflight -- --environment=${environment} --account-id=${accountId} --cloudformation-execution-role-arn=${cfnRoleArn} --output=markdown\`.`);

  const result = {
    ok: apply ? Boolean(applied?.ok) : true,
    write,
    apply,
    applied,
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

  if (!result.ok) process.exit(1);
}

main();
