import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import {
  boolArg,
  getArg,
  printJson,
  relativeToRoot,
  rootDir,
} from "./installer-common.mjs";

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function setIfPresent(target, key, value) {
  if (value !== "") target[key] = value;
}

function defaultValues(existing = {}) {
  return {
    awsRegion: existing.awsRegion || "us-east-1",
    accountId: existing.accountId || "",
    repo: existing.repo || "",
    deployRepoDir: existing.deployRepoDir || "../b1admin-deploy",
    deployEnvDir: existing.deployEnvDir || "../b1admin-deploy/environments",
    rootDomain: existing.rootDomain || "",
    supportEmail: existing.supportEmail || "",
    supportPhone: existing.supportPhone || "",
    firstAdminEmail: existing.firstAdminEmail || "",
    firstAdminPassword: existing.firstAdminPassword || "",
    firstChurchName: existing.firstChurchName || "",
    b1adminRepo: existing.b1adminRepo || "ChurchApps/B1Admin",
    b1adminRef: existing.b1adminRef || "main",
    apiRepo: existing.apiRepo || "ChurchApps/Api",
    apiRef: existing.apiRef || "main",
    environments: {
      staging: {
        frontendDomain: existing.environments?.staging?.frontendDomain || "",
        frontendCertificateArn: existing.environments?.staging?.frontendCertificateArn || "",
        frontendHostedZoneId: existing.environments?.staging?.frontendHostedZoneId || "",
      },
      prod: {
        frontendDomain: existing.environments?.prod?.frontendDomain || "",
        frontendCertificateArn: existing.environments?.prod?.frontendCertificateArn || "",
        frontendHostedZoneId: existing.environments?.prod?.frontendHostedZoneId || "",
      },
    },
  };
}

function valueFromArgs(key, fallback) {
  const dashKey = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return getArg(dashKey, getArg(key, fallback));
}

function mergeCliValues(values) {
  [
    "awsRegion",
    "accountId",
    "repo",
    "rootDomain",
    "supportEmail",
    "supportPhone",
    "firstAdminEmail",
    "firstAdminPassword",
    "firstChurchName",
    "b1adminRepo",
    "b1adminRef",
    "apiRepo",
    "apiRef",
  ].forEach((key) => {
    const value = valueFromArgs(key, values[key]);
    if (value !== values[key]) values[key] = value;
  });

  ["staging", "prod"].forEach((environment) => {
    setIfPresent(values.environments[environment], "frontendDomain", getArg(`${environment}-frontend-domain`));
    setIfPresent(values.environments[environment], "frontendCertificateArn", getArg(`${environment}-frontend-certificate-arn`));
    setIfPresent(values.environments[environment], "frontendHostedZoneId", getArg(`${environment}-frontend-hosted-zone-id`));
  });
}

async function promptText(rl, label, defaultValue = "", options = {}) {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const raw = await rl.question(`${label}${suffix}: `);
  const value = raw.trim();
  if (!value) return defaultValue;
  if (options.allowBlankToken && value.toLowerCase() === "blank") return "";
  return value;
}

async function promptYesNo(rl, label, defaultValue = false) {
  const suffix = defaultValue ? " [Y/n]" : " [y/N]";
  const raw = (await rl.question(`${label}${suffix}: `)).trim().toLowerCase();
  if (!raw) return defaultValue;
  if (["y", "yes"].includes(raw)) return true;
  if (["n", "no"].includes(raw)) return false;
  return promptYesNo(rl, label, defaultValue);
}

