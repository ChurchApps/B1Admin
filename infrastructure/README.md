# AWS Deployment

This repo now includes AWS deployment building blocks for both the B1Admin frontend and a backend foundation:

- Bootstrap stack: [`cloudformation/bootstrap.yaml`](./cloudformation/bootstrap.yaml)
- Frontend stack: [`cloudformation/frontend-site.yaml`](./cloudformation/frontend-site.yaml)
- Backend stack: [`cloudformation/backend-api.yaml`](./cloudformation/backend-api.yaml)
- Full-stack nested template: [`cloudformation/full-stack.yaml`](./cloudformation/full-stack.yaml)
- Full deployment wrapper: [`../scripts/deploy-aws.mjs`](../scripts/deploy-aws.mjs)
- Nested-stack deploy helper: [`../scripts/deploy-full-stack.mjs`](../scripts/deploy-full-stack.mjs)

## What This Repo Owns

- S3 bucket for frontend assets
- CloudFront distribution with SPA routing fallback
- Optional Route53 alias record
- Asset upload + cache invalidation workflow
- Backend VPC with public/private subnets
- Optional NAT gateway for private Lambda egress
- Private AWS service endpoints for S3 and Secrets Manager when NAT is disabled
- Aurora Serverless v2 cluster
- Lambda execution role and VPC networking
- HTTP API Gateway in front of the backend Lambda
- Default server-side encryption on deployment and frontend S3 buckets
- Aurora cluster snapshot preservation on stack delete or replacement
- Retained S3 buckets so stack teardown does not fail on non-empty deployment buckets
- Common runtime IAM for WebSocket management, S3 asset storage, SES mail sending, and Polly speech synthesis

## What This Repo Does Not Own

This repo still does not contain the backend API application source or database migrations. The infrastructure here can provision the AWS foundation, but you still need:

- A packaged backend Lambda artifact uploaded to S3
- API application code that can run inside Lambda
- Database schema migrations and optional initial-admin bootstrap data
- Any additional supporting services your backend uses

The frontend should still treat backend/public values as inputs, not assumptions.

If you also have the real Api repo checked out locally, this repo now includes a backend packaging helper:

- `yarn package:api-backend -- --api-repo-path=<api-repo-path>`
- `yarn audit:api-repo-contract -- --api-repo-path=<api-repo-path> --output=markdown`

By default it builds the Api repo and creates a self-contained Lambda zip that works with the current CloudFormation backend path. It can also package a layered artifact set with `--package-mode=layered` when you want to stay closer to the Api repo's current Serverless packaging model.
The first successful live private-repo staging rollout on June 24, 2026 ultimately required the layered path because the self-contained Api artifact exceeded Lambda's 250 MB unzipped limit.
The helper now works with the Api repo's Yarn Berry setup through Corepack, so it does not require a globally installed `yarn` binary as long as `corepack` is available.
If the referenced Api repo path exists but key files are unreadable in the current environment, the helper now fails early with a direct readability error instead of falling through into a later Corepack/Yarn child-process failure.
There is also a layer publication helper when you want to promote a packaged dependency layer into AWS directly:

- `yarn publish:lambda-layer -- --layer-name=<name> --source-file=<zip>`

And there is now a Secrets Manager sync helper for the backend's non-database runtime config:

- `yarn sync:app-config-secret -- --secret-name=<name> --secret-file=infrastructure/examples/app-config-secret.sample.json`

If you want the same JSON pushed into a GitHub Actions deployment environment secret for the self-hosted workflow, there is also:

- `yarn sync:github-app-config-secret -- --environment=staging --secret-file=infrastructure/environments/staging/app-config-secret.json`

And if you want one wrapper to sync that GitHub environment secret first and then dispatch the workflow with the checked inputs, there is also:

- `yarn dispatch:github-aws-deploy -- --environment=staging --deployment-source=api-repo --repo=ChurchApps/B1Admin`

That wrapper now checks `gh auth status` even in `--dry-run=true` mode so a local validation run only reports success when this machine can really use GitHub CLI for the next step. It now distinguishes missing `gh`, invalid GitHub auth, and basic connectivity failures to `github.com`. If you need an offline/test-only dry run, pass `--skip-gh-auth-check=true`.

If you still rely on the real Api repo's legacy Parameter Store layout, there is also an SSM compatibility helper:

- `yarn sync:legacy-ssm -- --stack-name=<backend-or-full-stack> --environment=prod --app-config-secret-file=infrastructure/examples/app-config-secret.sample.json`

## Real Api Repo Contract

The real backend repo, typically checked out beside this repo at a path such as `../Api`, uses a more specific Lambda contract than a generic single-handler API:

- primary HTTP Lambda handler: `lambda.web`
- runtime: `nodejs22.x`
- additional Lambda entrypoints in the same package for WebSocket and timer workloads
- deploy-time config in Serverless today is sourced heavily from SSM Parameter Store
- application boot expects `ENVIRONMENT` or `STAGE`, not just `APP_ENV`
- application boot expects MySQL-style per-module connection strings such as `MEMBERSHIP_CONNECTION_STRING`

The templates in this repo now default the main backend Lambda to `lambda.web` on `nodejs22.x`, and they set `ENVIRONMENT` plus `STAGE` alongside `APP_ENV`.
They also now default the database layer toward Aurora MySQL and generate module-specific MySQL connection strings for membership, attendance, content, giving, messaging, doing, and reporting, plus `DOING_MEMBERSHIP_CONNECTION_STRING`.
They can also provision the Api repo's `lambda.socket` WebSocket handler and the scheduled timer handlers from the same packaged artifact.
They now also expose the Api repo's core runtime config knobs for file storage, mail system, delivery provider, admin URL, store API URL, socket URL, and CORS without needing a separate Serverless-only config layer for those basics.
They also support an optional `AppConfigSecretArn` that can supply the Api repo's non-database secrets and provider keys from a single Secrets Manager JSON document.
They now also support optional Lambda layer ARNs plus `NODE_OPTIONS`, so you can deploy either a fully self-contained backend zip or a packaging flow closer to the Api repo's current Serverless layer setup.
The deployment helpers now also capture the S3 `VersionId` returned by the artifact bucket and pass it into CloudFormation, so backend redeploys pick up changed zip contents even when the artifact key stays the same.

There are still important gaps between the current CloudFormation backend stack and the full Api repo deployment model:

- it still reads many deploy-time secrets/config values from SSM Parameter Store today
- the existing Serverless deployment uses a broader IAM/service integration footprint than this stack currently models
- the exact backend packaging/build pipeline is still driven from the Api repo, not from this repo

That means the current backend template is closer to an AWS hosting foundation for the Api repo than a one-to-one replacement for its existing `serverless.yml`.

## Stack Layout

### `bootstrap`

The bootstrap template provisions:

- S3 bucket for nested CloudFormation templates
- S3 bucket for Lambda/build artifacts
- Server-side encryption on both buckets by default
- CloudFormation retain policies on both buckets to avoid deleting shared deployment assets automatically

Use it once per environment or account before the other deployment flows if you do not already have suitable buckets.

### `backend-api`

The backend template provisions:

- VPC
- 2 public subnets
- 2 private subnets
- Optional NAT gateway
- Private S3 gateway endpoint and Secrets Manager interface endpoint when NAT is disabled
- Lambda security group
- Aurora Serverless v2 cluster and writer instance
- HTTP API Gateway
- Optional WebSocket API Gateway wired to `lambda.socket`
- Optional scheduled worker Lambdas for the Api repo timer handlers
- Lambda function sourced from a packaged zip in S3
- Optional managed S3 asset/content bucket for uploaded media when `FileStore=S3`
- IAM permissions for WebSocket connection management, optional asset-bucket S3 access, SES sending when `MailSystem=SES`, and Polly speech synthesis

The Aurora cluster now uses CloudFormation `DeletionPolicy: Snapshot` and `UpdateReplacePolicy: Snapshot`, so accidental stack deletion or cluster replacement preserves a final DB snapshot instead of dropping the data immediately.

The backend template now also generates its own Secrets Manager database password with a URL-safe character set instead of relying on Aurora's opaque managed password generation. That matters because the real Api repo currently consumes MySQL connection URLs from environment variables, and unescaped `@` or `/` characters in a generated password can break that parser.

### `frontend-site`

The frontend template provisions:

- S3 asset bucket
- CloudFront distribution
- Optional Route53 alias records
- Server-side encryption on the asset bucket by default
- CloudFormation retain policy on the asset bucket so uploaded site files are not auto-deleted during stack teardown

Because these buckets are retained, deleting the related CloudFormation stack will leave the S3 buckets behind. If you intentionally want to remove them, empty and delete the buckets manually after the stack is gone.

### `deploy:aws`

The wrapper script deploys the backend stack first, then deploys the frontend stack while automatically importing backend outputs into the frontend build. If you already have a saved backend outputs JSON, you can now pass `--backend-outputs-file=...` to the split-stack wrapper so the frontend half reuses that file instead of reading the backend stack directly. In the later staged publish-only phase (`--skip-backend --skip-frontend --publish-frontend-assets`), it no longer needs the bootstrap stack because that step only reuses existing frontend/backend stack outputs.

### `full-stack`

