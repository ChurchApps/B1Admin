export const requiredFiles = [
  "bootstrap-parameters.json",
  "backend-parameters.json",
  "frontend-parameters.json",
  "app-config-secret.template.json",
];

export const phaseOrder = ["first-deploy", "custom-domains", "integrations"];

export const phaseMetadata = {
  "first-deploy": {
    title: "Required For First AWS Deploy",
    description: "These values should be resolved before the first real stack launch.",
  },
  "custom-domains": {
    title: "Optional For Domain Cutover Later",
    description: "Leave these blank until you are ready to wire ACM certificates and Route53 records.",
  },
  integrations: {
    title: "Optional Integrations And Enhancements",
    description: "These settings can wait until the base stack is healthy.",
  },
};

export const optionalBlankKeys = {
  "backend-parameters.json": new Set([
    "DependenciesLayerArn",
    "ObservabilityLayerArn",
    "LambdaNodeOptions",
    "MigrationCodeS3Bucket",
    "MigrationCodeS3Key",
    "MigrationHandler",
    "MigrationRuntime",
    "MigrationTrigger",
    "ApiCustomDomainName",
    "ApiCertificateArn",
    "ApiHostedZoneId",
    "AssetBucketName",
    "AppConfigSecretArn",
    "CaddyHost",
    "CaddyPort",
    "MobileAppUrl",
    "DomainCnameTarget",
    "DomainATarget",
    "DefaultStockPhoto",
    "GoogleAnalyticsTag",
    "SentryDsn",
  ]),
  "frontend-parameters.json": new Set([
    "BucketName",
    "AlternateDomainName",
    "AcmCertificateArn",
    "HostedZoneId",
  ]),
  "app-config-secret.template.json": new Set([
    "hubspotKey",
    "mauticUrl",
    "mauticUser",
    "mauticPassword",
    "youTubeApiKey",
    "pexelsKey",
    "vimeoToken",
    "apiBibleKey",
    "youVersionApiKey",
    "praiseChartsConsumerKey",
    "praiseChartsConsumerSecret",
    "googleRecaptchaSecretKey",
    "openRouterApiKey",
    "openAiApiKey",
    "webPushPublicKey",
    "webPushPrivateKey",
  ]),
};

export const unsafeDefaultMatchers = {
  "backend-parameters.json": {
    LambdaCodeS3Bucket: (value) => typeof value === "string" && value.includes("replace-me"),
    DependenciesLayerArn: (value) => typeof value === "string" && value.includes("replace-me"),
    AppConfigSecretArn: (value) => typeof value === "string" && value.includes("replace-me"),
    WebsiteBaseUrl: (value) => isKnownStarterHostname(value),
    ContentRootUrl: (value) => isKnownStarterHostname(value),
    B1AdminRootUrl: (value) => isKnownStarterHostname(value),
    CorsOrigin: (value) => isKnownStarterHostname(value),
    StoreApiUrl: (value) => isKnownStarterHostname(value),
    TransferUrl: (value) => isKnownStarterHostname(value),
    SupportEmail: (value) => value === "support@example.com" || value === "support@b1.church",
    SupportPhone: (value) => value === "555-555-5555",
    SupportSiteUrl: (value) => isKnownStarterHostname(value),
  },
  "frontend-parameters.json": {
    AlternateDomainName: (value) => typeof value === "string" && value.includes("example.com"),
    AcmCertificateArn: (value) => typeof value === "string" && value.includes("replace-me"),
    HostedZoneId: (value) => value === "Z0404841L5A2UX2RE4US",
  },
  "app-config-secret.template.json": {
    webPushSubject: (value) => value === "mailto:support@example.com" || value === "mailto:support@b1.church",
  },
};

export function isKnownStarterHostname(value) {
  if (typeof value !== "string") return false;
  return [
    "example.com",
    "b1.church",
    "churchapps.org",
  ].some((hostname) => value.includes(hostname));
}

