# Private Deployment Repository

Create a private GitHub repository owned by the organization or team operating B1Admin. A name such as `b1admin-deploy` works well.

This repository is the operator's deployment workspace. It should be created in GitHub first, then cloned beside the B1Admin source repository on the operator machine.

You can create it in the GitHub website, or with GitHub CLI.

Run this from the parent folder that will contain both repositories:

```bash
gh repo create <owner>/b1admin-deploy --private --clone
```

If you use the GitHub website, clone it from that same parent folder before continuing:

```bash
git clone git@github.com:<owner>/b1admin-deploy.git b1admin-deploy
```

Check the folder layout before running installer commands:

```text
parent-folder/
  B1Admin/
  b1admin-deploy/
```

Run installer commands from `B1Admin`, not from `b1admin-deploy`.

It holds:

- the deployment workflow
- prod parameter files and optional staging parameter files
- GitHub Environments and their secrets
- an ignored local `deployment/` folder for downloaded workflow evidence, browser-smoke results, and final rollout reports

It does not need to contain application source changes, and the installer does not push environment settings back to the B1Admin or Api repositories.

From a sibling B1Admin checkout, use the installer helper to scaffold the private repository and create the local customer worksheet:

```bash
yarn installer:init -- --deploy-repo-dir=../b1admin-deploy --output=markdown
```

That places [`private-deployment-workflow.sample.yml`](../private-deployment-workflow.sample.yml) at `.github/workflows/deploy-aws-self-hosted.yml`, copies [`private-deployment-gitignore.sample`](../private-deployment-gitignore.sample) to `.gitignore`, creates a short private-repo README, copies the tracked `staging` and `prod` starter files into an `environments` folder, and creates `customer-values.json` if it does not already exist.

Do not commit `customer-values.json`, `app-config-secret.json`, `bootstrap-admin-secret.json`, or `deployment/`. Keep runtime secrets in GitHub Environment secrets.

The workflow has inputs for the source repositories it checks out:

- `b1admin_repo`, normally `ChurchApps/B1Admin`
- `b1admin_ref`, normally `main`
- `api_repo`, normally `ChurchApps/Api`
- `api_ref`, normally `main`

The full expected layout and workflow path adjustments are shown in the [user's private repository guide](../private-deployment-repo.md).

Commit and push the safe scaffold files before any workflow dispatch:

```bash
git -C ../b1admin-deploy add README.md .gitignore .github/workflows/deploy-aws-self-hosted.yml customer-values.sample.json environments
git -C ../b1admin-deploy commit -m "Add B1Admin deployment scaffold"
git -C ../b1admin-deploy push
```

You are ready when the private repository contains the workflow and environment folders, and the repository's Actions tab shows the `Deploy AWS From Private Repo` workflow.

If the Actions tab does not show the workflow after pushing, confirm that the workflow file exists at `.github/workflows/deploy-aws-self-hosted.yml` in the user's private repository and that GitHub Actions are enabled for that repository.

After the first install, keep using this private repository for updates. The normal update command is:

```bash
yarn installer:update -- \
  --deploy-repo-dir=../b1admin-deploy \
  --deploy-env-dir=../b1admin-deploy/environments \
  --deployment-root=../b1admin-deploy/deployment \
  --customer-file=../b1admin-deploy/customer-values.json \
  --environment=prod \
  --output=markdown
```

This is a guided update command, not a zero-downtime guarantee. For production with active users, verify staging first when available and run prod updates during an approved low-traffic or maintenance window.

[Back to Start Here](../start-here.md)
