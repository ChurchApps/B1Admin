# First Rollout Checklist

Use this after the first real `staging` or `prod` AWS rollout.

The commands below use two shell variables. Set them first (adjust if your private repository uses a different name or location):

```bash
export DEPLOY_REPO=<owner>/b1admin-deploy
export DEPLOY_ENV_DIR=../b1admin-deploy/environments
```

## Before Deploy

1. Confirm all `replace-me` placeholders and starter-only default values such as `example.com`, `support@example.com`, `mailto:support@example.com`, and `555-555-5555` are gone from the target environment folder.
2. Run `yarn installer:configure -- --environment=<environment> --environment-dir="$DEPLOY_ENV_DIR/<environment>" --account-id=<aws-account-id> --output=markdown` if you want one last reviewable replacement pass before touching AWS.
3. Run `yarn installer:preflight -- --environment=<environment> --environment-dir="$DEPLOY_ENV_DIR/<environment>" --repo="$DEPLOY_REPO" --output=markdown` and clear every blocker before dispatching.
4. If the plan recommends `api-repo`, confirm the Api repo at `../Api` has already run `corepack yarn install`.
5. If the plan recommends `package-manifest` or `backend-artifact`, confirm those referenced files already exist and are readable from the machine or runner you will use.
6. If you are still using the local script with `API_REPO_PATH`, confirm that the checkout and its `package.json` are readable from the current shell, not just present on disk.
7. Confirm the target AWS account, region, ACM certificates, and Route53 zones are the ones you intend to change.
8. Run the environment’s bootstrap and split-stack validator commands before the deploy script.

## Immediately After Deploy

1. Run the environment deploy script with verification enabled, or run `yarn verify:split-stack` manually.
2. Confirm the backend stack exists and the frontend stack exists in CloudFormation.
3. Confirm the frontend bucket and CloudFront distribution were resolved by the verification helper.
4. If you enabled `--check-http=true`, confirm the frontend URL responds successfully.
5. Save or download the deployment evidence:
   `deployment/<environment>/deployment-summary.json`, `deployment/<environment>/backend-outputs.json`, and `deployment/<environment>/frontend-outputs.json` for local runs, or `aws-<environment>-deployment-evidence` from GitHub Actions on success.
6. If the GitHub deploy failed before the full evidence bundle was written, download `aws-<environment>-preflight-plan` and use that blocker list before retrying.
7. If the environment was deployed without `run_bootstrap_admin=true`, seed the first admin with `yarn installer:bootstrap-admin` from an operator-controlled machine after infrastructure verification instead of retrofitting live credentials into GitHub.
8. Record the exact successful GitHub Actions run id and date so the next environment can promote from a known-good reference rather than a loose recollection.

## Backend Checks

1. Confirm the resolved `ApiBaseUrl` is the expected hostname.
2. If you synced the app config secret, confirm the expected Secrets Manager secret exists.
3. If you ran migrations, confirm the migration command completed successfully and the target schema is reachable.
4. Check Lambda logs for the main API function if the app boots but responses look wrong.

## Frontend Checks

1. Load the frontend app URL and confirm the app shell renders.
2. Verify the app is pointed at the intended API environment.
3. Hard-refresh once and confirm the service worker path is healthy after the no-cache upload.
4. Confirm at least one route refreshes correctly through the CloudFront SPA fallback.
5. If a route fails with `Failed to fetch dynamically imported module`, assume stale hashed chunks first:
   close old tabs, open a fresh tab, hard-refresh, and if needed clear site data or unregister the service worker before treating it as a broken deploy.
6. Confirm at least one authenticated page with nested data loads a valid empty state instead of hanging forever when related records are missing.
7. After first login, complete any expected `Select a Church` step before treating the authentication flow as failed.

## DNS / Domain Checks

1. If custom domains are enabled, confirm the ACM certificate ARNs and hosted zone IDs match the target account.
2. Confirm the frontend hostname resolves to CloudFront.
3. Confirm the API hostname resolves to API Gateway when `ApiCustomDomainName` is in use.

## Operational Follow-Up

1. Save backend and frontend outputs with `yarn save:split-stack-outputs -- --environment=<environment> --region=<aws-region>` if you want later publish-only or verification runs without live stack lookups.
2. Re-render the saved summary with `yarn show:deployment-summary -- --summary-file=deployment/<environment>/deployment-summary.json --output=markdown` when you want a human-readable record later.
3. Record the final stack names, region, secret names, and whether the deploy used `api-repo`, `package-manifest`, or `backend-artifact`.
4. Audit AWS for leftovers from failed retries before calling the environment clean:
   old Secrets Manager secrets, old managed asset buckets, and other resources tagged to earlier stack IDs are common after repeated first-rollout attempts.
5. If this was the first staging rollout, promote the verified values into the prod starter only after the staging checks are clean.
