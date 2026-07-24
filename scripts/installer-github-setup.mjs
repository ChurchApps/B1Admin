import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  boolArg,
  failText,
  getArg,
  inferDeployRepo,
  printJson,
  relativeToRoot,
  rootDir,
} from "./installer-common.mjs";

function runGh(args, options = {}) {
  return spawnSync("gh", args, {
    cwd: rootDir,
    encoding: "utf8",
    input: options.input,
    maxBuffer: 20 * 1024 * 1024,
  });
}

function splitRepo(repo) {
  const [owner, name] = String(repo || "").split("/");
  return { owner, name };
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function roleValues({ accountId, projectName, environment }) {
  const deployRoleName = `${projectName}-${environment}-github-deploy`;
  const cfnRoleName = `${projectName}-${environment}-cfn-exec`;
  return {
    deployRoleArn: accountId ? `arn:aws:iam::${accountId}:role/${deployRoleName}` : "",
    cfnRoleArn: accountId ? `arn:aws:iam::${accountId}:role/${cfnRoleName}` : "",
  };
}

function environmentSecretFile(deployEnvDir, environment) {
  if (!deployEnvDir) return "";
  return path.resolve(rootDir, deployEnvDir, environment, "app-config-secret.json");
}

function buildSecretPlans(repo, environment, options) {
  const githubEnvironment = `aws-${environment}`;
  const roles = roleValues({
    accountId: options.accountId,
    projectName: options.projectName,
    environment,
  });
  const secretFile = environmentSecretFile(options.deployEnvDir, environment);
  const hasSecretFile = Boolean(secretFile && fs.existsSync(secretFile));
  const appConfigValue = hasSecretFile ? fs.readFileSync(secretFile, "utf8") : "";

  return [
    {
      name: "AWS_ROLE_TO_ASSUME",
      environment,
      githubEnvironment,
      ready: Boolean(roles.deployRoleArn),
      value: roles.deployRoleArn,
      source: roles.deployRoleArn ? "derived role ARN" : "missing account id",
      command: roles.deployRoleArn
        ? `gh secret set AWS_ROLE_TO_ASSUME --repo ${repo} --env ${githubEnvironment} --body ${shellQuote(roles.deployRoleArn)}`
        : `gh secret set AWS_ROLE_TO_ASSUME --repo ${repo} --env ${githubEnvironment} --body '<deploy-role-arn>'`,
    },
    {
      name: "AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN",
      environment,
      githubEnvironment,
      ready: Boolean(roles.cfnRoleArn),
      value: roles.cfnRoleArn,
      source: roles.cfnRoleArn ? "derived role ARN" : "missing account id",
      command: roles.cfnRoleArn
        ? `gh secret set AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN --repo ${repo} --env ${githubEnvironment} --body ${shellQuote(roles.cfnRoleArn)}`
        : `gh secret set AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN --repo ${repo} --env ${githubEnvironment} --body '<cloudformation-execution-role-arn>'`,
    },
    {
      name: "AWS_APP_CONFIG_SECRET_JSON",
      environment,
      githubEnvironment,
      ready: hasSecretFile,
      value: appConfigValue,
      source: hasSecretFile ? relativeToRoot(secretFile) : "missing app-config-secret.json",
      command: hasSecretFile
        ? `gh secret set AWS_APP_CONFIG_SECRET_JSON --repo ${repo} --env ${githubEnvironment} < ${shellQuote(relativeToRoot(secretFile))}`
        : `gh secret set AWS_APP_CONFIG_SECRET_JSON --repo ${repo} --env ${githubEnvironment} < '<path-to-app-config-secret.json>'`,
    },
  ];
}

function writeSecret(repo, secret) {
  const baseArgs = [
    "secret",
    "set",
    secret.name,
    "--repo",
    repo,
    "--env",
    secret.githubEnvironment,
    "--app",
    "actions",
  ];

  if (secret.name === "AWS_APP_CONFIG_SECRET_JSON") {
    return runGh(baseArgs, { input: secret.value });
  }

  return runGh([...baseArgs, "--body", secret.value]);
}

function renderMarkdown(result) {
  const lines = [
    "# Installer GitHub Setup",
    "",
    `- Status: ${result.ok ? "ok" : "needs attention"}`,
    `- Environment mode: ${result.write ? "write" : "preview"}`,
    `- Secret mode: ${result.writeSecrets ? "write" : "preview"}`,
    `- Repository: \`${result.repo || "<missing>"}\``,
    `- AWS account: \`${result.accountId || "<not set>"}\``,
    `- Deploy env dir: \`${result.deployEnvDir || "<not set>"}\``,
    "",
    "## GitHub Environments",
    "",
  ];

  result.environments.forEach((environment) => {
    lines.push(`- ${environment.name}: ${environment.ok ? environment.action : environment.error}`);
  });

  lines.push("", "## Required Secret Plan", "");
  result.secretPlans.forEach((secret) => {
    lines.push(`- ${secret.ready ? "[x]" : "[ ]"} ${secret.githubEnvironment} / ${secret.name}: ${secret.source}`);
    lines.push(`  \`${secret.command}\``);
  });

  if (result.secretResults.length > 0) {
    lines.push("", "## Secret Write Results", "");
    result.secretResults.forEach((secret) => {
      lines.push(`- ${secret.ok ? "[x]" : "[ ]"} ${secret.environment} / ${secret.name}: ${secret.ok ? secret.action : secret.error}`);
    });
  }

  if (result.optionalSecretCommands.length > 0) {
    lines.push("", "## Optional Source Repo Tokens", "");
    result.optionalSecretCommands.forEach((command) => lines.push(`- \`${command}\``));
  }

  if (result.nextSteps.length > 0) {
    lines.push("", "## Next Steps", "");
    result.nextSteps.forEach((step) => lines.push(`- ${step}`));
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const outputMode = getArg("output", "text").toLowerCase();
  const repo = inferDeployRepo(getArg("repo"));
  const write = boolArg("write", false);
  const writeSecrets = boolArg("write-secrets", false);
  const includeCheckoutTokenCommands = boolArg("include-checkout-token-commands", true);
  const accountId = getArg("account-id", process.env.AWS_ACCOUNT_ID || "");
  const projectName = getArg("project-name", "b1admin");
  const deployEnvDir = getArg("deploy-env-dir", process.env.DEPLOY_ENV_DIR || "");
  const requestedEnvironment = getArg("environment", "all").toLowerCase();
  const environments = requestedEnvironment === "all" || requestedEnvironment === ""
    ? ["staging", "prod"]
    : [requestedEnvironment];

  if (!["all", "staging", "prod", ""].includes(requestedEnvironment)) {
    failText("--environment must be staging, prod, or all.", outputMode);
  }

  if (!repo) {
    failText("DEPLOY_REPO or --repo is required.", outputMode);
  }

  const { owner, name } = splitRepo(repo);
  if (!owner || !name) {
    failText(`Repository must use owner/name format: ${repo}`, outputMode);
  }

  const environmentResults = environments.map((environment) => {
    const ghEnvironmentName = `aws-${environment}`;
    if (!write) {
      return { name: ghEnvironmentName, ok: true, action: "would create or update" };
    }

    const result = runGh([
      "api",
      "-X",
      "PUT",
      `repos/${owner}/${name}/environments/${ghEnvironmentName}`,
    ]);

    if (result.status !== 0) {
      return {
        name: ghEnvironmentName,
        ok: false,
        action: "failed",
        error: result.stderr.trim() || result.stdout.trim() || `gh api failed for ${ghEnvironmentName}`,
      };
    }

    return { name: ghEnvironmentName, ok: true, action: "created or updated" };
  });

  const secretPlans = environments.flatMap((environment) => buildSecretPlans(repo, environment, {
    accountId,
    projectName,
    deployEnvDir,
  }));
  const secretResults = [];

  if (writeSecrets) {
    secretPlans.forEach((secret) => {
      if (!secret.ready) {
        secretResults.push({
          name: secret.name,
          environment: secret.githubEnvironment,
          ok: false,
          action: "missing value",
          error: secret.name === "AWS_APP_CONFIG_SECRET_JSON"
            ? `Missing app-config secret file for ${secret.environment}. Run installer:app-config-secret first.`
            : "Missing AWS account id. Pass --account-id or set AWS_ACCOUNT_ID.",
        });
        return;
      }

      const run = writeSecret(repo, secret);
      if (run.status !== 0) {
        secretResults.push({
          name: secret.name,
          environment: secret.githubEnvironment,
          ok: false,
          action: "failed",
          error: run.stderr.trim() || run.stdout.trim() || "gh secret set failed",
        });
        return;
      }

      secretResults.push({
        name: secret.name,
        environment: secret.githubEnvironment,
        ok: true,
        action: "stored",
      });
    });
  }

  const optionalSecretCommands = includeCheckoutTokenCommands
    ? [
      `gh secret set B1ADMIN_REPO_CHECKOUT_TOKEN --repo ${repo} --env aws-staging --body '<read-only-token-if-needed>'`,
      `gh secret set B1ADMIN_REPO_CHECKOUT_TOKEN --repo ${repo} --env aws-prod --body '<read-only-token-if-needed>'`,
      `gh secret set API_REPO_CHECKOUT_TOKEN --repo ${repo} --env aws-staging --body '<read-only-token-if-needed>'`,
      `gh secret set API_REPO_CHECKOUT_TOKEN --repo ${repo} --env aws-prod --body '<read-only-token-if-needed>'`,
    ]
    : [];

  const publicSecretPlans = secretPlans.map(({ value, ...secret }) => secret);
  const result = {
    ok: environmentResults.every((entry) => entry.ok) && secretResults.every((entry) => entry.ok !== false),
    write,
    writeSecrets,
    repo,
    accountId,
    deployEnvDir: deployEnvDir || null,
    environments: environmentResults,
    secretPlans: publicSecretPlans,
    secretResults,
    secretCommands: publicSecretPlans.map((secret) => secret.command),
    optionalSecretCommands,
    nextSteps: [
      writeSecrets ? "Review the stored secret results above." : "Run with `--write-secrets=true` after role ARNs and app-config files are ready, or run the printed secret commands manually.",
      "Use different app-config JSON values for staging and prod.",
      "Run installer:preflight after the environments and secrets are in place.",
    ],
  };

  if (outputMode === "json") {
    printJson(result);
  } else if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(renderMarkdown(result));
  } else {
    console.log(`Installer GitHub setup: ${write ? "write" : "preview"}`);
    console.log(`Repository: ${repo}`);
    environmentResults.forEach((environment) => {
      console.log(`[${environment.ok ? "OK" : "FAIL"}] ${environment.name}: ${environment.ok ? environment.action : environment.error}`);
    });
    console.log("");
    [...result.secretCommands, ...optionalSecretCommands].forEach((command) => console.log(command));
  }

  process.exit(result.ok ? 0 : 1);
}

main();
