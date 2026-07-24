import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isKnownStarterHostname } from "./lib/environment-setup-metadata.mjs";

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function randomSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function replaceIfStarterDefault(currentValue, nextValue, predicate) {
  if (!nextValue || typeof currentValue !== "string") return currentValue;
  return predicate(currentValue) ? nextValue : currentValue;
}

function isGeneratedBucketStarterDefault(value) {
  return typeof value === "string" && (
    value.includes("replace-me")
    || /-\d{12}$/.test(value)
  );
}

function deriveEnvironmentHost(service, environment, rootDomain) {
  if (!rootDomain) return "";
  const trimmed = rootDomain.replace(/^\.+|\.+$/g, "");
  const suffix = environment === "prod" ? "" : `-${environment}`;
  return `${service}${suffix}.${trimmed}`;
}

function resolveEnvironmentDir(environment, explicitDir = "") {
  if (explicitDir) {
    return path.resolve(rootDir, explicitDir);
  }
  return path.join(rootDir, "infrastructure", "environments", environment);
}

function buildRecommendedCommands(environment, accountId, writeChanges, environmentDirArg = "") {
  const accountArg = accountId ? ` --account-id=${accountId}` : "";
  const environmentDirCliArg = environmentDirArg ? ` --environment-dir=${environmentDirArg}` : "";
  const environmentDirPath = environmentDirArg || `infrastructure/environments/${environment}`;
  return [
    `yarn prepare:environment-starter -- --environment=${environment}${environmentDirCliArg}${accountArg} --write=true`,
    `yarn audit:environment-starter -- --environment=${environment}${environmentDirCliArg} --only-blockers=true`,
    `yarn validate:aws-deploy -- --mode=bootstrap --region=us-east-1 --stack-name=b1admin-${environment}-bootstrap --parameters-file=${environmentDirPath}/bootstrap-parameters.json`,
    `yarn validate:aws-deploy -- --mode=split-stack --region=us-east-1 --backend-parameters-file=${environmentDirPath}/backend-parameters.json --frontend-parameters-file=${environmentDirPath}/frontend-parameters.json`,
    `ENV_DIR=${environmentDirPath} ./infrastructure/environments/${environment}/deploy-split-stack.sh`,
  ];
}

