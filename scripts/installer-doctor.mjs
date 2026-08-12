import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  getArg,
  inferDeployRepo,
  printJson,
  relativeToRoot,
  resolveEnvironmentDir,
  rootDir,
} from "./installer-common.mjs";

function commandExists(command) {
  const result = spawnSync("command", ["-v", command], {
    shell: true,
    encoding: "utf8",
  });
  return result.status === 0;
}

function checkFile(filePath, label) {
  return {
    label,
    path: relativeToRoot(filePath),
    ok: fs.existsSync(filePath),
  };
}

function buildEnvironmentChecks(environment, environmentDir) {
  return {
    environment,
    environmentDir: relativeToRoot(environmentDir),
    files: [
      checkFile(path.join(environmentDir, "bootstrap-parameters.json"), "bootstrap parameters"),
      checkFile(path.join(environmentDir, "backend-parameters.json"), "backend parameters"),
      checkFile(path.join(environmentDir, "frontend-parameters.json"), "frontend parameters"),
      checkFile(path.join(environmentDir, "app-config-secret.template.json"), "app config secret template"),
      checkFile(path.join(environmentDir, "deploy-split-stack.sh"), "split-stack deploy script"),
    ],
  };
}

function statusFromChecks(checks) {
  const failed = checks.filter((check) => !check.ok);
  return {
    ok: failed.length === 0,
    failed,
  };
}