The full-stack CloudFormation template composes the backend and frontend templates as nested stacks. It is best when you want a single infrastructure stack entrypoint, and the `deploy:full-stack` helper now also builds and publishes the frontend bundle unless you pass `--infrastructure-only` or `--frontend-infrastructure-only`. For a later frontend-only publish pass against an existing full-stack deployment, the helper also supports `--skip-infrastructure --publish-frontend-assets`, and that publish-only phase no longer depends on the bootstrap stack because it reuses the already-deployed full-stack outputs. It can also now publish from saved frontend/backend outputs files, or direct bucket/distribution values, when you do not want that later phase to read the full-stack CloudFormation outputs again.

The full-stack outputs now surface not just frontend publishing values, but also the main backend operational values from the nested backend stack, including:

- API function name and ARN
- migration function name
- socket function name, WebSocket API ID, and WebSocket endpoint
- scheduled worker function names
- database endpoint, reader endpoint, cluster ARN, port, name, module DB names, and secret ARN
- VPC ID, private subnet IDs, and Lambda security group ID

Across the helper scripts, CLI flags can also be supplied via environment variables using uppercase underscore names. For example, `--backend-outputs-file` can come from `BACKEND_OUTPUTS_FILE`, and `--stack-name` can come from `STACK_NAME`.

## Packaging The Real Api Repo

If the backend source lives beside this repo, the simplest portable path is:

1. Build and package the backend:
   `yarn package:api-backend -- --api-repo-path=<api-repo-path> --environment=prod`
2. Upload the produced backend zip:
   `yarn upload:backend-artifact -- --bootstrap-stack-name=<bootstrap-stack> --source-file=infrastructure/artifacts/api/api-prod-self-contained.zip --artifact-key=b1admin/backend/api.zip`
3. Deploy the backend or full stack with the matching `LambdaCodeS3Key`.

If your CI flow also builds a separate migration zip, you can attach it to the same manifest contract up front:

- `yarn package:api-backend -- --api-repo-path=<api-repo-path> --environment=prod --migration-artifact-path=infrastructure/artifacts/api/api-prod-migrations.zip`

All of the helpers that accept `--api-repo-path` also honor `API_REPO_PATH=<api-repo-path>` if that is easier for your local shell or CI environment.
If your CI pipeline already ran `package:api-backend`, the higher-level deploy helpers now also accept `--package-manifest-file=<manifest-path>` so they can reuse the generated backend artifact and optional layer artifact without re-inspecting the Api repo checkout. That same manifest path also works with `validate:aws-deploy`, and its suggested `upload:backend-artifact` follow-up will reuse the manifest's saved artifact path directly.
The `package:api-backend -- --output=json` result and the written manifest now also include:

- `recommendedBackendArtifactKey`
- `recommendedMigrationArtifactKey`
- manifest-driven `deploy:backend`, `deploy:aws`, and `deploy:full-stack` next-step hints
- an optional `migrationArtifactPath` when you want the same manifest contract to carry a separate migration zip too

Artifact paths inside that manifest can now be relative to the manifest file itself, which makes the manifest portable across different local checkout paths and CI workspaces. A machine-readable sample of the direct `package:api-backend -- --output=json` result is included at [`examples/package-api-backend-output.sample.json`](./examples/package-api-backend-output.sample.json). The written manifest shape is also documented at [`examples/package-manifest.sample.json`](./examples/package-manifest.sample.json). The smoke suite contract-checks both samples against representative `package:api-backend -- --output=json` runs so they do not silently drift.

The packaging helper supports two modes:

- `self-contained`:
  Builds a Lambda zip that includes `dist`, `config`, `lambda.js`, `package.json`, and `node_modules`. This is still useful for smaller backend builds, but the live June 24, 2026 staging rollout showed that the current Api package can exceed Lambda's 250 MB unzipped limit in this mode.
- `layered`:
  Builds the Serverless-style main zip plus a separate `layer` zip. Use this when you want to stay closer to the Api repo's current packaging model. It is now the safer default for the AWS environment wrappers because it keeps the function zips below Lambda's unzipped size limit. The deploy wrappers publish the layer for you and pass its ARN through `DependenciesLayerArn`.

If you want fewer manual steps, the higher-level deploy wrappers can now call that packaging helper for you when you point them at the Api repo:

- `yarn deploy:backend -- --bootstrap-stack-name=<bootstrap-stack> --api-repo-path=<api-repo-path> --package-mode=self-contained`
- `yarn deploy:aws -- --api-repo-path=<api-repo-path> --package-mode=layered ...`
- `yarn deploy:full-stack -- --api-repo-path=<api-repo-path> --package-mode=layered ...`

Or, if packaging already happened elsewhere:

- `yarn deploy:backend -- --package-manifest-file=infrastructure/artifacts/api/api-prod-self-contained.manifest.json ...`
- `yarn deploy:aws -- --package-manifest-file=infrastructure/artifacts/api/api-prod-self-contained.manifest.json ...`
- `yarn deploy:full-stack -- --package-manifest-file=infrastructure/artifacts/api/api-prod-self-contained.manifest.json ...`

For the layered variant:

- `yarn deploy:backend -- --bootstrap-stack-name=<bootstrap-stack> --api-repo-path=<api-repo-path> --package-mode=layered`
- `yarn deploy:aws -- --api-repo-path=<api-repo-path> --package-mode=layered ...`
- `yarn deploy:full-stack -- --api-repo-path=<api-repo-path> --package-mode=layered ...`

When those wrappers upload a backend artifact for you and you do not pass an explicit key, they now default to:

- backend artifact: `<project>/<environment>/backend/api.zip`
- migration artifact: `<project>/<environment>/backend/migrations.zip`

The `--api-repo-path` wrapper flows still require the Api repo to have already run `corepack yarn install`, because the packaging helper builds from the real local checkout. The `--package-manifest-file` path does not have that requirement because it only reuses already-packaged artifacts.
If your machine can see the sibling Api checkout but local commands still fail with a permissions/readability error such as `Operation not permitted`, treat that the same as an unreadable local repo path: switch the local run to `--package-manifest-file=...` or `--backend-artifact-source-file=...`, or use the GitHub Actions `api-repo` path if that runner can read the backend repo.
When you are preparing the environment starter files, `prepare:environment-starter --write=true --write-secret-file=false` now lets you write the non-secret bootstrap/backend/frontend JSON first without materializing `app-config-secret.json` yet. The same helper also accepts `--mobile-app-url`, `--domain-cname-target`, `--domain-a-target`, `--default-stock-photo`, and `--google-analytics-tag` for the optional public runtime fields surfaced by the backend stack.
If you want a lower-risk first pass before packaging, `audit:api-repo-contract` checks the sibling Api repo for the expected `lambda.web`, `lambda.socket`, timer handlers, migration-module hints, build scripts, and package-layout readiness.

### Local Api Repo Access Troubleshooting

If a sibling checkout such as `../Api` is visible on disk but local commands still fail with a permissions/readability error, the quickest local fallbacks are:

- reuse a manifest that was already produced elsewhere:
  `yarn deploy:aws -- --package-manifest-file=<manifest-path> ...`
- reuse a prepared backend zip directly:
  `yarn deploy:aws -- --backend-artifact-source-file=<backend-zip-path> ...`
- generate a full local fallback plan first:
  `yarn plan:environment-deploy -- --environment=staging --deployment-source=package-manifest --package-manifest-file=<manifest-path> --output=markdown`
- or:
  `yarn plan:environment-deploy -- --environment=staging --deployment-source=backend-artifact --backend-artifact-source-file=<backend-zip-path> --output=markdown`

The same unreadable-repo guidance now appears in `plan:environment-deploy`, `validate:aws-deploy`, and the split-stack environment scripts, so any of those entrypoints should now point you back to the same manifest/artifact alternatives.

For that layered path you can now either publish the layer manually:

- `yarn publish:lambda-layer -- --region=us-east-1 --layer-name=b1admin-prod-dependencies --source-file=infrastructure/artifacts/api/api-prod-dependencies-layer.zip`

Or let the higher-level deploy wrappers publish it for you:

- `yarn deploy:backend -- --api-repo-path=<api-repo-path> --package-mode=layered ...`
- `yarn deploy:aws -- --dependencies-layer-source-file=infrastructure/artifacts/api/api-prod-dependencies-layer.zip ...`
- `yarn deploy:full-stack -- --dependencies-layer-source-file=infrastructure/artifacts/api/api-prod-dependencies-layer.zip ...`

## Frontend Stack Inputs

The CloudFormation template accepts these parameters:

- `ProjectName`: naming/tagging prefix
- `EnvironmentName`: `dev`, `staging`, `prod`, or similar
- `BucketName`: optional explicit S3 bucket name
- `AlternateDomainName`: optional custom domain such as `admin.example.com`
- `AcmCertificateArn`: optional ACM cert in `us-east-1`, required with a custom domain
- `HostedZoneId`: optional Route53 zone ID for automatic alias record creation
- `PriceClass`: CloudFront price class

## Bootstrap Stack Inputs

The bootstrap template accepts:

- `ProjectName`
- `EnvironmentName`
- `TemplateBucketName`
- `ArtifactBucketName`
- `EnableBucketVersioning`

## Backend Stack Inputs

The backend template accepts:

