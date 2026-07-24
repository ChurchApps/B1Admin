# User's Private Repository

Use a private deployment repository for real customer installs.

That repo owns:

- the live GitHub Actions workflow
- `environments/staging/`
- `environments/prod/`
- GitHub Environment named `aws-prod`, and `aws-staging` only if you run the optional staging deployment
- deployment secrets
- workflow run history and deployment evidence

It does not own application source changes. Customer-specific settings do not get pushed back to B1Admin or Api.

## Create The Repo

Create a private GitHub repository such as:

```text
your-org/b1admin-deploy
```

From a sibling B1Admin checkout, create the private repo scaffold and local customer worksheet:

```bash
yarn installer:init -- \
  --deploy-repo-dir=../b1admin-deploy \
  --output=markdown
```

That creates:

```text
b1admin-deploy/
  .github/workflows/deploy-aws-self-hosted.yml
  .gitignore
  README.md
  customer-values.json
  customer-values.sample.json
  environments/
    staging/
    prod/
```

The generated `.gitignore` protects local runtime secret files such as:

- `environments/*/app-config-secret.json`
- `environments/*/bootstrap-admin-secret.json`

Runtime secret values belong in GitHub Environment secrets or in an operator-controlled local step, not in Git.
`customer-values.json` is local operator input for the installer. The generated `.gitignore` keeps it out of commits.

## Source Repositories

The private workflow checks out:

- the private deployment repo
- B1Admin source, normally `ChurchApps/B1Admin`
- Api source, normally `ChurchApps/Api`

Do not copy B1Admin source code or Api source code into the private deployment repo. The private deployment repo stores deployment settings and the workflow. The workflow reads the source repositories during deployment.

You normally do not need a private Api repository. Use a private Api fork or mirror only when your organization intentionally maintains customized backend code or cannot let the workflow read the upstream Api source repository directly.

The workflow inputs expose these values:

- `b1admin_repo`
- `b1admin_ref`
- `api_repo`
- `api_ref`

Use `B1ADMIN_REPO_CHECKOUT_TOKEN` or `API_REPO_CHECKOUT_TOKEN` only when the default GitHub token cannot read those source repositories.

## GitHub Environments

Create the GitHub Environments you plan to use in the private deployment repo.

- `aws-prod`
- `aws-staging`, only if you run the optional staging deployment

Each environment needs its own deployment secrets. For OIDC, the usual required secrets are:

- `AWS_ROLE_TO_ASSUME`
- `AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN`
- `AWS_APP_CONFIG_SECRET_JSON`

Use `AWS_BOOTSTRAP_ADMIN_SECRET_JSON` only if you intentionally want the workflow to seed the first admin. The recommended installer path seeds the first admin later from an operator-controlled machine.

To render environment-specific IAM policies and copy-paste AWS/GitHub commands, use `prod` for the normal install:

```bash
yarn installer:aws-roles -- --environment=prod --account-id=<aws-account-id> --repo=<owner>/<private-deploy-repo> --output-dir=../b1admin-deploy/iam/prod --write=true --output=markdown
```

To preview the environment and secret commands:

```bash
yarn installer:github-setup -- --repo=<owner>/<private-deploy-repo> --account-id=<aws-account-id> --deploy-env-dir="$DEPLOY_ENV_DIR" --output=markdown
```

Generate app-config JSON separately for each environment, then let the GitHub setup helper store the required environment secrets:

```bash
yarn installer:app-config-secret -- --environment=prod --environment-dir="$DEPLOY_ENV_DIR/prod" --support-email=support@<your-domain> --write=true --output=markdown
yarn installer:github-setup -- --environment=prod --repo=<owner>/<private-deploy-repo> --account-id=<aws-account-id> --deploy-env-dir="$DEPLOY_ENV_DIR" --write=true --write-secrets=true --output=markdown
```

## Normal Commands

Run these from the B1Admin checkout:

```bash
export DEPLOY_REPO=<owner>/<private-deploy-repo>
export DEPLOY_ENV_DIR=../b1admin-deploy/environments

yarn installer:configure -- --environment=prod --environment-dir="$DEPLOY_ENV_DIR/prod" --account-id=<aws-account-id> --root-domain=<your-domain> --support-phone=<support-phone> --write=true
yarn installer:preflight -- --environment=prod --environment-dir="$DEPLOY_ENV_DIR/prod" --repo="$DEPLOY_REPO" --output=markdown
yarn installer:deploy -- --environment=prod --environment-dir="$DEPLOY_ENV_DIR/prod" --repo="$DEPLOY_REPO" --preview-only=true
yarn installer:deploy -- --environment=prod --environment-dir="$DEPLOY_ENV_DIR/prod" --repo="$DEPLOY_REPO" --confirm=true
```

Use `--environment=staging` only if you intentionally chose the optional practice deployment.

## Updating Later

After the first install is complete, update the AWS deployment from the sibling B1Admin source repository with:

```bash
yarn installer:update -- \
  --deploy-repo-dir=../b1admin-deploy \
  --deploy-env-dir=../b1admin-deploy/environments \
  --deployment-root=../b1admin-deploy/deployment \
  --customer-file=../b1admin-deploy/customer-values.json \
  --environment=prod \
  --output=markdown
```

That command pulls source code when approved, refreshes this private repository's safe scaffold files, offers to commit and push safe private repository changes, then starts the guided deployment runner.

Important: `installer:update` is a guided update command, not a zero-downtime guarantee. For a production environment with active users, update optional staging first when available, verify login and key workflows, confirm backups or snapshots exist, review the prod preflight and preview output, and run prod during an approved low-traffic or maintenance window.

Do not commit `customer-values.json`, `app-config-secret.json`, `bootstrap-admin-secret.json`, or `deployment/`.

## OIDC Trust

The AWS OIDC trust policy should reference the user's private repository, not the B1Admin source repository:

```json
{
  "StringLike": {
    "token.actions.githubusercontent.com:sub": [
      "repo:<owner>/<private-deploy-repo>:environment:aws-staging",
      "repo:<owner>/<private-deploy-repo>:environment:aws-prod"
    ]
  }
}
```

For policy templates and role details, see [`../iam/README.md`](../iam/README.md).

[Back to Start Here](./start-here.md)
