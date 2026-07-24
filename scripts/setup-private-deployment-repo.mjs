import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const environmentFiles = [
  "bootstrap-parameters.json",
  "backend-parameters.json",
  "frontend-parameters.json",
  "app-config-secret.template.json",
  "deploy-split-stack.sh",
];

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

function copyPlanEntry(sourcePath, targetPath) {
  return {
    source: path.relative(rootDir, sourcePath),
    target: targetPath,
    exists: fs.existsSync(targetPath),
  };
}

function writeFileFromSource(entry, options) {
  if (entry.exists && !options.force) return false;
  fs.mkdirSync(path.dirname(entry.target), { recursive: true });
  fs.copyFileSync(path.join(rootDir, entry.source), entry.target);
  return true;
}

function buildReadme({ deployRepoName, deployRepoDirArg, b1adminRepo, apiRepo }) {
  const deployEnvDirArg = path.join(deployRepoDirArg, "environments");
  const customerFileArg = path.join(deployRepoDirArg, "customer-values.json");
  const safeAddCommand = "git add README.md .gitignore .github/workflows/deploy-aws-self-hosted.yml customer-values.sample.json environments";

  return `# ${deployRepoName}

Private deployment workspace for B1Admin.

This repository holds the workflow and environment parameter files for this AWS install.

It should not contain application source changes, live app-config secret files, bootstrap-admin secret files, or committed deployment evidence.

## Start

Run setup and deploy commands from a sibling B1Admin checkout:

\`\`\`bash
export DEPLOY_REPO=<owner>/<private-deploy-repo>
export DEPLOY_ENV_DIR=${deployEnvDirArg}

yarn installer:init -- --deploy-repo-dir=${deployRepoDirArg} --output=markdown
yarn installer:customer-values -- --customer-file=${customerFileArg} --write=true --output=markdown

# Smallest AWS footprint: deploy prod first and skip staging.
yarn installer:run -- --deploy-repo-dir=${deployRepoDirArg} --deploy-env-dir=${deployEnvDirArg} --deployment-root=${path.join(deployRepoDirArg, "deployment")} --customer-file=${customerFileArg} --environment=prod --output=markdown

# Optional practice deployment: run staging first, then prod after staging is verified.
yarn installer:run -- --deploy-repo-dir=${deployRepoDirArg} --deploy-env-dir=${deployEnvDirArg} --deployment-root=${path.join(deployRepoDirArg, "deployment")} --customer-file=${customerFileArg} --environment=staging --output=markdown
\`\`\`

Run \`installer:customer-values\` when the installer asks for customer setup information. It asks plain questions and writes \`customer-values.json\` for you. Then run \`installer:run\`; it keeps moving through the installer and pauses before approval steps.

Do not commit \`customer-values.json\`, \`app-config-secret.json\`, \`bootstrap-admin-secret.json\`, or \`deployment/\`.
\`deployment/\` is an ignored local folder where the installer stores downloaded workflow evidence, browser-smoke results, and the final report on the operator machine.

Safe first commit from this private repo:

\`\`\`bash
${safeAddCommand}
git commit -m "Add B1Admin deployment scaffold"
git push
\`\`\`

The workflow defaults to:

- B1Admin source: \`${b1adminRepo}\`
- Api source: \`${apiRepo}\`

Do not copy the Api source into this private deployment repository. The workflow checks out the Api source repository during deployment using read-only access. Use a private Api fork or mirror only if your organization intentionally maintains customized backend code.

Use the B1Admin \`infrastructure/environments/start-here.md\` guide for the full rollout. Staging is optional because it creates a second AWS stack and costs money while it is running. Use \`yarn installer:doctor -- --repo="$DEPLOY_REPO" --deploy-env-dir="$DEPLOY_ENV_DIR" --output=markdown\` only when the guided next step does not explain the problem.

## Update Later

When B1Admin source code changes and you want to update this AWS install, run this from the sibling B1Admin checkout:

\`\`\`bash
yarn installer:update -- --deploy-repo-dir=${deployRepoDirArg} --deploy-env-dir=${deployEnvDirArg} --deployment-root=${path.join(deployRepoDirArg, "deployment")} --customer-file=${customerFileArg} --environment=prod --output=markdown
\`\`\`

This is a guided update command, not a zero-downtime guarantee. For production with active users, verify staging first when available and run prod updates during an approved low-traffic or maintenance window.
`;
}