export const setupFieldMetadata = {
  "bootstrap-parameters.json": {
    TemplateBucketName: {
      phase: "first-deploy",
      label: "Bootstrap template bucket",
      rationale: "CloudFormation needs a unique S3 bucket for packaged templates.",
    },
    ArtifactBucketName: {
      phase: "first-deploy",
      label: "Bootstrap artifact bucket",
      rationale: "Backend packages and deployment artifacts are uploaded here.",
    },
  },
  "backend-parameters.json": {
    LambdaCodeS3Bucket: {
      phase: "first-deploy",
      label: "Backend artifact bucket reference",
      rationale: "Should point at the artifact bucket chosen during bootstrap.",
    },
    WebsiteBaseUrl: {
      phase: "first-deploy",
      label: "Public website URL pattern",
      rationale: "The backend uses this when generating site-facing links.",
    },
    ContentRootUrl: {
      phase: "first-deploy",
      label: "Content site root URL",
      rationale: "Needed for links back into your public content experience.",
    },
    B1AdminRootUrl: {
      phase: "first-deploy",
      label: "Admin app URL",
      rationale: "Used in callbacks, links, and CORS-related behavior.",
    },
    CorsOrigin: {
      phase: "first-deploy",
      label: "Allowed admin origin",
      rationale: "Must match the frontend URL the browser will call from.",
    },
    StoreApiUrl: {
      phase: "first-deploy",
      label: "Store API URL",
      rationale: "Needed if the app links into your store API surface.",
    },
    TransferUrl: {
      phase: "first-deploy",
      label: "Transfer URL",
      rationale: "Used anywhere the app expects the transfer service endpoint.",
    },
    SupportEmail: {
      phase: "first-deploy",
      label: "Support email",
      rationale: "Shows up in app messaging and support-related flows.",
    },
    SupportPhone: {
      phase: "first-deploy",
      label: "Support phone",
      rationale: "Shown in support and contact surfaces.",
    },
    SupportSiteUrl: {
      phase: "first-deploy",
      label: "Support site URL",
      rationale: "Used for support/help links.",
    },
    ApiCustomDomainName: {
      phase: "custom-domains",
      label: "API custom domain",
      rationale: "Optional until you want the API on your own hostname.",
    },
    ApiCertificateArn: {
      phase: "custom-domains",
      label: "API ACM certificate",
      rationale: "Only required when enabling a custom API domain.",
    },
    ApiHostedZoneId: {
      phase: "custom-domains",
      label: "API Route53 hosted zone",
      rationale: "Only required when creating DNS records for the API domain.",
    },
    MobileAppUrl: {
      phase: "integrations",
      label: "Mobile app URL",
      rationale: "Helpful metadata, but not needed to stand up the base stack.",
    },
    DomainCnameTarget: {
      phase: "integrations",
      label: "Legacy CNAME target",
      rationale: "Can be added later if your setup still uses this routing pattern.",
    },
    DomainATarget: {
      phase: "integrations",
      label: "Legacy A-record target",
      rationale: "Can be added later if your setup still uses this routing pattern.",
    },
    DefaultStockPhoto: {
      phase: "integrations",
      label: "Default stock photo",
      rationale: "Content polish only; not a first-launch blocker.",
    },
    GoogleAnalyticsTag: {
      phase: "integrations",
      label: "Google Analytics tag",
      rationale: "Optional analytics hookup.",
    },
    SentryDsn: {
      phase: "integrations",
      label: "Sentry DSN",
      rationale: "Optional observability hookup.",
    },
  },
  "frontend-parameters.json": {
    AlternateDomainName: {
      phase: "custom-domains",
      label: "Frontend custom domain",
      rationale: "Blank is fine for the first deploy; CloudFront can use its generated hostname.",
    },
    AcmCertificateArn: {
      phase: "custom-domains",
      label: "Frontend ACM certificate",
      rationale: "Only needed once you attach a custom frontend hostname.",
    },
    HostedZoneId: {
      phase: "custom-domains",
      label: "Frontend Route53 hosted zone",
      rationale: "Only needed for DNS record creation during domain cutover.",
    },
  },
  "app-config-secret.template.json": {
    jwtSecret: {
      phase: "first-deploy",
      label: "JWT secret",
      rationale: "Required for authentication and session signing.",
    },
    encryptionKey: {
      phase: "first-deploy",
      label: "Encryption key",
      rationale: "Required for encrypted app configuration and data handling.",
    },
    webPushSubject: {
      phase: "first-deploy",
      label: "Web push contact subject",
      rationale: "Should point at a real support mailbox before first live use.",
    },
    hubspotKey: {
      phase: "integrations",
      label: "HubSpot key",
      rationale: "Optional marketing integration.",
    },
    mauticUrl: {
      phase: "integrations",
      label: "Mautic URL",
      rationale: "Optional marketing automation integration.",
    },
    mauticUser: {
      phase: "integrations",
      label: "Mautic user",
      rationale: "Optional marketing automation integration.",
    },
    mauticPassword: {
      phase: "integrations",
      label: "Mautic password",
      rationale: "Optional marketing automation integration.",
    },
    youTubeApiKey: {
      phase: "integrations",
      label: "YouTube API key",
      rationale: "Optional video integration.",
    },
    pexelsKey: {
      phase: "integrations",
      label: "Pexels key",
      rationale: "Optional stock photo integration.",
    },
    vimeoToken: {
      phase: "integrations",
      label: "Vimeo token",
      rationale: "Optional video integration.",
    },
    apiBibleKey: {
      phase: "integrations",
      label: "API Bible key",
      rationale: "Optional scripture integration.",
    },
    youVersionApiKey: {
      phase: "integrations",
      label: "YouVersion API key",
      rationale: "Optional scripture integration.",
    },
    praiseChartsConsumerKey: {
      phase: "integrations",
      label: "PraiseCharts consumer key",
      rationale: "Optional worship-planning integration.",
    },
    praiseChartsConsumerSecret: {
      phase: "integrations",
      label: "PraiseCharts consumer secret",
      rationale: "Optional worship-planning integration.",
    },
    googleRecaptchaSecretKey: {
      phase: "integrations",
      label: "reCAPTCHA secret",
      rationale: "Optional anti-spam protection.",
    },
    openRouterApiKey: {
      phase: "integrations",
      label: "OpenRouter API key",
      rationale: "Optional AI integration.",
    },
    openAiApiKey: {
      phase: "integrations",
      label: "OpenAI API key",
      rationale: "Optional AI integration.",
    },
    webPushPublicKey: {
      phase: "integrations",
      label: "Web push public key",
      rationale: "Optional until you enable browser push notifications.",
    },
    webPushPrivateKey: {
      phase: "integrations",
      label: "Web push private key",
      rationale: "Optional until you enable browser push notifications.",
    },
  },
};

export function getFieldMetadata(fileName, key) {
  const explicit = setupFieldMetadata[fileName]?.[key];
  if (explicit) return explicit;

  const optional = optionalBlankKeys[fileName]?.has(key) ?? false;
  return {
    phase: optional ? "integrations" : "first-deploy",
    label: key,
    rationale: optional
      ? "This field is optional and can usually be filled later if your rollout needs it."
      : "This field should be reviewed before the first deploy.",
  };
}
