# Deployment Workbook

Use this workbook only when you want a detailed planning worksheet. For a normal guided install, start with [`start-here.md`](./start-here.md) and answer the installer questions instead of filling this workbook by hand.

This workbook can help prepare the real values for a first AWS rollout before you run either the local deploy scripts or the GitHub Actions workflow.

The checked-in starter files already define the parameter shape:

- [`staging/bootstrap-parameters.json`](./staging/bootstrap-parameters.json)
- [`staging/backend-parameters.json`](./staging/backend-parameters.json)
- [`staging/frontend-parameters.json`](./staging/frontend-parameters.json)
- [`staging/app-config-secret.template.json`](./staging/app-config-secret.template.json)
- [`prod/bootstrap-parameters.json`](./prod/bootstrap-parameters.json)
- [`prod/backend-parameters.json`](./prod/backend-parameters.json)
- [`prod/frontend-parameters.json`](./prod/frontend-parameters.json)
- [`prod/app-config-secret.template.json`](./prod/app-config-secret.template.json)

The normal install can start with `prod`. Use `staging` only when you intentionally want an optional practice deployment before prod.

## Rollout Choices

Decide these first:

1. Deployment path:
   local script or GitHub Actions
2. Backend source:
   `api-repo`, `package-manifest`, or `backend-artifact`
3. AWS auth mode for GitHub:
   `AWS_ROLE_TO_ASSUME` or static access keys
4. First-pass domain strategy:
   blank custom domains or fully wired ACM/Route53
5. Migration strategy:
   no migrations on first deploy or run Api migrations after deploy

After you decide those, generate a concrete runbook for the chosen environment before the live deploy:

- `yarn plan:environment-deploy -- --environment=prod --output=markdown`

That plan now tells you:

- whether the checked-in starter files are still blocking both local and GitHub paths
- whether only the local machine is blocked
- which deploy path is currently recommended
- which artifact name to expect from GitHub on success and on early failure

## Bootstrap Values

Fill these in for the target environment file:

- `ProjectName`
- `EnvironmentName`
- `TemplateBucketName`
- `ArtifactBucketName`
- `EnableBucketVersioning`

Recommended notes to capture beside those values:

- AWS account ID
- AWS region
- whether the bucket names are globally unique already
- whether these buckets are dedicated to this environment or shared

## Backend Values

These fields usually need the most attention before a live deploy.

### Packaging And Runtime

Confirm or replace:

- `LambdaCodeS3Bucket`
- `LambdaCodeS3Key`
- `DependenciesLayerArn`
- `ObservabilityLayerArn`
- `LambdaNodeOptions`
- `EnableWebSocketApi`
- `EnableScheduledWorkers`

If you are using a manifest or direct backend artifact path, confirm that the S3 bucket/key values still match the artifact strategy you intend to run.

### Database And Network

Confirm these values are deliberate:

- `DatabaseName`
- `MembershipDatabaseName`
- `AttendanceDatabaseName`
- `ContentDatabaseName`
- `GivingDatabaseName`
- `MessagingDatabaseName`
- `DoingDatabaseName`
- `ReportingDatabaseName`
- `DatabaseEngine`
- `DatabasePort`
- `DatabaseMasterUsername`
- `DatabaseMinCapacity`
- `DatabaseMaxCapacity`
- `CreateNatGateway`
- `VpcCidr`
- `PublicSubnet1Cidr`
- `PublicSubnet2Cidr`
- `PrivateSubnet1Cidr`
- `PrivateSubnet2Cidr`

Capture one extra decision here:

- whether the CIDR ranges overlap anything else in the target AWS account

### URLs And Public App Settings

These are the values most likely to need replacement on day one:

- `WebsiteBaseUrl`
- `ContentRootUrl`
- `B1AdminRootUrl`
- `CorsOrigin`
- `StoreApiUrl`
- `TransferUrl`
- `SupportEmail`
- `SupportPhone`
- `SupportSiteUrl`
- `MobileAppUrl`

If you are doing a domain-light first pass, decide which of these should point at temporary AWS-generated hostnames and which should stay on your real domains.

### Domain And DNS

Fill these only if you are enabling custom API domains on the first rollout:

- `ApiCustomDomainName`
- `ApiCertificateArn`
- `ApiHostedZoneId`
- `DomainCnameTarget`
- `DomainATarget`

### Optional Integrations

Review whether these should stay blank or be configured now:

- `AppConfigSecretArn`
- `MailSystem`
- `DeliveryProvider`
- `AiProvider`
- `EmailOnRegistration`
- `CaddyHost`
- `CaddyPort`
- `DefaultStockPhoto`
- `GoogleAnalyticsTag`
- `SentryDsn`

## Frontend Values

For the first pass, these are usually enough to review:

- `BucketName`
- `AlternateDomainName`
- `AcmCertificateArn`
- `HostedZoneId`
- `PriceClass`

