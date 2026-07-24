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

function exists(filePath) {
  return fs.existsSync(filePath);
}

function status(ok, label, detail, command = "") {
  return { ok, label, detail, command };
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function isPlaceholderValue(name, value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.includes("<") || normalized.includes(">")) return true;
  if (normalized.includes("replace-me") || normalized.includes("replace-with")) return true;
  if (normalized.includes("your-")) return true;

  const placeholders = {
    "account-id": new Set(["123456789012", "000000000000"]),
    repo: new Set(["your-org/b1admin-deploy", "owner/repo", "example/b1admin-deploy"]),
    "root-domain": new Set(["example.com", "customer.test"]),
    "support-email": new Set(["support@example.com", "admin@example.com"]),
    "support-phone": new Set(["+1-555-555-0100", "555-555-0100", "111-222-3333"]),
    "first-admin-email": new Set(["admin@example.com"]),
    "first-admin-password": new Set(["password", "temporary-password"]),
    "first-church-name": new Set(["example church"]),
  };

  return placeholders[name]?.has(normalized) || false;
}

function hasCustomerValue(name, value) {
  return !isPlaceholderValue(name, value);
}

function defaultDeployRepoDir() {
  return getArg("deploy-repo-dir", "../b1admin-deploy");
}

function defaultDeployEnvDir(deployRepoDirArg) {
  return getArg("deploy-env-dir", path.join(deployRepoDirArg, "environments"));
}

function customerFilePath(deployRepoDirArg) {
  return path.resolve(rootDir, getArg("customer-file", path.join(deployRepoDirArg, "customer-values.json")));
}

function envCommandBase(environment, deployEnvDirArg, customerFile) {
  return `--environment=${environment} --environment-dir=${path.join(deployEnvDirArg, environment)} --customer-file=${relativeToRoot(customerFile)}`;
}

function auditEnvironment(environment, deployEnvDirArg, customerFile) {
  const environmentDirArg = path.join(deployEnvDirArg, environment);
  const audit = runNodeJson("scripts/audit-environment-starter.mjs", [
    `--environment=${environment}`,
    `--environment-dir=${environmentDirArg}`,
    "--only-blockers=true",
    "--output=json",
  ]);
  if (!audit.ok || !audit.parsed) return null;
  return audit.parsed;
}