function renderMarkdown(result) {
  const lines = [
    `# Prepare Environment Starter: ${result.environment}`,
    "",
    `- Status: ${result.ok ? "ok" : "error"}`,
    `- Write mode: ${result.write ? "enabled" : "dry-run"}`,
    `- Account ID: ${result.accountId || "<not provided>"}`,
    `- Generated secrets: ${result.generatedSecrets ? "yes" : "no"}`,
    `- Existing app-config-secret.json: ${result.usedExistingSecretFile ? "yes" : "no"}`,
  ];

  if (result.changes.length > 0) {
    lines.push("", "## Proposed Changes", "");
    result.changes.forEach((change) => {
      lines.push(`- \`${change.file}\` :: \`${change.key}\``);
      lines.push(`  Current: \`${change.currentValue}\``);
      lines.push(`  Next: \`${change.nextValue}\``);
    });
  } else {
    lines.push("", "## Proposed Changes", "", "- No changes proposed.");
  }

  if (result.nextSteps.length > 0) {
    lines.push("", "## Next Steps", "");
    result.nextSteps.forEach((line) => lines.push(`- ${line}`));
  }

  if (result.recommendedCommands.length > 0) {
    lines.push("", "## Recommended Commands", "");
    result.recommendedCommands.forEach((line) => lines.push(`- \`${line}\``));
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function main() {
  const environment = getArg("environment", "staging");
  const environmentDirArg = getArg("environment-dir");
  const projectName = getArg("project-name", "b1admin");
  const accountId = getArg("account-id");
  const writeChanges = getArg("write", "false").toLowerCase() === "true";
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";
  const commandsOutput = outputMode === "commands" || outputMode === "shell";
  const markdownOutput = outputMode === "markdown" || outputMode === "md";
  const generateSecrets = getArg("generate-secrets", "true").toLowerCase() === "true";
  const force = getArg("force", "false").toLowerCase() === "true";
  const rootDomain = getArg("root-domain");
  const websiteBaseUrl = getArg("website-base-url");
  const contentRootUrl = getArg("content-root-url");
  const adminRootUrl = getArg("admin-root-url");
  const corsOrigin = getArg("cors-origin");
  const frontendDomain = getArg("frontend-domain");
  const frontendCertificateArn = getArg("frontend-certificate-arn");
  const frontendHostedZoneId = getArg("frontend-hosted-zone-id");
  const apiDomain = getArg("api-domain");
  const apiCertificateArn = getArg("api-certificate-arn");
  const apiHostedZoneId = getArg("api-hosted-zone-id");
  const storeApiUrl = getArg("store-api-url");
  const transferUrl = getArg("transfer-url");
  const supportEmail = getArg("support-email");
  const supportPhone = getArg("support-phone");
  const supportSiteUrl = getArg("support-site-url");
  const mobileAppUrl = getArg("mobile-app-url");
  const domainCnameTarget = getArg("domain-cname-target");
  const domainATarget = getArg("domain-a-target");
  const defaultStockPhoto = getArg("default-stock-photo");
  const googleAnalyticsTag = getArg("google-analytics-tag");
  const writeSecretFile = getArg("write-secret-file", "true").toLowerCase() === "true";
  const environmentDir = resolveEnvironmentDir(environment, environmentDirArg);

  if (!fs.existsSync(environmentDir)) {
    const message = `Unknown environment starter "${environment}".`;
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify({ ok: false, environment, errors: [message] }, null, 2)}\n`);
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  const bootstrapPath = path.join(environmentDir, "bootstrap-parameters.json");
  const backendPath = path.join(environmentDir, "backend-parameters.json");
  const frontendPath = path.join(environmentDir, "frontend-parameters.json");
  const templateSecretPath = path.join(environmentDir, "app-config-secret.template.json");
  const secretPath = path.join(environmentDir, "app-config-secret.json");

  const bootstrap = readJson(bootstrapPath);
  const backend = readJson(backendPath);
  const frontend = readJson(frontendPath);
  const templateSecret = readJson(templateSecretPath);
  const existingSecret = fs.existsSync(secretPath) ? readJson(secretPath) : null;
  const derivedWebsiteBaseUrl = rootDomain ? `https://{subdomain}.${rootDomain.replace(/^\.+|\.+$/g, "")}` : "";
  const derivedAdminRootUrl = rootDomain ? `https://${deriveEnvironmentHost("admin", environment, rootDomain)}` : "";
  const derivedContentRootUrl = rootDomain ? `https://${deriveEnvironmentHost("content", environment, rootDomain)}` : "";
  const derivedStoreApiUrl = rootDomain ? `https://${deriveEnvironmentHost("store", environment, rootDomain)}` : "";
  const derivedTransferUrl = rootDomain ? `https://${deriveEnvironmentHost("transfer", environment, rootDomain)}` : "";
  const derivedSupportEmail = rootDomain ? `support@${rootDomain.replace(/^\.+|\.+$/g, "")}` : "";
  const derivedSupportSiteUrl = rootDomain ? `https://${deriveEnvironmentHost("support", environment, rootDomain)}` : "";
  const resolvedSupportEmail = supportEmail || derivedSupportEmail;

  const proposedTemplateBucketName = accountId ? `${projectName}-${environment}-templates-${accountId}` : "";
  const proposedArtifactBucketName = accountId ? `${projectName}-${environment}-artifacts-${accountId}` : "";
  const proposedBootstrap = {
    ...bootstrap,
    TemplateBucketName: accountId ? replaceIfStarterDefault(bootstrap.TemplateBucketName, proposedTemplateBucketName, isGeneratedBucketStarterDefault) : bootstrap.TemplateBucketName,
    ArtifactBucketName: accountId ? replaceIfStarterDefault(bootstrap.ArtifactBucketName, proposedArtifactBucketName, isGeneratedBucketStarterDefault) : bootstrap.ArtifactBucketName,
  };
  const proposedBackend = {
    ...backend,
    LambdaCodeS3Bucket: accountId ? replaceIfStarterDefault(backend.LambdaCodeS3Bucket, proposedArtifactBucketName, isGeneratedBucketStarterDefault) : backend.LambdaCodeS3Bucket,
    WebsiteBaseUrl: replaceIfStarterDefault(backend.WebsiteBaseUrl, websiteBaseUrl || derivedWebsiteBaseUrl, isKnownStarterHostname),
    ContentRootUrl: replaceIfStarterDefault(backend.ContentRootUrl, contentRootUrl || derivedContentRootUrl, isKnownStarterHostname),
    B1AdminRootUrl: replaceIfStarterDefault(backend.B1AdminRootUrl, adminRootUrl || (frontendDomain ? `https://${frontendDomain}` : "") || derivedAdminRootUrl, isKnownStarterHostname),
    CorsOrigin: replaceIfStarterDefault(backend.CorsOrigin, corsOrigin || adminRootUrl || (frontendDomain ? `https://${frontendDomain}` : "") || derivedAdminRootUrl, isKnownStarterHostname),
    StoreApiUrl: replaceIfStarterDefault(backend.StoreApiUrl, storeApiUrl || derivedStoreApiUrl, isKnownStarterHostname),
    TransferUrl: replaceIfStarterDefault(backend.TransferUrl, transferUrl || derivedTransferUrl, isKnownStarterHostname),
    SupportEmail: replaceIfStarterDefault(backend.SupportEmail, resolvedSupportEmail, (value) => value === "support@example.com" || value === "support@b1.church"),
    SupportPhone: replaceIfStarterDefault(backend.SupportPhone, supportPhone, (value) => value === "555-555-5555"),
    SupportSiteUrl: replaceIfStarterDefault(backend.SupportSiteUrl, supportSiteUrl || derivedSupportSiteUrl, isKnownStarterHostname),
    MobileAppUrl: mobileAppUrl || backend.MobileAppUrl,
    DomainCnameTarget: domainCnameTarget || backend.DomainCnameTarget,
    DomainATarget: domainATarget || backend.DomainATarget,
    DefaultStockPhoto: defaultStockPhoto || backend.DefaultStockPhoto,
    GoogleAnalyticsTag: googleAnalyticsTag || backend.GoogleAnalyticsTag,
    ApiCustomDomainName: apiDomain || backend.ApiCustomDomainName,
    ApiCertificateArn: apiCertificateArn || backend.ApiCertificateArn,
    ApiHostedZoneId: apiHostedZoneId || backend.ApiHostedZoneId,
  };
  const proposedFrontend = {
    ...frontend,
    AlternateDomainName: frontendDomain || frontend.AlternateDomainName,
    AcmCertificateArn: frontendCertificateArn || frontend.AcmCertificateArn,
    HostedZoneId: frontendHostedZoneId || frontend.HostedZoneId,
  };

  const secretSource = existingSecret || templateSecret;
  const proposedTemplateSecret = {
    ...templateSecret,
    webPushSubject: replaceIfStarterDefault(
      templateSecret.webPushSubject,
      resolvedSupportEmail ? `mailto:${resolvedSupportEmail}` : "",
      (value) => value === "mailto:support@example.com" || value === "mailto:support@b1.church",
    ),
  };
  const proposedSecret = {
    ...secretSource,
    jwtSecret: generateSecrets && (force || !existingSecret) ? randomSecret(32) : secretSource.jwtSecret,
    encryptionKey: generateSecrets && (force || !existingSecret) ? randomSecret(32) : secretSource.encryptionKey,
    webPushSubject: replaceIfStarterDefault(
      secretSource.webPushSubject,
      resolvedSupportEmail ? `mailto:${resolvedSupportEmail}` : "",
      (value) => value === "mailto:support@example.com" || value === "mailto:support@b1.church",
    ),
  };

  const changes = [];
  const secretChanges = [];

  if (bootstrap.TemplateBucketName !== proposedBootstrap.TemplateBucketName) {
    changes.push({
      file: path.relative(rootDir, bootstrapPath),
      key: "TemplateBucketName",
      currentValue: bootstrap.TemplateBucketName,
      nextValue: proposedBootstrap.TemplateBucketName,
    });
  }
  if (bootstrap.ArtifactBucketName !== proposedBootstrap.ArtifactBucketName) {
    changes.push({
      file: path.relative(rootDir, bootstrapPath),
      key: "ArtifactBucketName",
      currentValue: bootstrap.ArtifactBucketName,
      nextValue: proposedBootstrap.ArtifactBucketName,
    });
  }
  if (backend.LambdaCodeS3Bucket !== proposedBackend.LambdaCodeS3Bucket) {
    changes.push({
      file: path.relative(rootDir, backendPath),
      key: "LambdaCodeS3Bucket",
      currentValue: backend.LambdaCodeS3Bucket,
      nextValue: proposedBackend.LambdaCodeS3Bucket,
    });
  }
  for (const key of [
    "WebsiteBaseUrl",
    "ContentRootUrl",
    "B1AdminRootUrl",
    "CorsOrigin",
    "StoreApiUrl",
    "TransferUrl",
    "SupportEmail",
    "SupportPhone",
    "SupportSiteUrl",
    "MobileAppUrl",
    "DomainCnameTarget",
    "DomainATarget",
    "DefaultStockPhoto",
    "GoogleAnalyticsTag",
  ]) {
    if (backend[key] !== proposedBackend[key]) {
      changes.push({
        file: path.relative(rootDir, backendPath),
        key,
        currentValue: backend[key],
        nextValue: proposedBackend[key],
      });
    }
  }
  for (const key of ["ApiCustomDomainName", "ApiCertificateArn", "ApiHostedZoneId"]) {
    if (backend[key] !== proposedBackend[key]) {
      changes.push({
        file: path.relative(rootDir, backendPath),
        key,
        currentValue: backend[key],
        nextValue: proposedBackend[key],
      });
    }
  }
  for (const key of ["AlternateDomainName", "AcmCertificateArn", "HostedZoneId"]) {
    if (frontend[key] !== proposedFrontend[key]) {
      changes.push({
        file: path.relative(rootDir, frontendPath),
        key,
        currentValue: frontend[key],
        nextValue: proposedFrontend[key],
      });
    }
  }
  if (!existingSecret) {
    secretChanges.push({
      file: path.relative(rootDir, secretPath),
      key: "app-config-secret.json",
      currentValue: "",
      nextValue: "will be created from template",
    });
  }
  if (secretSource.jwtSecret !== proposedSecret.jwtSecret) {
    secretChanges.push({
      file: path.relative(rootDir, secretPath),
      key: "jwtSecret",
      currentValue: existingSecret ? "<existing>" : templateSecret.jwtSecret,
      nextValue: "<generated>",
    });
  }
  if (secretSource.encryptionKey !== proposedSecret.encryptionKey) {
    secretChanges.push({
      file: path.relative(rootDir, secretPath),
      key: "encryptionKey",
      currentValue: existingSecret ? "<existing>" : templateSecret.encryptionKey,
      nextValue: "<generated>",
    });
  }
  if (secretSource.webPushSubject !== proposedSecret.webPushSubject) {
    secretChanges.push({
      file: path.relative(rootDir, secretPath),
      key: "webPushSubject",
      currentValue: secretSource.webPushSubject,
      nextValue: proposedSecret.webPushSubject,
    });
  }

  if (!existingSecret && !writeSecretFile && templateSecret.webPushSubject !== proposedTemplateSecret.webPushSubject) {
    changes.push({
      file: path.relative(rootDir, templateSecretPath),
      key: "webPushSubject",
      currentValue: templateSecret.webPushSubject,
      nextValue: proposedTemplateSecret.webPushSubject,
    });
  }

  if (!writeChanges || writeSecretFile) {
    changes.push(...secretChanges);
  }

  if (writeChanges) {
    writeJson(bootstrapPath, proposedBootstrap);
    writeJson(backendPath, proposedBackend);
    writeJson(frontendPath, proposedFrontend);
    if (writeSecretFile) {
      writeJson(secretPath, proposedSecret);
    } else if (!existingSecret && templateSecret.webPushSubject !== proposedTemplateSecret.webPushSubject) {
      writeJson(templateSecretPath, proposedTemplateSecret);
    }
  }

  const result = {
    ok: true,
    environment,
    write: writeChanges,
    writeSecretFile,
    accountId,
    generatedSecrets: generateSecrets,
    usedExistingSecretFile: Boolean(existingSecret),
    changes,
    recommendedCommands: buildRecommendedCommands(environment, accountId, writeChanges, environmentDirArg),
    nextSteps: [
      accountId
        ? `Review the proposed bucket values written to ${path.relative(rootDir, bootstrapPath)} and ${path.relative(rootDir, backendPath)}.`
        : "Re-run with --account-id=<aws-account-id> if you want bucket-name replacements generated automatically.",
      rootDomain
        ? `Review the domain-derived backend URLs in ${path.relative(rootDir, backendPath)} and override any that should not follow the standard ${environment === "prod" ? "prod" : `${environment}`} host pattern.`
        : "If your backend URLs mostly follow a shared DNS pattern, re-run with --root-domain=<your-domain> to derive the common admin/content/store/transfer values automatically.",
      frontendDomain || apiDomain
        ? `Review the proposed frontend/API custom-domain values written to ${path.relative(rootDir, frontendPath)} and ${path.relative(rootDir, backendPath)} before enabling cert and DNS-backed deploys.`
        : "If you want to prep optional custom-domain fields too, re-run with --frontend-domain/--frontend-certificate-arn/--frontend-hosted-zone-id and --api-domain/--api-certificate-arn/--api-hosted-zone-id.",
      websiteBaseUrl || contentRootUrl || adminRootUrl || corsOrigin || storeApiUrl || transferUrl || supportEmail || supportPhone || supportSiteUrl || mobileAppUrl || domainCnameTarget || domainATarget || defaultStockPhoto || googleAnalyticsTag
        ? `Review the proposed backend runtime URLs/contact values written to ${path.relative(rootDir, backendPath)}.`
        : "If you already know the real staging/prod URLs, public app metadata, and support contact values, re-run with --admin-root-url, --cors-origin, --content-root-url, --store-api-url, --transfer-url, --support-email, --support-phone, --support-site-url, --mobile-app-url, --domain-cname-target, --domain-a-target, --default-stock-photo, and --google-analytics-tag to prep them now.",
      writeChanges && writeSecretFile
        ? `Review ${path.relative(rootDir, secretPath)} before syncing it to Secrets Manager or GitHub Actions secrets.`
        : writeChanges
          ? `Create ${path.relative(rootDir, secretPath)} separately when you are ready to materialize runtime secrets, or re-run with --write-secret-file=true.`
        : `Re-run with --write=true to apply these starter-file changes and create ${path.relative(rootDir, secretPath)}.`,
    ],
  };

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (markdownOutput) {
    process.stdout.write(renderMarkdown(result));
  } else if (commandsOutput) {
    process.stdout.write(`${result.recommendedCommands.join("\n")}\n`);
  } else {
    console.log(`Prepared environment starter: ${environment}`);
    console.log(`Write mode: ${writeChanges ? "enabled" : "dry-run"}`);
    if (changes.length === 0) {
      console.log("No changes proposed.");
    } else {
      console.log("Proposed changes:");
      changes.forEach((change) => {
        console.log(`- ${change.file} :: ${change.key}`);
        console.log(`  current: ${change.currentValue}`);
        console.log(`  next: ${change.nextValue}`);
      });
    }
    console.log("\nNext steps:");
    result.nextSteps.forEach((line) => console.log(`- ${line}`));
    console.log("\nRecommended commands:");
    result.recommendedCommands.forEach((line) => console.log(`- ${line}`));
  }
}

main();
