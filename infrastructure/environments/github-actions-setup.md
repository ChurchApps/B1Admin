# GitHub Actions AWS Setup

Use this guide when you want to understand the lower-level GitHub Actions wiring behind the guided installer.
For a normal install, start with [`start-here.md`](./start-here.md) and let the installer create the private workflow and secrets for you.

This file is reference material for operators who need to inspect or customize [`.github/workflows/deploy-aws-self-hosted.yml`](../../.github/workflows/deploy-aws-self-hosted.yml).
If the B1Admin repository is public and you do not want the live AWS deploy workflow running here, stop and use [`private-deployment-repo.md`](./private-deployment-repo.md) instead. That private-repo pattern should be the default live path for public-source setups.

## Environments

Create the GitHub Environments you plan to use in the private deployment repository:

- `aws-prod`
- `aws-staging`, only if you run the optional staging deployment

The workflow targets them automatically through:

- `aws-prod` when `environment=prod`
- `aws-staging` when `environment=staging`

If you want manual approvals before deploy, add required reviewers on those GitHub Environments.

The guided private-repository workflow is the normal install flow for teams deploying B1Admin into their own AWS accounts.
Use the local shell scripts mainly for debugging, recovery, or situations where GitHub Actions is intentionally unavailable.

## Choose An Auth Mode

The workflow supports two AWS auth modes:

1. OIDC role assumption through `AWS_ROLE_TO_ASSUME`
2. Static access keys through `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

Prefer OIDC for new setups. Use static keys only if you cannot configure GitHub OIDC in the target AWS account yet.
For the smallest practical permission boundary, prefer a two-role setup:

1. a narrow GitHub OIDC deploy role stored in `AWS_ROLE_TO_ASSUME`
2. a separate CloudFormation execution role stored in `AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN`

Template trust and permission documents for that model live under [`../iam/`](../iam/README.md).

## Required Secrets

Set these secrets on each GitHub Environment:

### OIDC Path

- `AWS_ROLE_TO_ASSUME`
- `AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN`

### Static Key Path

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Optional Secrets

- `AWS_APP_CONFIG_SECRET_JSON`
- `AWS_BOOTSTRAP_ADMIN_SECRET_JSON`
- `API_REPO_CHECKOUT_TOKEN`

Use `AWS_APP_CONFIG_SECRET_JSON` only if you plan to run the workflow with `sync_app_config_secret=true`.
Use `AWS_BOOTSTRAP_ADMIN_SECRET_JSON` only if you plan to run the workflow with `sync_bootstrap_admin_secret=true` and `run_bootstrap_admin=true`.
Use `API_REPO_CHECKOUT_TOKEN` only if the workflow’s `api-repo` checkout needs access beyond the default `github.token`.

For the recommended installer flow, do not store the bootstrap admin secret in GitHub.
Let the workflow create the environment, then run the first-admin bootstrap locally or through another operator-controlled path after deploy verification.

## OIDC Role Setup

Create or reuse an IAM role that trusts GitHub’s OIDC provider and grant it the AWS permissions needed for your rollout.

### 1. Create The GitHub OIDC Provider

If your AWS account does not already trust GitHub Actions, create an IAM OIDC provider for:

- issuer: `https://token.actions.githubusercontent.com`
- audience: `sts.amazonaws.com`

### 2. Create A Deploy Role

