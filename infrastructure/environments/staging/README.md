# Staging Environment Starter

This folder contains the checked-in staging starter files used by the AWS installer.

For a real install, start with [`../start-here.md`](../start-here.md). Do not use this folder as the live customer configuration location unless you are deliberately testing inside the B1Admin repo.

The normal customer path copies these files into a private deployment repository with:

```bash
yarn installer:init -- --deploy-repo-dir=../b1admin-deploy --output=markdown
```

Then configure the private copy:

```bash
yarn installer:configure -- \
  --environment=staging \
  --environment-dir=../b1admin-deploy/environments/staging \
  --account-id=<aws-account-id> \
  --root-domain=<your-domain> \
  --support-phone=<support-phone> \
  --write=true
```

Required starter files:

- `bootstrap-parameters.json`
- `backend-parameters.json`
- `frontend-parameters.json`
- `app-config-secret.template.json`
- `deploy-split-stack.sh`

The installer may create `app-config-secret.json` in the private deployment repo. That file is ignored by the private deployment repo `.gitignore` and should not be committed.

Useful reference commands:

```bash
yarn installer:preflight -- --environment=staging --environment-dir=../b1admin-deploy/environments/staging --repo=<owner>/<private-deploy-repo> --output=markdown
yarn installer:deploy -- --environment=staging --environment-dir=../b1admin-deploy/environments/staging --repo=<owner>/<private-deploy-repo> --preview-only=true
yarn installer:deploy -- --environment=staging --environment-dir=../b1admin-deploy/environments/staging --repo=<owner>/<private-deploy-repo> --confirm=true
yarn installer:verify -- --environment=staging --region=us-east-1 --output=markdown
```

For reset help, use:

```bash
yarn reset:staging -- --region=us-east-1 --dry-run=true
```
