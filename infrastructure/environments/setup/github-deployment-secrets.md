# GitHub Deployment Secrets

Add deployment secrets under **Settings > Environments > Environment secrets** in the private deployment repository.

For the normal prod-only path, use `aws-prod`. If you choose the optional staging deployment, add separate secrets to `aws-staging` too.

For the recommended OIDC setup, add:

- `AWS_ROLE_TO_ASSUME`: the environment's GitHub deploy-role ARN
- `AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN`: the environment's CloudFormation execution-role ARN
- `AWS_APP_CONFIG_SECRET_JSON`: the backend application configuration as one valid JSON object

Use the installer to generate or reuse the app-config JSON with random `jwtSecret` and `encryptionKey` values, then write all required GitHub Environment secrets:

```bash
yarn installer:app-config-secret -- --environment=prod --environment-dir=../b1admin-deploy/environments/prod --customer-file=../b1admin-deploy/customer-values.json --write=true --output=markdown
yarn installer:github-setup -- --environment=prod --repo=<owner>/<private-deploy-repo> --account-id=<aws-account-id> --deploy-env-dir=../b1admin-deploy/environments --write=true --write-secrets=true --output=markdown
yarn installer:github-readiness -- --environment=prod --repo=<owner>/<private-deploy-repo> --write=true --output=markdown
```

If you use staging, repeat the same command pattern with `--environment=staging`. Use different generated secret values for staging and prod.

Add `API_REPO_CHECKOUT_TOKEN` only when the workflow's default token cannot read the private Api repository.

Add `B1ADMIN_REPO_CHECKOUT_TOKEN` only when the workflow's default token cannot read the B1Admin source repository. If both source repositories are private and the same read-only token can read both, you may reuse the same token value for both secrets.

Do not add static AWS keys when OIDC is configured. If your organization cannot use OIDC yet, use `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in place of `AWS_ROLE_TO_ASSUME`; treat that as a temporary fallback.

The normal installer path keeps first-admin credentials out of GitHub. Do not add `AWS_BOOTSTRAP_ADMIN_SECRET_JSON` unless you have deliberately chosen runner-side admin bootstrap.

If you deploy both staging and prod, the values should be separate, especially role ARNs and application secrets. Never commit `app-config-secret.json` to either application repository.

You are ready when each GitHub Environment has its own AWS role values and app-config JSON. See the [GitHub Actions AWS setup guide](../github-actions-setup.md) for OIDC trust details, static-key fallback, and secret-sync commands.

[Back to Start Here](../start-here.md)