async function collectInteractive(values) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log("B1Admin customer setup");
    console.log("Press Enter to keep the value shown in brackets. Type blank to clear an optional value.");
    console.log("");

    values.awsRegion = await promptText(rl, "AWS region", values.awsRegion);
    values.accountId = await promptText(rl, "AWS account ID", values.accountId);
    values.repo = await promptText(rl, "User's private repository, for example your-org/b1admin-deploy", values.repo);
    values.rootDomain = await promptText(rl, "Root domain, for example example.com", values.rootDomain);
    values.supportEmail = await promptText(rl, "Support email", values.supportEmail || (values.rootDomain ? `support@${values.rootDomain}` : ""));
    values.supportPhone = await promptText(rl, "Support phone", values.supportPhone);
    values.firstAdminEmail = await promptText(rl, "First admin email", values.firstAdminEmail);
    values.firstAdminPassword = await promptText(rl, "Temporary first admin password", values.firstAdminPassword);
    values.firstChurchName = await promptText(rl, "First church name", values.firstChurchName);
    values.b1adminRepo = await promptText(rl, "B1Admin source repository", values.b1adminRepo);
    values.b1adminRef = await promptText(rl, "B1Admin source branch or tag", values.b1adminRef);
    values.apiRepo = await promptText(rl, "Api source repository", values.apiRepo);
    values.apiRef = await promptText(rl, "Api source branch or tag", values.apiRef);

    const configureCustomFrontend = await promptYesNo(rl, "Use a custom frontend domain now", Boolean(values.environments.prod.frontendDomain));
    if (configureCustomFrontend) {
      values.environments.prod.frontendDomain = await promptText(rl, "Prod frontend hostname", values.environments.prod.frontendDomain || (values.rootDomain ? `admin.${values.rootDomain}` : ""));
      values.environments.prod.frontendCertificateArn = await promptText(rl, "Prod CloudFront ACM certificate ARN in us-east-1", values.environments.prod.frontendCertificateArn, { allowBlankToken: true });
      values.environments.prod.frontendHostedZoneId = await promptText(rl, "Prod Route53 hosted zone ID", values.environments.prod.frontendHostedZoneId, { allowBlankToken: true });

      const configureStagingDomain = await promptYesNo(rl, "Also set a staging frontend hostname", Boolean(values.environments.staging.frontendDomain));
      if (configureStagingDomain) {
        values.environments.staging.frontendDomain = await promptText(rl, "Staging frontend hostname", values.environments.staging.frontendDomain || (values.rootDomain ? `admin-staging.${values.rootDomain}` : ""));
        values.environments.staging.frontendCertificateArn = await promptText(rl, "Staging CloudFront ACM certificate ARN in us-east-1", values.environments.staging.frontendCertificateArn, { allowBlankToken: true });
        values.environments.staging.frontendHostedZoneId = await promptText(rl, "Staging Route53 hosted zone ID", values.environments.staging.frontendHostedZoneId, { allowBlankToken: true });
      }
    }
  } finally {
    rl.close();
  }
}

function requiredMissing(values) {
  const required = [
    ["AWS account ID", values.accountId],
    ["user's private repository", values.repo],
    ["root domain", values.rootDomain],
    ["support email", values.supportEmail],
    ["support phone", values.supportPhone],
    ["first admin email", values.firstAdminEmail],
    ["temporary first admin password", values.firstAdminPassword],
    ["first church name", values.firstChurchName],
  ];
  return required.filter(([, value]) => !String(value || "").trim()).map(([label]) => label);
}

function renderMarkdown(result) {
  const lines = [
    "# B1Admin Customer Values",
    "",
    `- Status: ${result.ok ? "ready" : "needs attention"}`,
    `- Customer file: \`${result.customerFile}\``,
    `- Written: ${result.written ? "yes" : "no"}`,
    "",
  ];

  if (result.missing.length > 0) {
    lines.push("## Missing Values", "");
    result.missing.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  lines.push(
    "## Next Command",
    "",
    "```bash",
    `yarn installer:next -- --customer-file=${result.customerFile} --environment=prod --output=markdown`,
    "```",
    "",
    "Keep this file local. Do not commit it.",
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  const outputMode = getArg("output", "text").toLowerCase();
  const customerFileArg = getArg("customer-file", "../b1admin-deploy/customer-values.json");
  const customerFile = path.resolve(rootDir, customerFileArg);
  const write = boolArg("write", true);
  const interactive = boolArg("interactive", outputMode !== "json");
  const values = defaultValues(readJsonIfExists(customerFile));

  mergeCliValues(values);
  if (interactive) await collectInteractive(values);

  const missing = requiredMissing(values);
  if (write) {
    fs.mkdirSync(path.dirname(customerFile), { recursive: true });
    fs.writeFileSync(customerFile, `${JSON.stringify(values, null, 2)}\n`);
  }

  const result = {
    ok: missing.length === 0,
    written: write,
    customerFile: relativeToRoot(customerFile),
    missing,
    values,
  };

  if (outputMode === "json") {
    printJson(result);
  } else {
    process.stdout.write(renderMarkdown(result));
  }

  process.exit(result.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