- `ProjectName`
- `EnvironmentName`
- `LambdaCodeS3Bucket`
- `LambdaCodeS3Key`
- `LambdaHandler`
- `LambdaRuntime`
- `LambdaArchitecture`
- `LambdaMemorySize`
- `LambdaTimeout`
- `LambdaReservedConcurrency`
- `DependenciesLayerArn`
- `ObservabilityLayerArn`
- `LambdaNodeOptions`
- `EnableWebSocketApi`
- `SocketLambdaHandler`
- `SocketLambdaMemorySize`
- `SocketLambdaTimeout`
- `EnableScheduledWorkers`
- `Timer15MinLambdaHandler`
- `TimerMidnightLambdaHandler`
- `TimerScheduledTasksLambdaHandler`
- `TimerWebhooksLambdaHandler`
- `TimerLambdaMemorySize`
- `TimerLambdaTimeout`
- `RunMigrations`
- `MigrationCodeS3Bucket`
- `MigrationCodeS3Key`
- `MigrationHandler`
- `MigrationRuntime`
- `MigrationMemorySize`
- `MigrationTimeout`
- `MigrationTrigger`
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
- `ApiCustomDomainName`
- `ApiCertificateArn`
- `ApiHostedZoneId`
- `CreateNatGateway`
- `B1AdminRootUrl`
- `CorsOrigin`
- `FileStore`
- `ManageAssetBucket`
- `AssetBucketName`
- `AppConfigSecretArn`
- `MailSystem`
- `DeliveryProvider`
- `StoreApiUrl`
- `AiProvider`
- `EmailOnRegistration`
- `CaddyHost`
- `CaddyPort`
- VPC and subnet CIDRs
- Optional public/frontend-facing values such as `WebsiteBaseUrl`, `ContentRootUrl`, `TransferUrl`, `SupportEmail`, and related settings

When `CreateNatGateway=false`, the stack now creates the minimum private AWS endpoints needed for this deployment path itself:

- S3 gateway endpoint so the migration custom resource can return its CloudFormation response without public internet access
- Secrets Manager interface endpoint so Lambda can read the Aurora master secret without public internet access

If your backend needs any other outbound internet access or private AWS APIs, you should either leave NAT enabled or add the extra VPC endpoints your application requires.

For the real Api repo, the current backend stack now injects MySQL-style connection strings for all module databases. The membership database name defaults from `DatabaseName`, while the other module DB names default to `attendance`, `content`, `giving`, `messaging`, `doing`, and `reporting` unless you override them with the explicit `*DatabaseName` parameters.
It also injects the core non-database runtime settings the Api repo reads from `Environment.ts`, including `CONTENT_ROOT`, `B1ADMIN_ROOT`, `FILE_STORE`, `AWS_S3_BUCKET`, `MAIL_SYSTEM`, `DELIVERY_PROVIDER`, `STORE_API_URL`, `CORS_ORIGIN`, `SOCKET_URL`, and `WEBSOCKET_API_ID`.
If `FileStore=S3` and you leave both `AssetBucketName` and `ContentRootUrl` blank, the backend stack can now create a managed content bucket for you when `ManageAssetBucket=true` and infer `CONTENT_ROOT` from that bucket's regional S3 URL.
If you want to stay closer to the Api repo's current Serverless packaging model, you can also provide `DependenciesLayerArn`, `ObservabilityLayerArn`, and `LambdaNodeOptions` instead of forcing everything into one zip. Only set `LambdaNodeOptions` for imports such as `@sentry/aws-serverless/awslambda-auto` when the referenced package is actually present in the deployed zip or layer artifact.
The Lambda role now also includes the common AWS permissions this repo most clearly needs at runtime: WebSocket connection management, S3 access for the configured asset bucket, SES send actions when `MailSystem=SES`, and Polly speech synthesis.

If you set `AppConfigSecretArn`, the backend Lambdas will also read additional non-database secrets/config from that Secrets Manager JSON document using dynamic references. The expected JSON keys currently include:

- `jwtSecret`
- `encryptionKey`
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

A sample JSON shape for that secret now lives at [`examples/app-config-secret.sample.json`](./examples/app-config-secret.sample.json).
At minimum, treat `jwtSecret` and `encryptionKey` as required non-empty values for a viable self-hosted backend boot path.
For a real environment, also replace the starter `webPushSubject` mailbox instead of leaving it at `mailto:support@example.com`.
If you want fewer manual steps, the deploy helpers can now sync that secret for you and resolve `AppConfigSecretArn` automatically:

- `yarn deploy:backend -- --app-config-secret-file=infrastructure/examples/app-config-secret.sample.json ...`
- `yarn deploy:aws -- --app-config-secret-file=infrastructure/examples/app-config-secret.sample.json ...`
- `yarn deploy:full-stack -- --app-config-secret-file=infrastructure/examples/app-config-secret.sample.json ...`

## Migration Reality Check

The CloudFormation templates support an optional migration Lambda/custom-resource flow, but the real Api repo currently ships CLI-oriented migration tooling in `tools/migrate.ts`, not a proven Lambda handler such as `dist/migrate.handler`.

That means:

- the migration fields in these templates are still useful as an integration point
- but for the current real Api repo, `RunMigrations=true` should currently be treated as a custom extension you still need to implement and verify
- the sample backend/full-stack parameter files now default `RunMigrations` to `false` to avoid implying that a ready-made Lambda migration handler already exists

For the real Api repo, this repo now includes a helper to run those CLI migrations against a deployed AWS database by reading stack outputs plus the Aurora secret and exporting the expected `*_CONNECTION_STRING` env vars:

```bash
yarn run:api-migrations -- \
  --api-repo-path=<api-repo-path> \
  --stack-name=b1admin-prod-backend \
  --action=up \
  --module=all \
  --region=us-east-1
```

If you want to test the resolved migration command/env wiring locally without touching AWS, use the sample files:

```bash
yarn run:api-migrations -- \
  --api-repo-path=<api-repo-path> \
  --outputs-file=infrastructure/examples/backend-stack-outputs.sample.json \
  --db-secret-file=infrastructure/examples/database-secret.sample.json \
  --action=status \
  --module=all \
  --dry-run=true \
  --output=json
```

You can preflight that standalone migration helper before running it:

```bash
yarn validate:aws-deploy -- \
  --mode=api-migrations \
  --api-repo-path=<api-repo-path> \
  --outputs-file=infrastructure/examples/backend-stack-outputs.sample.json \
  --db-secret-file=infrastructure/examples/database-secret.sample.json \
  --action=status \
  --module=all \
  --dry-run=true \
  --output=json
```

## Bootstrapping The First Admin Login

Fresh AWS environments do not get a default sign-in automatically from migrations alone. To make that repeatable without loading demo data, this repo now includes an Aurora Data API helper that seeds:

- one admin user
- one church record
- the standard `Domain Admins` and `All Members` roles
- the linking `person`, `userChurch`, and `roleMembers` rows

Start from [`examples/bootstrap-admin-secret.sample.json`](./examples/bootstrap-admin-secret.sample.json), copy it to a private file, and replace every placeholder value.

Then run:

```bash
yarn run:bootstrap-admin -- \
  --stack-name=b1admin-prod-backend \
  --region=us-east-1 \
  --bootstrap-admin-secret-file=/absolute/path/to/bootstrap-admin-secret.json
```

If you only want to verify the resolved target before touching AWS, add `--dry-run=true --output=json`.

The helper is idempotent. On rerun it will:

- reuse the existing church by subdomain
- reuse the existing user by email
- repair any missing role, permission, `person`, `userChurch`, or `roleMembers` rows
- reset the bootstrap user's password again by default

If you do not want reruns to overwrite that password, add:

```bash
--bootstrap-admin-reset-password=false
```

You can also have the main deploy helpers run this step immediately after a successful backend deploy and optional Api migrations:

```bash
yarn deploy:aws -- \
  --bootstrap-stack-name=b1admin-prod-bootstrap \
  --api-repo-path=<api-repo-path> \
  --run-api-migrations=true \
  --run-bootstrap-admin=true \
  --bootstrap-admin-secret-file=/absolute/path/to/bootstrap-admin-secret.json
```

The same flags are also supported by:

- `yarn deploy:backend`
- `yarn deploy:full-stack`

For GitHub Actions or other workflow-driven deploys, the workflow-side deploy role needs Aurora Data API transaction permissions plus `secretsmanager:GetSecretValue` if the bootstrap helper runs from the workflow host.

That helper is a post-deploy operational step, not a CloudFormation custom resource, but it closes much of the gap between the current AWS infrastructure path and the real Api repo's migration model.

The helper URL-encodes database usernames, passwords, and schema names when it builds `mysql://...` connection strings, so it is safer with real Secrets Manager values that contain reserved URI characters.
It also supports targeted module runs with only the outputs for that module, so `--module=attendance` does not require the full set of module database names.
For the current real Api repo specifically, `--module=all` follows the backend repo's own migration module list, which currently excludes reporting.
The helper and validator will also warn if you target a module that currently has no `tools/migrations/<module>` directory in the Api repo, so unsupported direct runs are easier to spot before deployment.
When that happens, `validate:aws-deploy` now avoids suggesting a follow-up `run:api-migrations` command for that unsupported module.
Outside `--dry-run=true`, the helper now refuses direct runs for modules with no migration directory instead of succeeding with a silent skip.
The backend, split-stack, and full-stack deploy wrappers now fail before deployment for the same unsupported direct-migration targets, and they also fail early when the target Api repo is missing installed dependencies for a real non-dry-run migration.
The standalone `--mode=api-migrations` validator path follows the same rule and no longer suggests a follow-up command for unsupported non-dry-run module targets either.
The split-stack and full-stack wrappers also now reject impossible rollout combinations such as `--run-api-migrations=true` together with `--skip-backend` or `--skip-infrastructure`, instead of failing later for a less relevant reason.
They also now reject invalid `api-migration-action` and `api-migration-module` values before broader deploy preconditions like bucket or stack checks get involved.
The frontend publish helpers now do the same kind of early local validation for `--skip-build`: they fail immediately if `dist/` or `dist/sw.js` is missing, instead of reaching AWS stack or hosting operations first.