function renderMarkdown(result) {
  const lines = [
    "# Private Deployment Repo Setup",
    "",
    `- Status: ${result.ok ? "ready" : "needs attention"}`,
    `- Mode: ${result.write ? "write" : "preview"}`,
    `- Target: \`${result.deployRepoDir}\``,
    `- Files planned: ${result.plannedCount}`,
    `- Files ${result.write ? "written" : "that would be written"}: ${result.write ? result.writtenCount : result.writableCount}`,
    `- Existing files skipped: ${result.skippedCount}`,
  ];

  if (result.skipped.length > 0) {
    lines.push("", "## Existing Files Skipped", "");
    result.skipped.forEach((fileName) => lines.push(`- \`${fileName}\``));
  }

  lines.push("", "## Next Steps", "");
  result.nextSteps.forEach((line) => lines.push(`- ${line}`));

  if (result.safeCommitCommands.length > 0) {
    lines.push("", "## Safe Commit Commands", "", "Run these after reviewing the private deployment repo:", "");
    lines.push("```bash");
    result.safeCommitCommands.forEach((line) => lines.push(line));
    lines.push("```");
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const deployRepoDirArg = getArg("deploy-repo-dir", "../b1admin-deploy");
  const deployRepoDir = path.resolve(rootDir, deployRepoDirArg);
  const deployRepoName = path.basename(deployRepoDir);
  const write = getArg("write", "false").toLowerCase() === "true";
  const force = getArg("force", "false").toLowerCase() === "true";
  const outputMode = getArg("output", "text").toLowerCase();
  const b1adminRepo = getArg("b1admin-repo", "ChurchApps/B1Admin");
  const apiRepo = getArg("api-repo", "ChurchApps/Api");

  const entries = [
    copyPlanEntry(
      path.join(rootDir, "infrastructure", "environments", "private-deployment-workflow.sample.yml"),
      path.join(deployRepoDir, ".github", "workflows", "deploy-aws-self-hosted.yml"),
    ),
    copyPlanEntry(
      path.join(rootDir, "infrastructure", "environments", "private-deployment-gitignore.sample"),
      path.join(deployRepoDir, ".gitignore"),
    ),
    copyPlanEntry(
      path.join(rootDir, "infrastructure", "environments", "customer-values.sample.json"),
      path.join(deployRepoDir, "customer-values.sample.json"),
    ),
    ...["staging", "prod"].flatMap((environment) => environmentFiles.map((fileName) => copyPlanEntry(
      path.join(rootDir, "infrastructure", "environments", environment, fileName),
      path.join(deployRepoDir, "environments", environment, fileName),
    ))),
  ];

  const readmePath = path.join(deployRepoDir, "README.md");
  const readmeEntry = {
    source: "<generated>",
    target: readmePath,
    exists: fs.existsSync(readmePath),
  };

  const planned = [...entries, readmeEntry];
  const skipped = planned.filter((entry) => entry.exists && !force);
  const writable = planned.filter((entry) => !entry.exists || force);
  const written = [];

  if (write) {
    entries.forEach((entry) => {
      if (writeFileFromSource(entry, { force })) written.push(entry.target);
    });

    if (!readmeEntry.exists || force) {
      fs.mkdirSync(path.dirname(readmePath), { recursive: true });
      fs.writeFileSync(readmePath, buildReadme({ deployRepoName, deployRepoDirArg, b1adminRepo, apiRepo }));
      written.push(readmePath);
    }
  }

  const result = {
    ok: skipped.length === 0 || force || !write,
    write,
    force,
    deployRepoDir,
    plannedCount: planned.length,
    writableCount: writable.length,
    skippedCount: skipped.length,
    writtenCount: written.length,
    planned: planned.map((entry) => ({
      source: entry.source,
      target: path.relative(rootDir, entry.target),
      exists: entry.exists,
      action: entry.exists && !force ? "skip-existing" : write ? "write" : "would-write",
    })),
    skipped: skipped.map((entry) => path.relative(rootDir, entry.target)),
    written: written.map((filePath) => path.relative(rootDir, filePath)),
    safeCommitCommands: [
      `cd ${path.relative(rootDir, deployRepoDir) || "."}`,
      "git status --short --ignored",
      "git add README.md .gitignore .github/workflows/deploy-aws-self-hosted.yml customer-values.sample.json environments",
      'git commit -m "Add B1Admin deployment scaffold"',
      "git push",
    ],
    nextSteps: [
      write
        ? `Review ${path.relative(rootDir, deployRepoDir)} and commit only the scaffolded private deployment files shown below.`
        : skipped.length > 0 && writable.length === 0
          ? "All planned files already exist. Re-run with --force=true only if you intentionally want to replace them."
          : "Re-run with --write=true to create the private deployment repo scaffold.",
      `Choose the first environment: prod to keep the AWS footprint smaller, or staging for an optional practice deployment.`,
      `Run yarn installer:configure -- --environment=prod --environment-dir=${path.relative(rootDir, path.join(deployRepoDir, "environments", "prod"))} --account-id=<aws-account-id> --root-domain=<your-domain> --support-phone=<support-phone> --output=markdown`,
      "Create the aws-prod GitHub Environment and add the deployment secrets described in start-here.md. Create aws-staging only if you choose the optional staging deployment.",
    ],
  };

  if (outputMode === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(result.ok ? 0 : 1);
  }

  if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(renderMarkdown(result));
    process.exit(result.ok ? 0 : 1);
  }

  console.log(`Private deployment repo setup: ${write ? "write" : "dry-run"}`);
  console.log(`Target: ${deployRepoDir}`);
  console.log(`Files planned: ${result.plannedCount}`);
  console.log(`Files ${write ? "written" : "that would be written"}: ${write ? result.writtenCount : result.writableCount}`);
  if (skipped.length > 0) {
    console.log(`Existing files skipped: ${skipped.length}`);
    skipped.forEach((filePath) => console.log(`- ${path.relative(rootDir, filePath.target)}`));
  }
  console.log("\nNext steps:");
  result.nextSteps.forEach((line) => console.log(`- ${line}`));

  process.exit(result.ok ? 0 : 1);
}

main();