function renderMarkdown(result) {
  const lines = [
    "# B1Admin Installer Start",
    "",
    `- Environment: \`${result.environment}\``,
    `- Customer file: \`${result.customerFile}\``,
    `- Private deploy repo dir: \`${result.deployRepoDir}\``,
    `- Environment dir root: \`${result.deployEnvDir}\``,
    "",
    "## Next Command",
    "",
    `\`\`\`bash\n${result.nextCommand || "# No next command found."}\n\`\`\``,
    "",
    "## Checklist",
    "",
  ];

  result.checks.forEach((check) => {
    lines.push(`- ${check.ok ? "OK" : "TODO"}: ${check.label} - ${check.detail}`);
  });

  if (result.showAllCommands) {
    lines.push("", "## Command Reference", "");
    result.commands.forEach((command) => lines.push(`- \`${command}\``));
  }

  if (result.notes.length > 0) {
    lines.push("", "## Notes", "");
    result.notes.forEach((note) => lines.push(`- ${note}`));
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const outputMode = getArg("output", "text").toLowerCase();
  const environment = getArg("environment", "prod");
  const showAllCommands = boolArg("show-all-commands", false);
  const deployRepoDirArg = defaultDeployRepoDir();
  const deployEnvDirArg = defaultDeployEnvDir(deployRepoDirArg);
  const deploymentRootArg = getArg("deployment-root", path.join(deployRepoDirArg, "deployment"));
  const deployRepoDir = path.resolve(rootDir, deployRepoDirArg);
  const deployEnvDir = path.resolve(rootDir, deployEnvDirArg);
  const deploymentRoot = path.resolve(rootDir, deploymentRootArg);
  const customerFile = customerFilePath(deployRepoDirArg);
  const repo = getArg("repo");
  const accountId = getArg("account-id");
  const rootDomain = getArg("root-domain");
  const supportPhone = getArg("support-phone");
  const supportEmail = getArg("support-email");
  const firstAdminEmail = getArg("bootstrap-admin-email") || getArg("first-admin-email");
  const firstAdminPassword = getArg("bootstrap-admin-password") || getArg("first-admin-password");
  const firstChurchName = getArg("bootstrap-church-name") || getArg("first-church-name");
  const writeHint = boolArg("write", false) ? " --write=true" : "";
  const envBase = envCommandBase(environment, deployEnvDirArg, customerFile);
  const environmentDir = path.join(deployEnvDir, environment);
  const appConfigSecret = path.join(environmentDir, "app-config-secret.json");
  const workflowFile = path.join(deployRepoDir, ".github", "workflows", "deploy-aws-self-hosted.yml");
  const sampleCustomerFile = path.join(deployRepoDir, "customer-values.sample.json");
  const roleDir = path.join(deployRepoDir, "iam", environment);
  const handoffFile = path.join(deployRepoDir, "aws-admin-handoff.md");
  const evidenceDir = path.join(deploymentRoot, environment);
  const githubReadiness = readJsonIfExists(path.join(evidenceDir, "github-readiness.json"));
  const preflightReadiness = readJsonIfExists(path.join(evidenceDir, "preflight-readiness.json"));
  const previewDispatch = readJsonIfExists(path.join(evidenceDir, "last-preview-dispatch.json"));
  const deployDispatch = readJsonIfExists(path.join(evidenceDir, "last-deploy-dispatch.json"));
  const deploymentSummary = readJsonIfExists(path.join(evidenceDir, "deployment-summary.json"));
  const bootstrapAdmin = readJsonIfExists(path.join(evidenceDir, "bootstrap-admin.json"));
  const browserSmoke = readJsonIfExists(path.join(evidenceDir, "browser-smoke.json"));
  const backendParameters = readJsonIfExists(path.join(environmentDir, "backend-parameters.json"));
  const preflightPlanFile = path.join(evidenceDir, "preflight-plan.md");
  const reportFile = path.join(deploymentRoot, "deployment-report.md");
  const roleFilesExist = exists(roleDir) && fs.readdirSync(roleDir).some((fileName) => fileName.endsWith(".json"));
  const audit = exists(environmentDir) ? auditEnvironment(environment, deployEnvDirArg, customerFile) : null;
  const auditBlockerCount = audit?.blockerSummary?.blockerCount ?? null;

  const commands = {
    editCustomerValues: `yarn installer:customer-values -- --customer-file=${relativeToRoot(customerFile)} --write=true --output=markdown`,
    createCustomerFile: `cp ${relativeToRoot(sampleCustomerFile)} ${relativeToRoot(customerFile)}`,
    installDeps: "yarn install",
    setup: `yarn installer:init -- --deploy-repo-dir=${deployRepoDirArg} --output=markdown`,
    awsHandoff: `yarn installer:aws-handoff -- --customer-file=${relativeToRoot(customerFile)} --deploy-repo-dir=${deployRepoDirArg} --write=true --output=markdown`,
    roles: `yarn installer:aws-roles -- --environment=${environment} --customer-file=${relativeToRoot(customerFile)} --output-dir=${path.join(deployRepoDirArg, "iam", environment)} --write=true --output=markdown`,
    githubEnvironments: `yarn installer:github-setup -- --repo=${repo || "<owner>/<private-deploy-repo>"} --write=true --output=markdown`,
    configurePreview: `yarn installer:configure -- ${envBase} --output=markdown`,
    configureWrite: `yarn installer:configure -- ${envBase}${writeHint || " --write=true"}`,
    appConfig: `yarn installer:app-config-secret -- ${envBase} --write=true --output=markdown`,
    githubSecrets: `yarn installer:github-setup -- --environment=${environment} --customer-file=${relativeToRoot(customerFile)} --deploy-env-dir=${deployEnvDirArg} --write=true --write-secrets=true --output=markdown`,
    githubReadiness: `yarn installer:github-readiness -- --environment=${environment} --repo=${repo || "<owner>/<private-deploy-repo>"} --write=true --output=markdown`,
    preflight: `yarn installer:preflight -- ${envBase} --repo=${repo || "<owner>/<private-deploy-repo>"} --write=true --output=markdown`,
    previewDeploy: `yarn installer:deploy -- ${envBase} --repo=${repo || "<owner>/<private-deploy-repo>"} --deployment-root=${deploymentRootArg} --preview-only=true`,
    observePreview: `yarn installer:observe -- --environment=${environment} --repo=${repo || "<owner>/<private-deploy-repo>"} --deployment-root=${deploymentRootArg} --watch=true --download-evidence=true --verify=false --output=markdown`,
    realDeploy: `yarn installer:deploy -- ${envBase} --repo=${repo || "<owner>/<private-deploy-repo>"} --deployment-root=${deploymentRootArg} --confirm=true`,
    observeDeploy: `yarn installer:observe -- --environment=${environment} --repo=${repo || "<owner>/<private-deploy-repo>"} --deployment-root=${deploymentRootArg} --watch=true --download-evidence=true --verify=true --output=markdown`,
    adoptFrontendOrigin: `yarn installer:adopt-frontend-origin -- --environment=${environment} --environment-dir=${path.join(deployEnvDirArg, environment)} --deployment-root=${deploymentRootArg} --write=true --output=markdown`,
    bootstrapAdmin: `yarn installer:bootstrap-admin -- --environment=${environment} --deployment-root=${deploymentRootArg} --customer-file=${relativeToRoot(customerFile)} --dry-run=false --output=markdown`,
    browserSmoke: `yarn installer:browser-smoke -- --environment=${environment} --deployment-root=${deploymentRootArg} --customer-file=${relativeToRoot(customerFile)} --output=markdown`,
    nextEnvironment: `yarn installer:next -- --customer-file=${relativeToRoot(customerFile)} --deployment-root=${deploymentRootArg} --environment=prod --output=markdown`,
    report: `yarn installer:report -- --environment=${environment} --deployment-root=${deploymentRootArg} --write=true --check-http=true --output=markdown`,
  };

  const githubReadinessCommand = githubReadiness?.ok === false ? commands.githubSecrets : commands.githubReadiness;

  const localDependenciesReady = exists(path.join(rootDir, "node_modules", "vite", "dist", "node", "cli.js"));
  const firstAdminValuesReady = hasCustomerValue("first-admin-email", firstAdminEmail) && hasCustomerValue("first-admin-password", firstAdminPassword) && hasCustomerValue("first-church-name", firstChurchName);
  const localDependenciesSatisfied = localDependenciesReady || browserSmoke?.ok === true;
  const privateDeploymentScaffoldReady = exists(workflowFile) && exists(path.join(deployEnvDir, "staging")) && exists(path.join(deployEnvDir, "prod"));
  const deployedFrontendAppUrl = String(deploymentSummary?.resolved?.frontendAppUrl || "").replace(/\/$/, "");
  const frontendOriginReady = !deploymentSummary
    || !deployedFrontendAppUrl
    || (String(backendParameters?.CorsOrigin || "").replace(/\/$/, "") === deployedFrontendAppUrl
      && String(backendParameters?.B1AdminRootUrl || "").replace(/\/$/, "") === deployedFrontendAppUrl);

  const checks = [
    status(privateDeploymentScaffoldReady, "Private deployment scaffold", privateDeploymentScaffoldReady ? "workflow plus staging/prod folders" : "create the private deployment repo scaffold", commands.setup),
    status(exists(customerFile), "Customer values file", exists(customerFile) ? "found" : "copy the sample and replace placeholders", exists(sampleCustomerFile) ? commands.createCustomerFile : commands.setup),
    status(hasCustomerValue("repo", repo) && hasCustomerValue("account-id", accountId), "Core customer values", hasCustomerValue("repo", repo) && hasCustomerValue("account-id", accountId) ? "repo and AWS account id available" : "answer the customer setup questions", commands.editCustomerValues),
    status(roleFilesExist, "AWS IAM admin handoff", roleFilesExist ? `prepared${exists(handoffFile) ? " with handoff document" : ""}` : "generate files and commands for an AWS admin", commands.awsHandoff),
    status(hasCustomerValue("root-domain", rootDomain) && hasCustomerValue("support-phone", supportPhone), "Environment public values", hasCustomerValue("root-domain", rootDomain) && hasCustomerValue("support-phone", supportPhone) ? "root domain and support phone available" : "answer the customer setup questions", commands.editCustomerValues),
    status(auditBlockerCount === 0, "Environment parameter files", auditBlockerCount === null ? "not checked yet" : `${auditBlockerCount} blocker(s) remaining`, commands.configureWrite),
    status(exists(appConfigSecret), "App config secret", exists(appConfigSecret) ? "local secret file exists and should not be committed" : "generate random app secrets locally", commands.appConfig),
    status(hasCustomerValue("support-email", supportEmail), "Support email", hasCustomerValue("support-email", supportEmail) ? "available for web push subject" : "set supportEmail before syncing app config", commands.editCustomerValues),
    status(githubReadiness?.ok === true, "GitHub readiness", githubReadiness?.ok === true ? "environments and required secret names confirmed" : "confirm GitHub Environments and required secrets", githubReadinessCommand),
    status(preflightReadiness?.ok === true, "Installer preflight", preflightReadiness?.ok === true ? "ready for workflow dispatch" : "run local preflight before dispatch", commands.preflight),
    status(exists(preflightPlanFile), "Preview workflow observed", exists(preflightPlanFile) ? "preflight plan evidence downloaded" : previewDispatch ? "preview dispatch found; observe the run" : "dispatch a preview workflow", previewDispatch ? commands.observePreview : commands.previewDeploy),
    status(Boolean(deploymentSummary), "Deployment observed", deploymentSummary ? "deployment summary evidence downloaded" : deployDispatch ? "deploy dispatch found; observe and verify the run" : "dispatch the real deploy workflow", deployDispatch ? commands.observeDeploy : commands.realDeploy),
    status(frontendOriginReady, "Frontend origin accepted by backend", frontendOriginReady ? "backend CORS/root URL match the deployed frontend" : "adopt the deployed frontend URL into backend parameters, commit/push, then rerun the real deploy", commands.adoptFrontendOrigin),
    status(firstAdminValuesReady, "First admin values", firstAdminValuesReady ? "first admin email, temporary password, and church name available" : "answer the first-admin setup questions", commands.editCustomerValues),
    status(localDependenciesSatisfied, "Local dependencies", localDependenciesReady ? "B1Admin npm dependencies installed" : browserSmoke?.ok === true ? "not installed locally; browser smoke evidence already saved" : "install B1Admin npm dependencies before first-admin bootstrap and browser smoke", commands.installDeps),
    status(bootstrapAdmin?.ok === true && bootstrapAdmin?.dryRun !== true, "First admin bootstrap", bootstrapAdmin?.ok === true && bootstrapAdmin?.dryRun !== true ? "first admin evidence saved" : "seed the first admin from the operator machine", commands.bootstrapAdmin),
    status(browserSmoke?.ok === true, "Browser smoke", browserSmoke?.ok === true ? "login and authenticated page evidence saved" : "run browser smoke after first-admin bootstrap", commands.browserSmoke),
  ];

  if (environment === "prod") {
    checks.push(status(exists(reportFile), "Deployment report", exists(reportFile) ? "final report written" : "write final rollout report", commands.report));
  }

  const nextCheck = checks.find((check) => !check.ok && check.command);
  const nextCommand = nextCheck?.command
    || (environment === "staging" ? commands.nextEnvironment : `# Complete. Review ${relativeToRoot(reportFile)} and sign off.`);

  const result = {
    ok: checks.every((check) => check.ok),
    environment,
    customerFile: relativeToRoot(customerFile),
    deployRepoDir: relativeToRoot(deployRepoDir),
    deployEnvDir: relativeToRoot(deployEnvDir),
    deploymentRoot: relativeToRoot(deploymentRoot),
    nextCommand,
    checks,
    commands: Object.values(commands),
    showAllCommands,
    notes: [
      environment === "prod"
        ? "Prod-first keeps the AWS footprint smaller. Staging is optional and can be run separately when you want a practice deployment."
        : "Staging is optional. After staging is verified, the installer will point you to prod.",
      "Run this command again after each completed step to get the next recommendation.",
      "Only run the command shown under Next Command. Use --show-all-commands=true when you need the full command reference.",
      "The normal path uses the generated API Gateway URL. Only configure a frontend custom domain when the DNS and us-east-1 certificate are ready.",
      "Do not commit customer-values.json, app-config-secret.json, bootstrap-admin-secret.json, or deployment/.",
    ],
  };

  if (outputMode === "json") {
    printJson(result);
  } else if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(renderMarkdown(result));
  } else {
    console.log(`Next command:\n${nextCommand}`);
  }
}

main();