If you want fewer manual steps, `deploy:backend` and `deploy:full-stack` can now invoke that helper for you as an optional post-deploy phase, and `deploy:aws` passes those flags through to the backend deploy:

- `yarn deploy:backend -- --stack-name=b1admin-prod-backend --bootstrap-stack-name=b1admin-prod-bootstrap --api-repo-path=<api-repo-path> --run-api-migrations=true --api-migration-action=up --api-migration-module=all`
- `yarn deploy:aws -- --bootstrap-stack-name=b1admin-prod-bootstrap --api-repo-path=<api-repo-path> --run-api-migrations=true --api-migration-action=up --api-migration-module=all`
- `yarn deploy:full-stack -- --stack-name=b1admin-prod --bootstrap-stack-name=b1admin-prod-bootstrap --api-repo-path=<api-repo-path> --run-api-migrations=true --api-migration-action=up --api-migration-module=all`

You can add `--api-migration-dry-run=true` when you want the wrapper to resolve the connection-string wiring without actually executing migrations.

## Frontend Runtime Inputs

Build-time environment variables control where the deployed frontend points:

- `REACT_APP_STAGE`
- `REACT_APP_API_BASE`
- `REACT_APP_CONTENT_ROOT`
- `REACT_APP_B1_WEBSITE_URL`
- `REACT_APP_LESSONS_API`
- `REACT_APP_GOOGLE_ANALYTICS`
- `REACT_APP_SENTRY_DSN`
- `REACT_APP_TRANSFER_URL`
- `REACT_APP_SUPPORT_EMAIL`
- `REACT_APP_SUPPORT_PHONE`
- `REACT_APP_SUPPORT_SITE_URL`
- `REACT_APP_MOBILE_APP_URL`
- `REACT_APP_DOMAIN_CNAME_TARGET`
- `REACT_APP_DOMAIN_A_TARGET`
- `REACT_APP_DEFAULT_STOCK_PHOTO`
- `REACT_APP_CHAT_MODE`

For a portable deployment, the backend stack should output at least `REACT_APP_API_BASE` and `REACT_APP_CONTENT_ROOT`, and your deployment pipeline should inject them during the frontend build.

## Deploying The Frontend

Example:

```bash
REACT_APP_API_BASE=https://api.example.com \
REACT_APP_CONTENT_ROOT=https://content.example.com \
REACT_APP_B1_WEBSITE_URL=https://{subdomain}.example.com \
yarn deploy:frontend -- \
  --stack-name=b1admin-prod-frontend \
  --region=us-east-1 \
  --environment=prod \
  --project-name=b1admin \
  --alternate-domain-name=admin.example.com \
  --acm-certificate-arn=arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  --hosted-zone-id=Z1234567890ABC
```

If your backend stack already exposes public outputs, you can let the deploy script import them directly:

```bash
yarn deploy:frontend -- \
  --stack-name=b1admin-prod-frontend \
  --backend-stack-name=b1admin-prod-backend
```

You can also point at a saved JSON outputs file or raw `describe-stacks` output file:

```bash
yarn deploy:frontend -- \
  --stack-name=b1admin-prod-frontend \
  --backend-outputs-file=deployment/backend-outputs.json
```

A sample backend outputs file shape is included at [`examples/backend-outputs.sample.json`](./examples/backend-outputs.sample.json).

When the backend stack is deployed with `ApiCustomDomainName`, its `ApiBaseUrl`, `PublicApiBaseUrl`, and `LessonsApiUrl` outputs now all resolve to that custom domain so the frontend build does not accidentally mix custom-domain traffic with raw `execute-api` endpoints.

You can also use a frontend parameter file:

```bash
yarn deploy:frontend -- \
  --stack-name=b1admin-prod-frontend \
  --region=us-east-1 \
  --parameters-file=infrastructure/examples/frontend-parameters.sample.json
```

A sample parameter file is included at [`examples/frontend-parameters.sample.json`](./examples/frontend-parameters.sample.json).

The deploy script will:

1. Deploy or update the CloudFormation stack.
2. Resolve frontend build-time env vars from your shell and optional backend outputs.
3. Build the Vite app.
4. Sync `dist/` to the provisioned S3 bucket.
5. Upload `sw.js` with `no-cache`.
6. Invalidate the CloudFront distribution.

After the stack deploy succeeds, the helper now reuses the freshly resolved bucket/distribution outputs directly for the publish step instead of re-reading the frontend stack through CloudFormation a second time.

If you only want to provision the frontend hosting infrastructure and publish assets later, add `--infrastructure-only`.
Do not combine that with `--skip-build`, because no frontend publish happens in that phase.
If you already have a ready `dist/` bundle and use `--skip-build`, the direct frontend deploy helper now skips backend output resolution too, because no build-time `REACT_APP_*` injection happens in that phase.

When you are ready to publish frontend assets into an existing frontend stack, use:

```bash
yarn publish:frontend-assets -- \
  --stack-name=b1admin-prod-frontend \
  --region=us-east-1 \
  --backend-stack-name=b1admin-prod-backend
```

That helper will:

1. Read the frontend stack outputs to find the S3 bucket and CloudFront distribution.
2. Resolve frontend build-time env vars from your shell and optional backend outputs.
3. Build the Vite app unless you pass `--skip-build`.
4. Sync `dist/` to the provisioned S3 bucket.
5. Upload `sw.js` with `no-cache`.
6. Invalidate the CloudFront distribution.

If your publish environment does not have CloudFormation read access, you can use `--frontend-outputs-file=...` instead of `--stack-name`, or pass `--bucket=...` and `--distribution-id=...` directly. There is also a sample frontend outputs file at [`examples/frontend-outputs.sample.json`](./examples/frontend-outputs.sample.json) that shows the expected shape.
If you are reusing an existing `dist/` with `--skip-build`, the helper no longer needs backend outputs at all, because no build-time `REACT_APP_*` injection happens in that phase.
If you want a machine-readable example of the publish helper result itself, see [`examples/publish-frontend-output.sample.json`](./examples/publish-frontend-output.sample.json).

This helper now understands both the standalone frontend stack outputs (`SiteBucketName`, `CloudFrontDistributionId`) and the nested full-stack outputs (`FrontendBucketName`, `FrontendDistributionId`), so `--stack-name` can point at either stack shape.

## Bootstrap A Fresh AWS Account

If the target AWS account does not already have S3 buckets for templates and artifacts, start here:

```bash
yarn deploy:bootstrap -- \
  --stack-name=b1admin-prod-bootstrap \
  --region=us-east-1 \
  --project-name=b1admin \
  --environment=prod \
  --template-bucket-name=b1admin-prod-templates-123456789012 \
  --artifact-bucket-name=b1admin-prod-artifacts-123456789012
```

A sample parameter file is included at [`examples/bootstrap-parameters.sample.json`](./examples/bootstrap-parameters.sample.json).

You can also deploy bootstrap from that file directly:

```bash
yarn deploy:bootstrap -- \
  --stack-name=b1admin-prod-bootstrap \
  --region=us-east-1 \
  --parameters-file=infrastructure/examples/bootstrap-parameters.sample.json
```

Those outputs feed directly into the later deployment flows:

- The template bucket is used by `deploy:full-stack`
- The artifact bucket is where your packaged backend Lambda zip should live

After bootstrap, you can let later helpers consume those outputs automatically by passing `--bootstrap-stack-name`.

If you want to capture the resolved bucket outputs programmatically, add `--output=json`.

The main deploy helpers also support `--output=json` for machine-readable results:

- `deploy:bootstrap`
- `deploy:frontend`
- `deploy:backend`
- `deploy:full-stack`
- `deploy:aws`
- `smoke:aws-tooling`

Representative JSON output for `deploy:bootstrap -- --output=json` is included at [`examples/deploy-bootstrap-output.sample.json`](./examples/deploy-bootstrap-output.sample.json).
Representative JSON output for `deploy:frontend -- --infrastructure-only --output=json` is included at [`examples/deploy-frontend-output.sample.json`](./examples/deploy-frontend-output.sample.json).
Representative JSON output for the normal build-and-publish `deploy:frontend -- --output=json` path is included at [`examples/deploy-frontend-publish-output.sample.json`](./examples/deploy-frontend-publish-output.sample.json).
The backend artifact upload helper also supports `--output=json`. Representative JSON output for `upload:backend-artifact -- --output=json` is included at [`examples/upload-backend-artifact-output.sample.json`](./examples/upload-backend-artifact-output.sample.json).
Representative JSON output for `publish:lambda-layer -- --output=json` is included at [`examples/publish-lambda-layer-output.sample.json`](./examples/publish-lambda-layer-output.sample.json).
Representative JSON output for `publish:frontend-assets -- --output=json` is included at [`examples/publish-frontend-output.sample.json`](./examples/publish-frontend-output.sample.json).
Representative JSON output for `verify:split-stack -- --backend-outputs-file=... --frontend-outputs-file=... --check-aws=false --output=json` is included at [`examples/verify-split-stack-output.sample.json`](./examples/verify-split-stack-output.sample.json).
Representative JSON output for `run:api-migrations -- --dry-run=true --output=json` is included at [`examples/run-api-migrations-output.sample.json`](./examples/run-api-migrations-output.sample.json).
Representative JSON output for `sync:app-config-secret -- --output=json` is included at [`examples/sync-app-config-secret-output.sample.json`](./examples/sync-app-config-secret-output.sample.json).
Representative JSON output for `sync:legacy-ssm -- --output=json` is included at [`examples/sync-legacy-ssm-output.sample.json`](./examples/sync-legacy-ssm-output.sample.json).

