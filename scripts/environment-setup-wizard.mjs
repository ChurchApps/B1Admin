import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function resolveEnvironmentDir(environment, explicitDir = "") {
  if (explicitDir) {
    return path.resolve(rootDir, explicitDir);
  }
  return path.join(rootDir, "infrastructure", "environments", environment);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function deriveRootDomain(environment, backend) {
  const adminUrl = backend.B1AdminRootUrl || "";
  const supportEmail = backend.SupportEmail || "";

  const adminMatch = adminUrl.match(/^https:\/\/admin(?:-[^.]+)?\.(.+)$/);
  if (adminMatch) return adminMatch[1];

  const supportParts = supportEmail.split("@");
  if (supportParts.length === 2) return supportParts[1];

  return environment === "prod" ? "yourdomain.com" : "";
}

function stripProtocol(value) {
  return typeof value === "string" ? value.replace(/^https?:\/\//, "") : value;
}

function parseAccountId(bootstrap) {
  const match = String(bootstrap.TemplateBucketName || "").match(/(\d{12})$/);
  return match ? match[1] : "";
}

async function promptText(rl, label, defaultValue = "", options = {}) {
  const suffix = defaultValue !== "" ? ` [${defaultValue}]` : "";
  const raw = await rl.question(`${label}${suffix}: `);
  const value = raw.trim();
  if (value === "") return defaultValue;
  if (options.allowBlankToken && value.toLowerCase() === "blank") return "";
  return value;
}

async function promptYesNo(rl, label, defaultValue = true) {
  const suffix = defaultValue ? " [Y/n]" : " [y/N]";
  const raw = (await rl.question(`${label}${suffix}: `)).trim().toLowerCase();
  if (raw === "") return defaultValue;
  if (["y", "yes"].includes(raw)) return true;
  if (["n", "no"].includes(raw)) return false;
  return promptYesNo(rl, label, defaultValue);
}

function buildPrepareArgs(config, writeChanges) {
  const args = [
    path.join(rootDir, "scripts", "prepare-environment-starter.mjs"),
    `--environment=${config.environment}`,
    `--project-name=${config.projectName}`,
    `--write=${writeChanges ? "true" : "false"}`,
    "--output=markdown",
    `--generate-secrets=${config.generateSecrets ? "true" : "false"}`,
    `--write-secret-file=${config.writeSecretFile ? "true" : "false"}`,
  ];

  if (config.accountId) args.push(`--account-id=${config.accountId}`);
  if (config.force) args.push("--force=true");
  if (config.rootDomain) args.push(`--root-domain=${config.rootDomain}`);

  const keyedArgs = {
    websiteBaseUrl: "website-base-url",
    contentRootUrl: "content-root-url",
    adminRootUrl: "admin-root-url",
    corsOrigin: "cors-origin",
    frontendDomain: "frontend-domain",
    frontendCertificateArn: "frontend-certificate-arn",
    frontendHostedZoneId: "frontend-hosted-zone-id",
    apiDomain: "api-domain",
    apiCertificateArn: "api-certificate-arn",
    apiHostedZoneId: "api-hosted-zone-id",
    storeApiUrl: "store-api-url",
    transferUrl: "transfer-url",
    supportEmail: "support-email",
    supportPhone: "support-phone",
    supportSiteUrl: "support-site-url",
    mobileAppUrl: "mobile-app-url",
    domainCnameTarget: "domain-cname-target",
    domainATarget: "domain-a-target",
    defaultStockPhoto: "default-stock-photo",
    googleAnalyticsTag: "google-analytics-tag",
  };

  Object.entries(keyedArgs).forEach(([key, argName]) => {
    if (config[key] !== undefined && config[key] !== null && config[key] !== "") {
      args.push(`--${argName}=${config[key]}`);
    }
  });

  return args;
}

function runPrepare(config, writeChanges) {
  return spawnSync(process.execPath, buildPrepareArgs(config, writeChanges), {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  });
}

function runGuide(environment) {
  return spawnSync(
    process.execPath,
    [
      path.join(rootDir, "scripts", "show-environment-setup-guide.mjs"),
      `--environment=${environment}`,
      "--output=markdown",
    ],
    {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"],
    },
  );
}

function buildIamRoleDiscoveryCommand(environment, projectName) {
  return `yarn discover:github-aws-roles -- --environment=${environment} --project-name=${projectName} --output=markdown`;
}

async function main() {
  const requestedEnvironment = getArg("environment", "staging");
  const environmentDirArg = getArg("environment-dir");
  const environmentDir = resolveEnvironmentDir(requestedEnvironment, environmentDirArg);

  if (!fs.existsSync(environmentDir)) {
    console.error(`Unknown environment starter "${requestedEnvironment}".`);
    process.exit(1);
  }

  const bootstrap = readJson(path.join(environmentDir, "bootstrap-parameters.json"));
  const backend = readJson(path.join(environmentDir, "backend-parameters.json"));
  const frontend = readJson(path.join(environmentDir, "frontend-parameters.json"));
  const templateSecret = readJson(path.join(environmentDir, "app-config-secret.template.json"));
  const secretPath = path.join(environmentDir, "app-config-secret.json");
  const existingSecret = fs.existsSync(secretPath) ? readJson(secretPath) : null;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log(`Environment setup wizard: ${requestedEnvironment}`);
    console.log("This will walk through first-deploy values first, then optional custom-domain and integration values.");
    console.log("Press Enter to keep the suggested default. Type blank only where the wizard says it is allowed.\n");

    const environment = await promptText(rl, "Environment", requestedEnvironment);
    const projectName = await promptText(rl, "Project name", bootstrap.ProjectName || "b1admin");
    const accountId = await promptText(rl, "AWS account ID", parseAccountId(bootstrap));

    console.log("\nPhase 1: First AWS deploy");
    const useRootDomain = await promptYesNo(
      rl,
      "Derive admin/content/store/transfer/support values from a shared root domain",
      true,
    );

    const rootDomainDefault = deriveRootDomain(environment, backend);
    let rootDomain = "";
    let websiteBaseUrl = "";
    let contentRootUrl = "";
    let adminRootUrl = "";
    let corsOrigin = "";
    let storeApiUrl = "";
    let transferUrl = "";
    let supportEmail = backend.SupportEmail || "";

    if (useRootDomain) {
      rootDomain = await promptText(rl, "Root domain", rootDomainDefault);
      supportEmail = await promptText(rl, "Support email", backend.SupportEmail || `support@${rootDomain}`);
    } else {
      websiteBaseUrl = await promptText(rl, "Website base URL pattern", backend.WebsiteBaseUrl || "https://{subdomain}.yourdomain.com");
      contentRootUrl = await promptText(rl, "Content root URL", backend.ContentRootUrl || "");
      adminRootUrl = await promptText(rl, "Admin root URL", backend.B1AdminRootUrl || "");
      corsOrigin = await promptText(rl, "CORS origin", backend.CorsOrigin || adminRootUrl);
      storeApiUrl = await promptText(rl, "Store API URL", backend.StoreApiUrl || "");
      transferUrl = await promptText(rl, "Transfer URL", backend.TransferUrl || "");
      supportEmail = await promptText(rl, "Support email", backend.SupportEmail || "");
    }

    const supportPhone = await promptText(rl, "Support phone", backend.SupportPhone || "");
    const supportSiteUrl = await promptText(rl, "Support site URL", backend.SupportSiteUrl || "");

    const writeSecretFile = await promptYesNo(
      rl,
      existingSecret
        ? "Keep using and updating app-config-secret.json in this environment folder"
        : "Create app-config-secret.json now",
      true,
    );
    const generateSecrets = writeSecretFile
      ? await promptYesNo(
        rl,
        existingSecret
          ? "Regenerate jwtSecret and encryptionKey"
          : "Generate jwtSecret and encryptionKey",
        existingSecret ? false : true,
      )
      : false;
    const force = Boolean(existingSecret && generateSecrets);

    console.log("\nPhase 2: Optional custom domains");
    const configureCustomDomains = await promptYesNo(
      rl,
      "Fill the ACM and Route53 custom-domain fields now",
      false,
    );

    let frontendDomain = "";
    let frontendCertificateArn = "";
    let frontendHostedZoneId = "";
    let apiDomain = "";
    let apiCertificateArn = "";
    let apiHostedZoneId = "";

    if (configureCustomDomains) {
      const frontendDomainDefault = frontend.AlternateDomainName || stripProtocol(backend.B1AdminRootUrl);
      frontendDomain = await promptText(rl, "Frontend domain", frontendDomainDefault);
      frontendCertificateArn = await promptText(rl, "Frontend ACM certificate ARN", frontend.AcmCertificateArn || "");
      frontendHostedZoneId = await promptText(rl, "Frontend Route53 hosted zone ID", frontend.HostedZoneId || "");
      apiDomain = await promptText(rl, "API custom domain", backend.ApiCustomDomainName || "");
      apiCertificateArn = await promptText(rl, "API ACM certificate ARN", backend.ApiCertificateArn || "");
      apiHostedZoneId = await promptText(rl, "API Route53 hosted zone ID", backend.ApiHostedZoneId || "");
    }

    console.log("\nPhase 3: Optional integrations and metadata");
    const reviewOptionalMetadata = await promptYesNo(
      rl,
      "Review optional runtime metadata now",
      false,
    );

    let mobileAppUrl = "";
    let domainCnameTarget = "";
    let domainATarget = "";
    let defaultStockPhoto = "";
    let googleAnalyticsTag = "";

    if (reviewOptionalMetadata) {
      mobileAppUrl = await promptText(rl, "Mobile app URL", backend.MobileAppUrl || "", { allowBlankToken: true });
      domainCnameTarget = await promptText(rl, "Legacy CNAME target", backend.DomainCnameTarget || "", { allowBlankToken: true });
      domainATarget = await promptText(rl, "Legacy A-record target", backend.DomainATarget || "", { allowBlankToken: true });
      defaultStockPhoto = await promptText(rl, "Default stock photo URL", backend.DefaultStockPhoto || "", { allowBlankToken: true });
      googleAnalyticsTag = await promptText(rl, "Google Analytics tag", backend.GoogleAnalyticsTag || "", { allowBlankToken: true });
    }

    const config = {
      environment,
      projectName,
      accountId,
      generateSecrets,
      writeSecretFile,
      force,
      rootDomain,
      websiteBaseUrl,
      contentRootUrl,
      adminRootUrl,
      corsOrigin,
      frontendDomain,
      frontendCertificateArn,
      frontendHostedZoneId,
      apiDomain,
      apiCertificateArn,
      apiHostedZoneId,
      storeApiUrl,
      transferUrl,
      supportEmail,
      supportPhone,
      supportSiteUrl,
      mobileAppUrl,
      domainCnameTarget,
      domainATarget,
      defaultStockPhoto,
      googleAnalyticsTag,
    };

    console.log("\nPreviewing the exact starter-file changes...\n");
    const preview = runPrepare(config, false);
    if (preview.status !== 0) {
      process.stdout.write(preview.stdout || "");
      process.stderr.write(preview.stderr || "");
      process.exit(preview.status ?? 1);
    }
    process.stdout.write(preview.stdout);
    if (preview.stderr) process.stderr.write(preview.stderr);

    if ((preview.stdout || "").includes("- No changes proposed.")) {
      console.log("\nThe starter files already match the answers you gave.");
      console.log("\nCurrent readiness snapshot:\n");
      const guide = runGuide(environment);
      process.stdout.write(guide.stdout || "");
      if (guide.stderr) process.stderr.write(guide.stderr);
      process.exit(guide.status ?? 0);
    }

    const applyChanges = await promptYesNo(rl, "\nWrite these changes to the environment files now", true);
    if (!applyChanges) {
      console.log("No files were changed.");
      process.exit(0);
    }

    console.log("\nApplying changes...\n");
    const applied = runPrepare(config, true);
    if (applied.status !== 0) {
      process.stdout.write(applied.stdout || "");
      process.stderr.write(applied.stderr || "");
      process.exit(applied.status ?? 1);
    }
    process.stdout.write(applied.stdout);
    if (applied.stderr) process.stderr.write(applied.stderr);

    console.log("\nUpdated readiness snapshot:\n");
    const guide = runGuide(environment);
    process.stdout.write(guide.stdout || "");
    if (guide.stderr) process.stderr.write(guide.stderr);
    console.log("\nGitHub AWS role discovery:");
    console.log(buildIamRoleDiscoveryCommand(environment, projectName));
    process.exit(guide.status ?? 0);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