If you are intentionally delaying custom-domain cutover, leave the domain and certificate values blank and keep a note that the first verification should use the CloudFront URL.

## App Config Secret Values

At minimum, replace these with real secrets:

- `jwtSecret`
- `encryptionKey`

Then decide which of the optional keys must be present before the first live run:

- `hubspotKey`
- `mauticUrl`
- `mauticUser`
- `mauticPassword`
- `youTubeApiKey`
- `pexelsKey`
- `vimeoToken`
- `apiBibleKey`
- `youVersionApiKey`
- `praiseChartsConsumerKey`
- `praiseChartsConsumerSecret`
- `googleRecaptchaSecretKey`
- `openRouterApiKey`
- `openAiApiKey`
- `webPushPublicKey`
- `webPushPrivateKey`
- `webPushSubject`

If GitHub Actions will manage the secret sync, mirror the same JSON into the `AWS_APP_CONFIG_SECRET_JSON` environment secret.

## GitHub Actions Inputs

If you are using [`.github/workflows/deploy-aws-self-hosted.yml`](../../.github/workflows/deploy-aws-self-hosted.yml), pre-decide these values before your first run:

- `environment`
- `aws_region`
- `deployment_source`
- `api_repo`
- `api_ref`
- `package_manifest_file`
- `backend_artifact_source_file`
- `migration_artifact_source_file`
- `dependencies_layer_source_file`
- `sync_app_config_secret`
- `sync_bootstrap_admin_secret`
- `run_api_migrations`
- `run_bootstrap_admin`
- `api_migration_action`
- `api_migration_module`
- `verify_http_after_deploy`

Recommended first-run defaults:

- `environment=prod`
- `deployment_source=api-repo` if the workflow can check out the Api repo cleanly
- `sync_app_config_secret=false` until the secret JSON is final
- `run_api_migrations=false` until the base stack is healthy
- `verify_http_after_deploy=false` unless the public hostname is already expected to answer

Recommended deployment-source choices:

- `api-repo` when the runner can check out the Api repo and package it directly
- `package-manifest` when CI already produced a checked-in or attached manifest plus artifact set
- `backend-artifact` when you only want to push a prepared backend zip and optional layer/migration zips

## Local Script Inputs

If you are using the local environment script instead, pre-decide these env vars:

- `AWS_REGION`
- `API_REPO_PATH`
- `PACKAGE_MANIFEST_FILE`
- `BACKEND_ARTIFACT_SOURCE_FILE`
- `MIGRATION_ARTIFACT_SOURCE_FILE`
- `DEPENDENCIES_LAYER_SOURCE_FILE`
- `BOOTSTRAP_STACK_NAME`
- `SYNC_APP_CONFIG_SECRET`
- `RUN_API_MIGRATIONS`
- `API_MIGRATION_ACTION`
- `API_MIGRATION_MODULE`
- `VERIFY_AFTER_DEPLOY`
- `VERIFY_HTTP_AFTER_DEPLOY`

Recommended local-source choices:

- leave `PACKAGE_MANIFEST_FILE` and `BACKEND_ARTIFACT_SOURCE_FILE` unset when `API_REPO_PATH` should drive packaging
- set `PACKAGE_MANIFEST_FILE` when you want to reuse an earlier `package:api-backend` result
- set `BACKEND_ARTIFACT_SOURCE_FILE` when the backend zip already exists outside the Api repo

If the target machine can see `API_REPO_PATH` but cannot actually read that checkout or its `package.json`, prefer `PACKAGE_MANIFEST_FILE` or `BACKEND_ARTIFACT_SOURCE_FILE` for the local run instead of trying to force the script through the unreadable repo.

## Evidence To Save After Deploy

After the first rollout, save these somewhere durable:

- bootstrap stack name
- backend stack name
- frontend stack name
- AWS region
- Secrets Manager secret names
- backend outputs JSON
- frontend outputs JSON
- final workflow inputs or local env vars used
- whether migrations ran
- whether the deploy used `api-repo`, `package-manifest`, or `backend-artifact`

That record will make later updates or optional staging/prod comparisons much less error-prone.

The quickest way to save that evidence into the repo workspace is:

- `yarn save:split-stack-outputs -- --environment=prod --region=<aws-region>`

That helper writes:

- `deployment/prod/backend-outputs.json`
- `deployment/prod/frontend-outputs.json`
- `deployment/prod/deployment-summary.json`

If `deployment/prod/preflight-plan.md` exists too, the saved summary will reference it so the preflight context stays attached to the final deployment evidence.

For GitHub Actions runs, expect:

- `aws-prod-deployment-evidence` after a successful deploy
- `aws-prod-preflight-plan` if the deploy fails before the full evidence bundle is created

After you choose the deployment source and auth path, you can generate a concrete local and GitHub Actions run plan with:

- `yarn plan:environment-deploy -- --environment=prod --output=markdown`