For manifest-driven backend flows, those deploy-helper JSON results now also surface the resolved local provenance fields that CI wrappers usually care about most:

- `resolvedPackageManifestFile`
- `resolvedBackendArtifactSourceFile`
- `resolvedMigrationArtifactSourceFile`
- `resolvedDependenciesLayerSourceFile`

On the higher-level wrappers, those values describe what the wrapper itself resolved before it handed work off to nested helpers.
Representative JSON output for `deploy:backend -- --output=json` is included at [`examples/deploy-backend-output.sample.json`](./examples/deploy-backend-output.sample.json).

The top-level deploy helpers now also return a normal CLI error if a referenced parameters file is missing or unreadable, or if a referenced bootstrap/backend/frontend stack lookup fails, instead of crashing with a raw Node stack trace. That cleanup also applies when one top-level wrapper calls another helper under the hood, and to direct helper command failures such as packaging, S3 uploads, or frontend asset publication. The follow-up helper commands now do the same for referenced outputs JSON files, stack lookups, and AWS-side failures such as `deploy:frontend`, `publish:frontend-assets`, `publish:lambda-layer`, `upload:backend-artifact`, `sync:app-config-secret`, and `sync:legacy-ssm`.

The AWS helper scripts accept both `--name=value` and `--name value` argument styles.

All CloudFormation deploy helpers in this repo now pass `--no-fail-on-empty-changeset`, so a no-op re-run is treated as success.

## Validate Before Deploy

You can run a preflight check before backend or full-stack deployment:

```bash
yarn validate:aws-deploy -- \
  --mode=full-stack \
  --region=us-east-1 \
  --bootstrap-stack-name=b1admin-prod-bootstrap \
  --parameters-file=infrastructure/examples/full-stack-parameters.sample.json \
  --backend-artifact-source-file=../Api/dist/api.zip
```

Use `--mode=backend` with `--backend-parameters-file` if you want to validate just the backend path.

Use `--mode=frontend` with `--frontend-parameters-file` if you want to validate only the frontend hosting path.

Use `--mode=bootstrap` with `--parameters-file` if you want to validate the initial bucket/bootstrap stack inputs before running `deploy:bootstrap`. If you already know the target stack name, pass `--stack-name` there too so the validator's suggested follow-up command stays copy/pasteable.

Use `--mode=split-stack` with both `--backend-parameters-file` and `--frontend-parameters-file` if you want to validate the same paired configuration that `deploy:aws` consumes. That validator path now also accepts `--backend-outputs-file=...` when you want the frontend half to build or publish from a saved backend outputs file instead of a live stack lookup.

You can also pass `--frontend-infrastructure-only` to the validator when you want preflight feedback for the staged frontend-hosting-first flows used by `deploy:aws` and `deploy:full-stack`.

Use `--mode=frontend-publish` when you want to validate the second phase of that staged flow before running `publish:frontend-assets`.

For a quick local regression pass over the AWS tooling itself, you can also run:

```bash
yarn smoke:aws-tooling
```

That smoke script checks the main AWS helper files with `node --check`, parses the CloudFormation YAML templates for syntax validity, validates the sample JSON files, runs representative `validate:aws-deploy` scenarios against the sample parameter files, and exercises a few deploy-wrapper guardrails that should fail locally before any AWS call is made, including missing-parameter-file handling for the top-level deploy entrypoints plus missing outputs-file and unreadable stack handling for the publish/upload/sync helper commands. It also contract-checks the checked-in machine-readable example files for `package:api-backend`, `deploy:bootstrap`, `deploy:frontend`, `deploy:backend`, multiple `validate:aws-deploy` modes, `publish:lambda-layer`, `publish:frontend-assets`, `run:api-migrations`, `sync:app-config-secret`, `sync:legacy-ssm`, the split-stack wrapper's hosting-only, publish-only, and normal end-to-end flows, and the full-stack wrapper's hosting-only, publish-only, and normal end-to-end flows against representative fake-AWS runs so those example outputs do not silently drift away from the real helper result shapes. The smoke suite also now fails if a parsed example JSON file is neither contract-checked nor explicitly classified as an input-only sample. If you also have the Api repo checked out locally and readable in the current environment, it will additionally compare the env var keys from that repo's `serverless.yml` against `backend-api.yaml` so the CloudFormation runtime contract does not drift silently. In more restricted environments, those Api-repo checks are skipped rather than failing the whole smoke run. Add `--output=json` if you want a machine-readable summary for CI or other automation.

This repo also includes a GitHub Actions workflow at [`.github/workflows/aws-tooling-smoke.yml`](../.github/workflows/aws-tooling-smoke.yml) that runs the same smoke suite on pushes, pull requests, and manual dispatches. It now uses the repo's Yarn-first install path (`yarn install --immutable` plus `yarn smoke:aws-tooling`) instead of a separate Yarn-only flow, and it captures the smoke result as `aws-tooling-smoke.json` for upload as a build artifact.

## Verify After Deploy

If you are using the split-stack rollout path, you can verify the deployed outputs after `deploy:aws` completes:

```bash
yarn verify:split-stack -- \
  --region=us-east-1 \
  --backend-stack-name=b1admin-prod-backend \
  --frontend-stack-name=b1admin-prod-frontend
```

That helper can:

- read backend/frontend stack outputs directly from CloudFormation
- verify the frontend S3 bucket is reachable
- verify the CloudFront distribution is reachable
- print the resolved API base URL and frontend app URL

If you prefer not to hit AWS again, you can also run it from saved outputs files:

```bash
yarn verify:split-stack -- \
  --backend-outputs-file=infrastructure/examples/backend-outputs.sample.json \
  --frontend-outputs-file=infrastructure/examples/frontend-outputs.sample.json \
  --check-aws=false \
  --output=json
```

`--check-http=true` will also perform a frontend URL check when an app URL is available. If you want an API HTTP probe too, pass `--api-probe-url=...` explicitly so the helper knows which endpoint should answer cleanly.

Add `--check-aws=true` if you want the validator to also verify live AWS prerequisites such as:

- current AWS credentials/account access
- template bucket accessibility
- artifact bucket accessibility
- existence/accessibility of a referenced S3 artifact object
- accessibility of ACM certificates for frontend or API custom domains

Add `--output=json` if you want the validator result in a machine-readable format for CI or wrapper scripts. Invalid or unreadable parameter files, and unreadable `--bootstrap-stack-name` lookups, now return normal validator errors in that output instead of crashing the script outright. For manifest-driven backend validation, the `resolved` object now also includes:

- `packageManifestFile`
- `backendArtifactSource`
- `migrationArtifactSource`
- `dependenciesLayerSource`

A representative validator result for that backend + manifest path is included at [`examples/validate-backend-output.sample.json`](./examples/validate-backend-output.sample.json). Single-helper validator examples are also checked in: [`examples/validate-bootstrap-output.sample.json`](./examples/validate-bootstrap-output.sample.json) covers bootstrap preflight, [`examples/validate-frontend-output.sample.json`](./examples/validate-frontend-output.sample.json) covers frontend deploy preflight, and [`examples/validate-api-migrations-output.sample.json`](./examples/validate-api-migrations-output.sample.json) covers standalone Api CLI migration preflight. Normal infrastructure-phase validator examples are also checked in for the main wrapper paths: [`examples/validate-split-stack-output.sample.json`](./examples/validate-split-stack-output.sample.json) covers the standard `deploy:aws` preflight, and [`examples/validate-full-stack-output.sample.json`](./examples/validate-full-stack-output.sample.json) covers the standard `deploy:full-stack` preflight with an explicit template bucket. The staged hosting-first validator path now has checked examples too: [`examples/validate-split-stack-frontend-infra-output.sample.json`](./examples/validate-split-stack-frontend-infra-output.sample.json) covers `deploy:aws --frontend-infrastructure-only`, and [`examples/validate-full-stack-frontend-infra-output.sample.json`](./examples/validate-full-stack-frontend-infra-output.sample.json) covers `deploy:full-stack --frontend-infrastructure-only`. Publish-phase validator examples are also checked in for the staged follow-up flows: [`examples/validate-frontend-publish-output.sample.json`](./examples/validate-frontend-publish-output.sample.json) covers the standalone `publish:frontend-assets` validation path, [`examples/validate-split-stack-publish-output.sample.json`](./examples/validate-split-stack-publish-output.sample.json) covers the split-stack `deploy:aws` follow-up that reuses saved frontend outputs, and [`examples/validate-full-stack-publish-output.sample.json`](./examples/validate-full-stack-publish-output.sample.json) covers the full-stack `deploy:full-stack` follow-up that reuses saved frontend/backend outputs.

