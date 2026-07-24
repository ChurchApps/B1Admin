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

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function renderMarkdown(result) {
  const lines = [
    "# B1Admin Installer Init",
    "",
    `- Status: ${result.ok ? "ready" : "needs attention"}`,
    `- Private deploy repo dir: \`${result.deployRepoDir}\``,
    `- Customer file: \`${result.customerFile}\``,
    "",
    "## Actions",
    "",
  ];

  result.actions.forEach((action) => {
    lines.push(`- ${action.ok ? "OK" : "TODO"}: ${action.label} - ${action.detail}`);
  });

  lines.push(
    "",
    "## Next Command",
    "",
    `\`\`\`bash\n${result.nextCommand}\n\`\`\``,
  );

  if (result.notes.length > 0) {
    lines.push("", "## Notes", "");
    result.notes.forEach((note) => lines.push(`- ${note}`));
  }

  if (result.safeCommitCommands.length > 0) {
    lines.push("", "## Safe Commit Commands", "", "After reviewing the private deployment repo, run:", "");
    lines.push("```bash");
    result.safeCommitCommands.forEach((line) => lines.push(line));
    lines.push("```");
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const outputMode = getArg("output", "text").toLowerCase();
  const deployRepoDirArg = getArg("deploy-repo-dir", "../b1admin-deploy");
  const deployRepoDir = path.resolve(rootDir, deployRepoDirArg);
  const deployEnvDirArg = getArg("deploy-env-dir", path.join(deployRepoDirArg, "environments"));
  const deploymentRootArg = getArg("deployment-root", path.join(deployRepoDirArg, "deployment"));
  const customerFileArg = getArg("customer-file", path.join(deployRepoDirArg, "customer-values.json"));
  const customerFile = path.resolve(rootDir, customerFileArg);
  const sampleCustomerFile = path.join(deployRepoDir, "customer-values.sample.json");
  const write = boolArg("write", true);
  const force = boolArg("force", false);
  const actions = [];
  const notes = [];

  const setupArgs = [
    `--deploy-repo-dir=${deployRepoDirArg}`,
    `--write=${write ? "true" : "false"}`,
    `--force=${force ? "true" : "false"}`,
    "--output=json",
  ];
  const setup = runNodeJson("scripts/setup-private-deployment-repo.mjs", setupArgs);
  const scaffoldReady = fileExists(path.join(deployRepoDir, ".github", "workflows", "deploy-aws-self-hosted.yml"))
    && fileExists(path.join(deployRepoDir, "environments", "staging", "backend-parameters.json"))
    && fileExists(path.join(deployRepoDir, "environments", "prod", "backend-parameters.json"));

  actions.push({
    ok: setup.ok || scaffoldReady,
    label: "Private deployment scaffold",
    detail: setup.ok
      ? write ? "scaffold created or refreshed" : "scaffold preview completed"
      : scaffoldReady ? "existing scaffold found" : setup.stderr.trim() || "scaffold could not be created",
  });

  if (!setup.ok && scaffoldReady) {
    notes.push("Existing scaffold files were kept. Use --force=true only when you intentionally want to replace scaffold files.");
  }

  let customerFileCreated = false;
  if (write && !fileExists(customerFile) && fileExists(sampleCustomerFile)) {
    fs.mkdirSync(path.dirname(customerFile), { recursive: true });
    fs.copyFileSync(sampleCustomerFile, customerFile);
    customerFileCreated = true;
  }

  actions.push({
    ok: fileExists(customerFile),
    label: "Customer values file",
    detail: fileExists(customerFile)
      ? customerFileCreated ? "created from sample" : "already exists and was not overwritten"
      : "copy customer-values.sample.json to customer-values.json",
  });

  const nextCommand = fileExists(customerFile)
    ? `# Answer the setup questions first. This writes ${relativeToRoot(customerFile)} for you.
yarn installer:customer-values -- --customer-file=${relativeToRoot(customerFile)} --write=true --output=markdown

# Then choose one path.
# Smallest AWS footprint: deploy prod first and skip staging.
yarn installer:run -- --deploy-repo-dir=${deployRepoDirArg} --deploy-env-dir=${deployEnvDirArg} --deployment-root=${deploymentRootArg} --customer-file=${relativeToRoot(customerFile)} --environment=prod --output=markdown

# Optional practice deployment: run staging first, then prod after staging is verified.
yarn installer:run -- --deploy-repo-dir=${deployRepoDirArg} --deploy-env-dir=${deployEnvDirArg} --deployment-root=${deploymentRootArg} --customer-file=${relativeToRoot(customerFile)} --environment=staging --output=markdown`
    : `cp ${relativeToRoot(sampleCustomerFile)} ${relativeToRoot(customerFile)}`;

  const result = {
    ok: actions.every((action) => action.ok),
    write,
    force,
    deployRepoDir: relativeToRoot(deployRepoDir),
    deployEnvDir: relativeToRoot(path.resolve(rootDir, deployEnvDirArg)),
    deploymentRoot: relativeToRoot(path.resolve(rootDir, deploymentRootArg)),
    customerFile: relativeToRoot(customerFile),
    actions,
    nextCommand,
    safeCommitCommands: setup.parsed?.safeCommitCommands || [],
    notes: [
      ...notes,
      "Do not commit customer-values.json, app-config-secret.json, bootstrap-admin-secret.json, or deployment/.",
      "Run installer:run to continue the guided deployment.",
    ],
  };

  if (outputMode === "json") {
    printJson(result);
  } else if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(renderMarkdown(result));
  } else {
    console.log(`B1Admin installer init: ${result.ok ? "ready" : "needs attention"}`);
    console.log(nextCommand);
  }

  process.exit(result.ok ? 0 : 1);
}

main();