function renderMarkdown(result) {
  const lines = [
    "# B1Admin Installer Doctor",
    "",
    `- Status: ${result.ok ? "ready for the next setup step" : "needs attention"}`,
    `- B1Admin checkout: \`${result.rootDir}\``,
    `- Private deploy repo: \`${result.deployRepo || "<not set>"}\``,
    "",
    "## Local Tools",
    "",
  ];

  result.tools.forEach((tool) => {
    lines.push(`- ${tool.ok ? "[x]" : "[ ]"} \`${tool.name}\``);
  });

  lines.push("", "## Setup Values", "");
  result.environmentVariables.forEach((entry) => {
    lines.push(`- ${entry.ok ? "[x]" : "[ ]"} \`${entry.name}\`: \`${entry.value}\``);
  });

  lines.push("", "## B1Admin Dependencies", "");
  result.dependencies.forEach((entry) => {
    lines.push(`- ${entry.ok ? "[x]" : "[ ]"} ${entry.label}: \`${entry.path}\``);
  });

  lines.push("", "## Private Deployment Files", "");
  result.deployRepoFiles.forEach((entry) => {
    lines.push(`- ${entry.ok ? "[x]" : "[ ]"} ${entry.label}: \`${entry.path}\``);
  });

  result.environments.forEach((environment) => {
    lines.push("", `## ${environment.environment} Files`, "");
    environment.files.forEach((entry) => {
      lines.push(`- ${entry.ok ? "[x]" : "[ ]"} ${entry.label}: \`${entry.path}\``);
    });
  });

  if (result.nextSteps.length > 0) {
    lines.push("", "## Next Steps", "");
    result.nextSteps.forEach((step) => lines.push(`- ${step}`));
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const outputMode = getArg("output", "text").toLowerCase();
  const deployRepo = inferDeployRepo(getArg("repo"));
  const deployRepoDir = path.resolve(rootDir, getArg("deploy-repo-dir", "../b1admin-deploy"));
  const deployEnvDir = path.resolve(rootDir, getArg("deploy-env-dir", process.env.DEPLOY_ENV_DIR || path.join(deployRepoDir, "environments")));
  const stagingDir = resolveEnvironmentDir("staging", getArg("staging-dir", path.join(deployEnvDir, "staging")));
  const prodDir = resolveEnvironmentDir("prod", getArg("prod-dir", path.join(deployEnvDir, "prod")));

  const tools = ["node", "npm", "yarn", "git", "gh", "aws"].map((name) => ({
    name,
    ok: commandExists(name),
  }));

  const awsRegionValue = getArg("region", process.env.AWS_REGION || "");
  const awsAccountIdValue = getArg("account-id", process.env.AWS_ACCOUNT_ID || "");
  const environmentVariables = [
    {
      name: "AWS region",
      ok: awsRegionValue.trim() !== "",
      value: awsRegionValue.trim() !== "" ? awsRegionValue : "<not set>",
    },
    {
      name: "AWS account ID",
      ok: awsAccountIdValue.trim() !== "",
      value: awsAccountIdValue.trim() !== "" ? awsAccountIdValue : "<not set>",
    },
    {
      name: "Private deploy repo",
      ok: deployRepo.trim() !== "",
      value: deployRepo.trim() !== "" ? deployRepo : "<not set>",
    },
    {
      name: "DEPLOY_ENV_DIR",
      ok: deployEnvDir.trim() !== "",
      value: relativeToRoot(deployEnvDir),
    },
  ];

  const dependencies = [
    checkFile(path.join(rootDir, "node_modules"), "node_modules directory"),
    checkFile(path.join(rootDir, "node_modules", "vite", "dist", "node", "cli.js"), "Vite CLI dependency"),
  ];

  const deployRepoFiles = [
    checkFile(path.join(deployRepoDir, ".github", "workflows", "deploy-aws-self-hosted.yml"), "GitHub Actions workflow"),
    checkFile(path.join(deployRepoDir, ".gitignore"), "private repo .gitignore"),
    checkFile(path.join(deployRepoDir, "README.md"), "private repo README"),
  ];

  const environments = [
    buildEnvironmentChecks("staging", stagingDir),
    buildEnvironmentChecks("prod", prodDir),
  ];

  const groupedChecks = [
    ...tools,
    ...environmentVariables,
    ...dependencies,
    ...deployRepoFiles,
    ...environments.flatMap((environment) => environment.files),
  ];
  const status = statusFromChecks(groupedChecks);
  const nextSteps = [];

  if (!dependencies.every((entry) => entry.ok)) {
    nextSteps.push("Run `yarn install` from the B1Admin checkout.");
  }
  if (!deployRepoFiles.every((entry) => entry.ok) || environments.some((environment) => environment.files.some((entry) => !entry.ok))) {
    nextSteps.push("Run `yarn installer:init -- --deploy-repo-dir=../b1admin-deploy --output=markdown`.");
  }
  if (!deployRepo) {
    nextSteps.push("Run `yarn installer:customer-values` and answer the private repository question.");
  }
  if (!awsAccountIdValue.trim()) {
    nextSteps.push("Run `yarn installer:customer-values` and answer the AWS account ID question.");
  }
  if (!awsRegionValue.trim()) {
    nextSteps.push("Run `yarn installer:customer-values` and answer the AWS region question. `us-east-1` is the normal choice.");
  }
  if (!tools.find((tool) => tool.name === "yarn")?.ok) {
    nextSteps.push("Enable Yarn by running `corepack enable` (Node.js 20+ includes Corepack), then open a new terminal.");
  }
  if (!tools.find((tool) => tool.name === "gh")?.ok) {
    nextSteps.push("Install GitHub CLI or use the GitHub web UI for environment/secrets/workflow steps.");
  }
  if (!tools.find((tool) => tool.name === "aws")?.ok) {
    nextSteps.push("Install AWS CLI if you want local preflight, verify, or reset commands.");
  }

  const result = {
    ok: status.ok,
    rootDir,
    deployRepo,
    deployRepoDir,
    deployEnvDir,
    tools,
    environmentVariables,
    dependencies,
    deployRepoFiles,
    environments,
    nextSteps,
  };

  if (outputMode === "json") {
    printJson(result);
    process.exit(result.ok ? 0 : 1);
  }

  if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(renderMarkdown(result));
    process.exit(result.ok ? 0 : 1);
  }

  console.log(`B1Admin installer doctor: ${result.ok ? "ready" : "needs attention"}`);
  result.nextSteps.forEach((step) => console.log(`- ${step}`));
  process.exit(result.ok ? 0 : 1);
}

main();