The validator checks things like:

- bootstrap outputs
- bootstrap parameter file readability plus explicit bootstrap bucket-name sanity checks
- presence of the local backend artifact file
- presence of the local migration artifact file when you provide one
- required Lambda artifact bucket/key inputs
- frontend custom-domain certificate requirements
- backend API custom-domain requirements
- migration handler requirements when `RunMigrations=true`
- optional post-deploy Api CLI migration wiring, including repo availability, migration action/module validation, and DB secret file sanity checks when `--run-api-migrations=true`
- whether artifact keys will be derived automatically from the current project/environment when you use a local artifact or auto-packaging path
- whether the current backend stack is rich enough to support the real Api repo, including a note about the optional legacy SSM sync helper when an app config secret is present

## Sync Legacy SSM Parameters

If your AWS account still needs the Api repo's older `/${stage}/...` Parameter Store layout for `serverless.yml`, CLI tasks, or ad hoc ops scripts, you can mirror the current backend stack into that layout:

```bash
yarn sync:legacy-ssm -- \
  --stack-name=b1admin-prod-backend \
  --environment=prod \
  --app-config-secret-file=infrastructure/examples/app-config-secret.sample.json \
  --region=us-east-1
```

The helper reads:

- backend or full-stack CloudFormation outputs such as `DatabaseEndpoint`, `DatabaseSecretArn`, and the resolved module database names
- the app-config secret file, `--app-config-secret-arn`, or `AppConfigSecretArn` from the deployed stack outputs when available

And writes SecureString parameters like:

- `/prod/jwtSecret`
- `/prod/encryptionKey`
- `/prod/membershipApi/connectionString`
- `/prod/attendanceApi/connectionString`
- `/prod/contentApi/connectionString`
- `/prod/givingApi/connectionString`
- `/prod/messagingApi/connectionString`
- `/prod/doingApi/connectionString`
- `/prod/reportingApi/connectionString`
- provider key paths such as `/prod/openAiApiKey`, `/prod/openRouterApiKey`, `/prod/pexelsKey`, and `/prod/webPushSubject`

Useful flags:

- `--app-config-secret-arn=...` to read the non-database values from Secrets Manager instead of a local file
- `--prefix=/staging` to override the default `/${environment}` prefix
- `--dry-run=true` to print the planned parameter names without writing them
- `--include-empty=true` to write blank values instead of skipping them

You can also fold that into the deployment wrappers:

- `yarn deploy:backend -- --stack-name=b1admin-prod-backend --parameters-file=infrastructure/examples/backend-parameters.sample.json --sync-legacy-ssm=true --app-config-secret-file=infrastructure/examples/app-config-secret.sample.json`
- `yarn deploy:aws -- --bootstrap-stack-name=b1admin-prod-bootstrap --api-repo-path=<api-repo-path> --sync-legacy-ssm=true --app-config-secret-file=infrastructure/examples/app-config-secret.sample.json`
- `yarn deploy:full-stack -- --stack-name=b1admin-prod --bootstrap-stack-name=b1admin-prod-bootstrap --api-repo-path=<api-repo-path> --sync-legacy-ssm=true --app-config-secret-file=infrastructure/examples/app-config-secret.sample.json`

Those wrappers run the SSM sync after the backend or full stack finishes deploying.

## Upload The Backend Artifact

Once your API repo or CI pipeline has produced a Lambda zip, upload it to the artifact bucket:

```bash
yarn upload:backend-artifact -- \
  --bootstrap-stack-name=b1admin-prod-bootstrap \
  --source-file=../Api/dist/api.zip \
  --artifact-key=b1admin/backend/api.zip \
  --region=us-east-1
```

You can also provide `--artifact-bucket` directly instead of `--bootstrap-stack-name`.

If you want a machine-readable example of the upload helper result, see [`examples/upload-backend-artifact-output.sample.json`](./examples/upload-backend-artifact-output.sample.json).

The resulting S3 key should match the `LambdaCodeS3Key` you pass into `deploy:backend`, `deploy:aws`, or `deploy:full-stack`.

If you use `deploy:backend`, `deploy:aws`, or `deploy:full-stack` with `--backend-artifact-source-file=...`, `--api-repo-path=...`, or `--package-manifest-file=...`, you can omit the key and let the wrapper default it to `<project>/<environment>/backend/api.zip`.

If you package migrations separately, upload that zip the same way with a different key:

```bash
yarn upload:backend-artifact -- \
  --bootstrap-stack-name=b1admin-prod-bootstrap \
  --source-file=../Api/dist/migrations.zip \
  --artifact-key=b1admin/backend/migrations.zip \
  --artifact-label="Migration artifact" \
  --region=us-east-1
```

Then pass that key as `MigrationCodeS3Key`. If you omit `MigrationCodeS3Bucket`, the backend stack will reuse the main artifact bucket automatically.

If you use `--migration-artifact-source-file=...` through the deploy wrappers and omit the key, they default it to `<project>/<environment>/backend/migrations.zip`.

## Deploying The Backend

Example using a parameter file:

```bash
yarn deploy:backend -- \
  --stack-name=b1admin-prod-backend \
  --region=us-east-1 \
  --parameters-file=infrastructure/examples/backend-parameters.sample.json
```

You can also pass values directly:

```bash
yarn deploy:backend -- \
  --stack-name=b1admin-prod-backend \
  --region=us-east-1 \
  --project-name=b1admin \
  --environment=prod \
  --lambda-code-s3-bucket=my-artifacts-bucket \
  --lambda-code-s3-key=b1admin/backend/api.zip \
  --website-base-url=https://{subdomain}.example.com \
  --content-root-url=https://content.example.com
```

The backend deploy script expects a Lambda zip to already be uploaded to S3.

If you provide `--backend-artifact-source-file=...`, `--api-repo-path=...`, or `--package-manifest-file=...`, the backend deploy script will upload the artifact for you and can derive `LambdaCodeS3Key` automatically from `ProjectName` and `EnvironmentName`.

The split-stack and full-stack wrappers now also honor `ProjectName` and `EnvironmentName` from their parameter files when deriving default stack-adjacent names like artifact keys, template prefixes, secret names, and layer names.

If you want the backend API on a first-class domain like `api.example.com`, pass:

- `ApiCustomDomainName`
- `ApiCertificateArn`
- `ApiHostedZoneId`

When those values are set, the backend stack will create the API Gateway custom domain, map it to the HTTP API, and create Route53 alias records. `ApiBaseUrl` and `PublicApiBaseUrl` will then resolve to your custom domain instead of the raw `execute-api` hostname.

If you want the stack to run schema/bootstrap work against Aurora, enable:

- `RunMigrations=true`
- `MigrationHandler`

Optional overrides are also available for:

- `MigrationCodeS3Bucket`
- `MigrationCodeS3Key`
- `MigrationRuntime`
- `MigrationMemorySize`
- `MigrationTimeout`
- `MigrationTrigger`

By default, the migration Lambda falls back to the main backend artifact bucket/key/runtime. The migration handler is expected to be idempotent and to implement the CloudFormation custom-resource response contract, since the stack invokes it as a custom resource during create/update.

If you want to upload a separate migration zip as part of the wrapper flow, add:

- `--migration-artifact-source-file=../Api/dist/migrations.zip`
- `--migration-code-s3-key=b1admin/backend/migrations.zip`

If you omit those flags, the migration Lambda will continue to reuse the main backend artifact by default.

If you do provide `--migration-artifact-source-file=...` and omit `--migration-code-s3-key`, the backend, split-stack, and full-stack wrappers will default the key from `ProjectName` and `EnvironmentName`.

The backend and full-stack templates now also fail fast on a few invalid combinations:

- `ApiCustomDomainName` without `ApiCertificateArn`
- `RunMigrations=true` without `MigrationHandler`
- `FrontendAlternateDomainName` without `FrontendAcmCertificateArn` in the full-stack template

## Deploying The Full AWS Footprint

Once you have a backend artifact in S3, you can deploy both stacks in sequence:

```bash
yarn deploy:aws -- \
  --region=us-east-1 \
  --environment=prod \
  --project-name=b1admin \
  --bootstrap-stack-name=b1admin-prod-bootstrap \
  --backend-parameters-file=infrastructure/examples/backend-parameters.sample.json \
  --frontend-parameters-file=infrastructure/examples/frontend-parameters.sample.json \
  --backend-artifact-source-file=../Api/dist/api.zip \
  --migration-artifact-source-file=../Api/dist/migrations.zip \
  --run-migrations=true \
  --migration-handler=index.migrate \
  --api-custom-domain-name=api.example.com \
  --api-certificate-arn=arn:aws:acm:us-east-1:123456789012:certificate/yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy \
  --api-hosted-zone-id=Z1234567890ABC \
  --frontend-alternate-domain-name=admin.example.com \
  --frontend-acm-certificate-arn=arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  --frontend-hosted-zone-id=Z1234567890ABC
```

The wrapper will:

1. Optionally resolve the artifact bucket from the bootstrap stack.
2. Optionally upload a backend Lambda zip if `--backend-artifact-source-file` is provided, or reuse the packaged artifact referenced by `--package-manifest-file`.
3. Optionally upload a separate migration zip if `--migration-artifact-source-file` is provided.
4. Deploy the backend foundation, including an API custom domain if configured.
5. Read backend stack outputs.
6. Deploy the frontend stack.
7. Build the frontend with the backend outputs injected as `REACT_APP_*` values.
8. Upload frontend assets and invalidate CloudFront.

