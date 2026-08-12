# Environment Starters

If you are trying to install the AWS self-hosted stack, start with [`start-here.md`](./start-here.md).

This folder is reference material for the installer. New installers should not start by editing files in this folder.

## What Is Here

- [`start-here.md`](./start-here.md): the main step-by-step guide for a new installer.
- [`operations.md`](./operations.md): what to do after launch - updates, version pinning, backups, secrets, and cost control.
- [`setup/`](./setup): short prerequisite explanations linked from the main guide.
- [`prod/`](./prod): checked-in production starter files copied into the user's private repository.
- [`staging/`](./staging): optional practice-environment starter files copied into the user's private repository.
- [`private-deployment-repo.md`](./private-deployment-repo.md): reference guide for the user's private repository.
- [`github-actions-setup.md`](./github-actions-setup.md): lower-level GitHub Actions reference.
- [`first-rollout-checklist.md`](./first-rollout-checklist.md): detailed verification checklist after a deploy.

## Normal Installer Path

Use `installer:init` once to create the private deployment workspace, then use `installer:run` as the main guided entrypoint.

```bash
yarn installer:init -- --deploy-repo-dir=../b1admin-deploy --output=markdown
yarn installer:customer-values -- --customer-file=../b1admin-deploy/customer-values.json --write=true --output=markdown
yarn installer:run -- --deploy-repo-dir=../b1admin-deploy --deploy-env-dir=../b1admin-deploy/environments --deployment-root=../b1admin-deploy/deployment --customer-file=../b1admin-deploy/customer-values.json --environment=prod --output=markdown
```

Use `--environment=staging` only when you intentionally want the optional practice deployment before prod.

## Files Copied To The User's Private Repository

The installer copies the starter files into the user's private repository. That private copy becomes the live customer workspace.

Each environment starter includes:

- `bootstrap-parameters.json`
- `backend-parameters.json`
- `frontend-parameters.json`
- `app-config-secret.template.json`
- `deploy-split-stack.sh`
- `README.md`

Do not put live customer settings, generated secrets, or deployment evidence back into this source repository.

## Lower-Level Tools

Most users should not need these directly. They exist for troubleshooting, automation, and advanced operators.

- `yarn installer:doctor`: check local tools and repository readiness.
- `yarn installer:update`: update an existing install after B1Admin source code changes.
- `yarn installer:next`: show the next recommended command without running it.
- `yarn installer:configure`: update environment parameter files from customer values.
- `yarn installer:preflight`: check readiness before dispatching a workflow.
- `yarn installer:deploy`: dispatch preview or real deployment workflows.
- `yarn installer:observe`: watch workflow runs and download evidence.
- `yarn installer:report`: write the final deployment report.
- `yarn reset:prod`: remove prod AWS resources when intentionally resetting.
- `yarn reset:staging`: remove staging AWS resources when staging was actually deployed.

The normal installer path leaves API custom-domain fields blank and uses the generated API Gateway URL.
