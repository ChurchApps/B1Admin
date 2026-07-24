# GitHub Environments

In the private deployment repository, open **Settings > Environments** and create the environments you plan to deploy.

For the normal prod-only path, create:

- `aws-prod`

If you choose the optional staging deployment, also create:

- `aws-staging`

You can also create or update the environments from the B1Admin checkout:

```bash
yarn installer:github-setup -- --repo=<owner>/<private-deploy-repo> --write=true --output=markdown
```

The deployment workflow selects `aws-staging` for a staging run and `aws-prod` for a production run. Environment-level secrets keep the two deployments separate even though they use the same workflow.

For production, consider adding required reviewers so a workflow cannot deploy until an authorized person approves it. Add branch restrictions if your organization requires deployments to come from a protected branch.

Do not rename the environments unless you also update the workflow. The checked-in workflow expects the `aws-<environment>` naming pattern.

You are ready when the needed environments appear in the repository settings. After IAM role files and app-config secrets are ready, the same helper can write the required GitHub Environment secrets.

For prod:

```bash
yarn installer:github-setup -- --environment=prod --repo=<owner>/<private-deploy-repo> --account-id=<aws-account-id> --deploy-env-dir=../b1admin-deploy/environments --write=true --write-secrets=true --output=markdown
yarn installer:github-readiness -- --environment=prod --repo=<owner>/<private-deploy-repo> --write=true --output=markdown
```

[Configure deployment secrets](./github-deployment-secrets.md) | [Back to Start Here](../start-here.md)