The split-stack wrapper now supports `--frontend-parameters-file` too, so both halves of the deployment can be driven from parameter files instead of mixing file-based backend config with frontend-only CLI flags.
If you already have backend outputs saved from an earlier deploy or CI step, you can also pass `--backend-outputs-file=deployment/backend-outputs.json` so the frontend deploy/publish phases reuse that file instead of querying the backend stack.

If you only want the split-stack wrapper to provision frontend hosting and publish assets later, add `--frontend-infrastructure-only`.
Do not combine that with `--skip-frontend`, because skipping the frontend step prevents the hosting stack from being created.
Do not add `--skip-build` there either, because no frontend publish is happening in that phase.
Do not combine it with `--publish-frontend-assets` either, because the publish flag is only for the later follow-up phase.

When you are ready for that second phase, you can either use `publish:frontend-assets` directly or ask the split-stack wrapper to drive it for you:

```bash
yarn deploy:aws -- \
  --region=us-east-1 \
  --project-name=b1admin \
  --environment=prod \
  --skip-backend \
  --skip-frontend \
  --publish-frontend-assets
```

In that publish-only follow-up path, `deploy:aws` now skips backend packaging, artifact upload, layer publication, and secret sync work instead of repeating it unnecessarily.
If you already have a ready `dist/` directory, you can add `--skip-build` there too.
`--publish-frontend-assets` is meant for that later staged follow-up shape, so use it with `--skip-frontend` after an earlier `--frontend-infrastructure-only` run.
When you do use `--skip-build` in that staged follow-up, the wrapper now also stops forwarding backend-stack lookup inputs into the publish helper, because no build-time `REACT_APP_*` injection happens in that phase.
If you do need a build in that later phase, `--backend-outputs-file=...` is also supported there, so the publish helper can inject `REACT_APP_*` values without re-reading the backend stack.
That same split-stack publish-only follow-up now also accepts `--frontend-outputs-file=...`, or direct `--bucket=... --distribution-id=...`, so it can publish without re-reading the frontend stack too.
If you want a machine-readable example of the normal end-to-end split-stack wrapper JSON result, see [`examples/deploy-aws-full-output.sample.json`](./examples/deploy-aws-full-output.sample.json).
If you want a machine-readable example of the earlier `--frontend-infrastructure-only` wrapper JSON result, see [`examples/deploy-aws-frontend-infra-output.sample.json`](./examples/deploy-aws-frontend-infra-output.sample.json).
If you want a machine-readable example of the split-stack wrapper's publish-only JSON result, see [`examples/deploy-aws-publish-output.sample.json`](./examples/deploy-aws-publish-output.sample.json).
If you want the build-driven variant that also carries resolved `frontendPublish.backendBuildEnv` values from a saved backend outputs file, see [`examples/deploy-aws-publish-build-output.sample.json`](./examples/deploy-aws-publish-build-output.sample.json).

## Deploying With A Single CloudFormation Entry Point

If you prefer a single CloudFormation stack that creates both nested stacks, first upload the child templates somewhere CloudFormation can reach, such as S3. Then deploy [`cloudformation/full-stack.yaml`](./cloudformation/full-stack.yaml) with a parameter file like [`examples/full-stack-parameters.sample.json`](./examples/full-stack-parameters.sample.json).

The easiest path in this repo is the helper script:

```bash
yarn deploy:full-stack -- \
  --stack-name=b1admin-prod \
  --region=us-east-1 \
  --project-name=b1admin \
  --environment=prod \
  --bootstrap-stack-name=b1admin-prod-bootstrap \
  --parameters-file=infrastructure/examples/full-stack-parameters.sample.json \
  --backend-artifact-source-file=../Api/dist/api.zip \
  --migration-artifact-source-file=../Api/dist/migrations.zip
```

That helper will:

1. Resolve the template and artifact buckets from the bootstrap stack, if provided.
2. Upload `backend-api.yaml` to your template bucket.
3. Upload `frontend-site.yaml` to your template bucket.
4. Optionally upload a backend Lambda zip if `--backend-artifact-source-file` is provided, or reuse the packaged artifact referenced by `--package-manifest-file`.
5. Optionally upload a separate migration zip if `--migration-artifact-source-file` is provided.
6. Inject those template URLs into the full-stack deployment.
7. Deploy the nested-stack entrypoint.
8. Build the frontend with stack outputs injected as `REACT_APP_*` values.
9. Upload the frontend assets to the created S3 bucket.
10. Invalidate the created CloudFront distribution.

During that publish step, the helper now passes the resolved frontend bucket/distribution values directly into `publish:frontend-assets` instead of making that helper rediscover them from a temporary frontend outputs file. A temporary backend-outputs manifest is only written when a real frontend build needs stack-driven `REACT_APP_*` injection.

If you only want the infrastructure and plan to publish everything later, add `--infrastructure-only`.

If you want the backend plus frontend hosting infrastructure now but plan to publish frontend assets later, add `--frontend-infrastructure-only`.
Do not combine that with `--skip-infrastructure`, because `--skip-infrastructure` is only for the later publish-only follow-up pass.
Do not combine that with `--publish-frontend-assets` either, because the publish flag is only for the later follow-up phase.

When you are ready for that second phase, you can either use `publish:frontend-assets` directly or ask the full-stack wrapper to drive it for you. The full-stack wrapper now supports a real publish-only follow-up mode when you pass `--skip-infrastructure`:

```bash
yarn deploy:full-stack -- \
  --stack-name=b1admin-prod \
  --region=us-east-1 \
  --parameters-file=infrastructure/examples/full-stack-parameters.sample.json \
  --skip-infrastructure \
  --publish-frontend-assets
```

If you prefer, `publish:frontend-assets` still works directly too.
As with the direct publish helper, you can add `--skip-build` when you want to reuse an existing `dist/` bundle.
If your later publish environment does not have CloudFormation read access, `deploy:full-stack -- --skip-infrastructure --publish-frontend-assets` now also accepts `--frontend-outputs-file=...`, or direct `--bucket=... --distribution-id=...`, and it can take `--backend-outputs-file=...` when a fresh build still needs stack-driven `REACT_APP_*` values.
If you want a machine-readable example of the full-stack wrapper's normal end-to-end JSON result, see [`examples/deploy-full-stack-full-output.sample.json`](./examples/deploy-full-stack-full-output.sample.json).
If you want a machine-readable example of the full-stack wrapper's hosting-only non-publish JSON result, see [`examples/deploy-full-stack-frontend-infra-output.sample.json`](./examples/deploy-full-stack-frontend-infra-output.sample.json).
If you want a machine-readable example of the full-stack wrapper's publish-only JSON result, see [`examples/deploy-full-stack-publish-output.sample.json`](./examples/deploy-full-stack-publish-output.sample.json).
If you want the build-driven variant that also carries resolved `frontendEnv` values from a saved backend outputs file, see [`examples/deploy-full-stack-publish-build-output.sample.json`](./examples/deploy-full-stack-publish-build-output.sample.json).
Do not combine `--skip-infrastructure` with `--infrastructure-only` or `--frontend-infrastructure-only`, because those modes describe different phases of the rollout.
Likewise, do not add `--publish-frontend-assets` to a normal full-stack deploy, because the regular full-stack path already publishes frontend assets.

## Staging Starter Kit

If you want a concrete environment to start from instead of editing the generic examples in place, use [`environments/staging`](./environments/staging). It includes:

- bootstrap, backend, and frontend parameter files
- an app-config secret template
- a split-stack deployment script that validates inputs, deploys bootstrap, and then runs `deploy:aws`

That starter kit defaults the first rollout to no custom domains so you can get a staging stack up before wiring ACM and Route53. See [`environments/staging/README.md`](./environments/staging/README.md) for the exact command sequence and the fields you still need to replace.
That staging path completed successfully on June 24, 2026 with backend stack `b1admin-staging-backend`, frontend stack `b1admin-staging-frontend`, API base URL `https://5wmx09abp3.execute-api.us-east-1.amazonaws.com`, and frontend app URL `https://d1niz7249zvl23.cloudfront.net`.

## Prod Starter Kit

There is now a matching production-oriented starter at [`environments/prod`](./environments/prod). It follows the same split-stack pattern as staging:

- bootstrap, backend, and frontend parameter files
- an app-config secret template
- a split-stack deployment script that validates inputs, deploys bootstrap, and then runs `deploy:aws`

Like the staging starter, it keeps custom domains blank on the first pass so you can stand up the base production stack before layering in ACM and Route53. See [`environments/prod/README.md`](./environments/prod/README.md) for the exact command sequence and the fields you still need to replace.