Use a trust policy shaped like this and replace the placeholders:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:<github-org>/<github-repo>:environment:aws-staging",
            "repo:<github-org>/<github-repo>:environment:aws-prod"
          ]
        }
      }
    }
  ]
}
```

That policy limits role assumption to workflow runs that target the `aws-staging` or `aws-prod` GitHub Environments in this repository.

### 3. Grant Deploy Permissions

At minimum, the role needs permissions for the rollout surfaces this repo uses:

- CloudFormation
- S3
- CloudFront
- Lambda
- IAM pass-role where required
- API Gateway
- Route53 if you use managed DNS records
- Secrets Manager
- EC2 and VPC-related APIs used by the backend stack
- RDS / Aurora
- CloudWatch Logs

Start with the target environment role, normally prod for the prod-only path. Expand permissions only after preflight or deployment proves the exact access pattern you need.
From the first live staging backend attempts on June 23-24, 2026, these permissions were immediately required on the CloudFormation execution role and are easy to miss:

- `secretsmanager:GetRandomPassword`
- `apigateway:POST`, `apigateway:GET`, `apigateway:PATCH`, `apigateway:PUT`, `apigateway:DELETE`, `apigateway:TagResource`, `apigateway:UntagResource`
- `s3:PutBucketOwnershipControls`
- `s3:PutBucketCORS`
- `iam:CreateServiceLinkedRole` scoped to `rds.amazonaws.com`
- `rds:CreateDBClusterSnapshot`
- `iam:GetRolePolicy`
- `lambda:GetLayerVersion`

The checked-in sample execution policy now includes them.

### 4. Save The Role ARN

Store the role ARN as the `AWS_ROLE_TO_ASSUME` secret on each GitHub Environment you use:

- `aws-prod`
- `aws-staging`, only if you run staging

If you are using the split-role model, also store the CloudFormation execution role ARN as:

- `AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN`

If you created the roles with the recommended names, you do not need to guess the full ARN. Run:

`yarn discover:github-aws-roles -- --environment=prod --output=markdown`

That helper prints the resolved AWS role ARNs plus copy-paste `gh secret set ... --body '<full-arn>'` commands for the matching GitHub Environment.

## Static Key Fallback

If you cannot use OIDC yet, create an IAM user or automation-specific access path with the same rollout permissions and store:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Keep that principal limited to the minimum AWS account and resources needed for the environment.

## App Config Secret JSON

The guided installer normally generates this for you with `yarn installer:app-config-secret` and stores it with `yarn installer:github-setup -- --write-secrets=true`.

If you are configuring the workflow manually and want it to materialize `app-config-secret.json`, save a JSON object like this into `AWS_APP_CONFIG_SECRET_JSON`:

```json
{
  "jwtSecret": "replace-with-real-secret",
  "encryptionKey": "replace-with-real-secret"
}
```

Add the rest of your real backend app config keys before using it for a live deployment.

If you already have the finished JSON in this repo, you can sync it into the GitHub environment secret:

`yarn sync:github-app-config-secret -- --environment=prod --secret-file=infrastructure/environments/prod/app-config-secret.json`

If you want the repo to sync that secret first and then dispatch the workflow in one step, use:

`yarn dispatch:github-aws-deploy -- --environment=prod --deployment-source=api-repo --repo=ChurchApps/B1Admin`

That wrapper validates `gh auth status` by default, even in dry-run mode, so its output is a real readiness signal. It now distinguishes missing `gh`, invalid GitHub auth, and plain connectivity failures to `github.com`. Only use `--skip-gh-auth-check=true` when you are doing an offline/test-only run and do not want GitHub connectivity checked.
It now also prints copy-paste `gh run list`, `gh run watch`, and `gh run view` follow-up commands for the latest `deploy-aws-self-hosted.yml` run so you can monitor the job immediately after dispatching it.
If you want the GitHub runner to stop after the starter audit plus deploy-plan preflight without mutating AWS, add `--preview-only=true` to that helper or set the workflow input `preview_only=true` in the GitHub UI.
If you want a wider preflight before dispatching, run `yarn plan:environment-deploy -- --environment=prod --output=markdown`. The planner now shows both GitHub runner blockers and whether local GitHub CLI is ready enough for this machine to dispatch the workflow directly.

## First Run

After the environment secrets are in place:

1. Finish replacing placeholders in the target private environment folder, normally `../b1admin-deploy/environments/prod/`.
2. Run `yarn plan:environment-deploy -- --environment=prod --output=markdown` and clear anything it still reports for local `gh` auth or GitHub runner readiness.
3. Decide which backend source the workflow should use:
   `api-repo`, `package-manifest`, or `backend-artifact`
4. Run the `Deploy AWS Self-Hosted` workflow with:
   `environment=prod`
5. Leave `verify_http_after_deploy=false` on the first pass unless the frontend hostname is already expected to respond publicly.
6. Review the GitHub job summary for the preflight deploy plan, resolved stack names, URLs, artifact name, and saved-output follow-up commands.
   If you download the artifact later, you can render the same summary locally with `yarn show:deployment-summary -- --summary-file=deployment/<environment>/deployment-summary.json --output=markdown`.
7. Download the `aws-<environment>-deployment-evidence` workflow artifact after a successful run if you want the saved backend/frontend outputs, deployment summary, and preflight plan outside the runner.
   If the deploy step fails before that full evidence bundle is created, the workflow now uploads `aws-<environment>-preflight-plan` so you can still download the computed rollout plan and blocker list.
8. Work through [`first-rollout-checklist.md`](./first-rollout-checklist.md) after the workflow finishes.

## Recommended Clean Restart Loop

When you need to prove that a brand-new environment can be installed from scratch:

1. Reset the target environment:
   `yarn reset:staging` or `yarn reset:prod`
2. Re-run the preflight:
   `yarn plan:environment-deploy -- --environment=<environment> --output=markdown`
3. Dispatch the workflow from GitHub Actions.
4. Watch the run through to completion and download `aws-<environment>-deployment-evidence`.
5. Run `yarn verify:split-stack -- --region=us-east-1 --backend-stack-name=b1admin-<environment>-backend --frontend-stack-name=b1admin-<environment>-frontend --check-http=true` or the equivalent environment-specific verification command.
6. Seed the first admin outside GitHub only if the environment was intentionally deployed without bootstrap-admin automation.
7. Verify login from the intended hostname and complete any expected `Select a Church` step before judging authentication as broken.

## Optional Staging Order

Use this only when you intentionally want a practice deployment before prod:

1. Configure `aws-staging`
2. Run and verify the staging deployment
3. Configure `aws-prod`
4. Run the production deployment after staging is clean