If you want a quick index of both concrete environment starters in one place, see [`environments/README.md`](./environments/README.md).
There is also a shared first-rollout operator checklist at [`environments/first-rollout-checklist.md`](./environments/first-rollout-checklist.md).
For GitHub-driven rollouts, there is also a setup guide for the required repository environments, AWS auth secrets, and OIDC trust shape at [`environments/github-actions-setup.md`](./environments/github-actions-setup.md).
If this repository is public and you do not want the live AWS workflow running here, use the private-repo pattern in [`environments/private-deployment-repo.md`](./environments/private-deployment-repo.md) as the primary rollout model instead.
If you want reusable IAM role templates for the recommended GitHub-OIDC-role plus CloudFormation-execution-role model, use [`iam/README.md`](./iam/README.md).
For a field-by-field preparation pass against the checked-in parameter files, use [`environments/deployment-workbook.md`](./environments/deployment-workbook.md).
For a mechanical starter-file readiness check before a live deploy, run `yarn audit:environment-starter -- --environment=staging --output=json`.
For a tighter “what do I fix next?” view, run `yarn audit:environment-starter -- --environment=staging --only-blockers=true`.
For a copy-paste markdown checklist of those blockers, run `yarn audit:environment-starter -- --environment=staging --only-blockers=true --output=markdown`.
For a safe dry-run that proposes bucket replacements and secret generation before editing starter files, run `yarn prepare:environment-starter -- --environment=staging --account-id=<aws-account-id> --output=json`.
For the exact follow-up commands after that dry-run, run `yarn prepare:environment-starter -- --environment=staging --account-id=<aws-account-id> --output=commands`.
For a copy-paste markdown prep runbook, run `yarn prepare:environment-starter -- --environment=staging --account-id=<aws-account-id> --output=markdown`.
For a concrete first-run plan that maps the same starter files into both the local script path and the GitHub Actions workflow path, run `yarn plan:environment-deploy -- --environment=staging --output=markdown`.
If you want one compact “what is left?” snapshot across both checked-in environments, run `yarn show:rollout-status -- --output=markdown`.
If you want that same snapshot as copy-paste remediation commands, run `yarn show:rollout-status -- --output=commands`.
If you want the same rollout snapshot in a machine-readable shape for CI or wrapper scripts, run `yarn show:rollout-status -- --output=json`. A representative JSON result is checked in at [`examples/show-rollout-status-output.sample.json`](./examples/show-rollout-status-output.sample.json).
If you want that rollout snapshot to focus on the GitHub-to-AWS path only, run `yarn show:rollout-status -- --deployment-intent=github-actions --output=markdown` so local-only blockers like an unreadable `../Api` checkout do not dominate the summary.
That JSON output now also includes top-level `readyEnvironments`, `blockedEnvironments`, `commandSummary`, `blockerCategories`, `overallHighlightedBlockers`, and `recommendedNextSteps` fields so automation can read the cross-environment state and exact command order without scanning each environment block manually.
In GitHub-focused mode it also reports `deploymentIntent`, `ignoredBlockerCategories`, and `intentBlockerCategories`, and it trims local-only deploy commands out of the recommended command list.
That deploy-plan helper now separates starter/input blockers from local-only execution blockers, which makes it easier to tell whether the local shell path or the GitHub Actions path is actually runnable right now.
It now also recommends the safer execution path directly when the two paths differ in readiness.
It now also reports local GitHub CLI dispatch readiness separately, so the plan can tell you when the GitHub runner path is fine but the machine you are holding cannot actually call `gh workflow run` yet because `gh` is missing, `gh auth login -h github.com` still needs attention, or GitHub is not reachable from this shell.
When no execution path is runnable yet, it now also promotes the most concrete remediation command first, such as `gh auth login -h github.com` or `sync:github-app-config-secret`, instead of dropping back to a generic audit command.
When GitHub is the recommended execution path, the plan now prefers the checked-in `dispatch:github-aws-deploy` wrapper over a raw `gh workflow run` command, while still showing the low-level `gh` form for manual fallback or debugging.
That dispatch helper now also prints the exact `gh run list`, `gh run watch`, and `gh run view` follow-up commands for the latest `deploy-aws-self-hosted.yml` run so the operator can move straight from dispatch into live monitoring.
If the local `api-repo` path is unreadable, it now also emits concrete `package-manifest` and `backend-artifact` fallback commands so the operator can switch local deploy modes without reconstructing those commands manually.
When starter-file blockers still exist, it now recommends `prepare:environment-starter` first and includes the dry-run, markdown, and `--write=true` prep commands directly in the plan output.
The checked-in `deploy-split-stack.sh` wrappers now also support `PREVIEW_ONLY=true`, which runs the starter audit plus deploy-plan preflight and then stops before any AWS mutation.
The deploy planner now surfaces those local preview-only commands directly, alongside matching GitHub `preview_only=true` dispatch commands, so the safer dry-run path is visible in the same plan output as the live deploy path.
Its `--output=commands` mode now prints the recommended next command first and keeps alternate commands after it.
It now also includes the post-deploy `verify:split-stack` follow-up commands and a reminder to work through the shared rollout checklist.
It now also includes exact output-capture commands so the first rollout leaves behind reusable backend and frontend outputs JSON files.
Those output-capture commands now create the destination `deployment/<environment>/` folder first so they are runnable on a fresh checkout.
It now also includes copy-paste follow-up commands that reuse those saved outputs for later verification and publish-only frontend asset runs, so a later shell or CI step does not need live CloudFormation reads.
If you want that evidence saved with one helper instead of two manual `describe-stacks` commands, run `yarn save:split-stack-outputs -- --environment=staging --region=<aws-region>`.
If you want to re-render the saved `deployment-summary.json` later as a readable checklist, run `yarn show:deployment-summary -- --summary-file=deployment/staging/deployment-summary.json --output=markdown`.
If you want only the copy-paste follow-up commands from that saved summary, run `yarn show:deployment-summary -- --summary-file=deployment/staging/deployment-summary.json --output=commands`.
On that successful June 24, 2026 staging rollout, `yarn verify:split-stack -- --region=us-east-1 --backend-stack-name=b1admin-staging-backend --frontend-stack-name=b1admin-staging-frontend --check-http=true` passed, including HTTP reachability for the CloudFront app URL.
It now also spells out the GitHub post-deploy handoff directly in the plan output, including the expected deployment-evidence artifact on success, the fallback preflight-plan artifact on failure, and what the GitHub job summary should contain.
That audit helper now includes `nextSteps` and `suggestions` in its output so the unresolved staging work is easier to convert into concrete edits.
For manual CI-driven rollouts, there is now a GitHub Actions entrypoint at [`.github/workflows/deploy-aws-self-hosted.yml`](../.github/workflows/deploy-aws-self-hosted.yml). It targets the checked-in `staging` and `prod` environment starter kits and can deploy from a checked-out Api repo, a prebuilt package manifest, or direct backend artifact zip paths. The workflow supports either GitHub OIDC role assumption through `AWS_ROLE_TO_ASSUME` or the older static-key secret pair.
If B1Admin is public, treat that workflow as a template or bootstrap reference and move the live workflow, GitHub Environments, and live parameter files into a separate private deployment repository as described in [`environments/private-deployment-repo.md`](./environments/private-deployment-repo.md).
That workflow now also supports `preview_only=true`, which runs the same runner-side starter audit plus deploy-plan preflight and then stops before any AWS mutation.
If you intend to launch that workflow from this checkout instead of the GitHub UI, `yarn plan:environment-deploy -- --environment=staging --output=markdown` is now the fastest preflight because it shows both the runner-side GitHub Actions blockers and whether local `gh` auth is good enough to dispatch from this machine.
After a successful run, it now also uploads an `aws-<environment>-deployment-evidence` artifact containing the saved backend outputs, frontend outputs, deployment summary, and any saved preflight plan from `deployment/<environment>/`.
If the deploy step fails before that full bundle is created, the workflow still uploads an `aws-<environment>-preflight-plan` artifact so the computed blocker list remains downloadable.
The workflow now also writes a GitHub job summary with the preflight plan, resolved stack names, key URLs, and saved-output follow-up commands so the operator does not need to open the artifact just to see the important results.
One remaining maintenance follow-up from the successful hosted-run path is updating the workflow action runtime mix away from Node 20-targeted actions, because GitHub currently emits a deprecation warning and shims those actions onto Node 24 on hosted runners.

Example:

```bash
aws cloudformation deploy \
  --stack-name b1admin-prod \
  --template-file infrastructure/cloudformation/full-stack.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    $(jq -r 'to_entries[] | "\(.key)=\(.value)"' infrastructure/examples/full-stack-parameters.sample.json)
```

That stack will:

1. Create the backend nested stack.
2. Create the frontend nested stack.
3. Surface the important outputs, including API base URL, frontend bucket name, and CloudFront distribution ID.

If you use the helper script above, the frontend assets are published automatically. If you deploy `full-stack.yaml` manually with raw CloudFormation, you still need a separate asset publish step against the created frontend bucket.

## Recommended Full-Stack Layout

For a complete AWS self-hosting setup, use at least two stacks:

1. `backend-core`
2. `frontend-site`

`backend-core` should own:

- API Gateway or Lambda Function URL entrypoints
- Lambda functions
- Aurora cluster
- VPC and subnets
- Secrets Manager parameters
- Optional custom domains for API/content services
- Packaging and deployment of the real API code artifact

`frontend-site` should consume backend outputs through CI/CD variables, SSM parameters, or a deployment manifest.

## Next Backend Step

When you wire this to the real API repo, make sure the backend deployment produces:

- `ApiBaseUrl`
- `ContentRootUrl`
- `WebsiteBaseUrl`
- `TransferUrl`
- `SupportEmail`
- `SupportPhone`
- `SupportSiteUrl`
- `MobileAppUrl`
- `DomainCnameTarget`
- `DomainATarget`
- Any other public, non-secret frontend endpoints

That gives you an end-to-end account-agnostic deployment path even if the application source continues to live across multiple repositories.
