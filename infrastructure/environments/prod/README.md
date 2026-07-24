# Prod Environment Starter

This folder contains the checked-in production starter files used by the AWS installer.

For a real install, start with [`../start-here.md`](../start-here.md). Do not commit live customer production settings to the B1Admin source repository.

The normal customer path copies these files into a private deployment repository with:

```bash
yarn installer:init -- --deploy-repo-dir=../b1admin-deploy --output=markdown
```

Configure prod when you are ready for the real install. Staging is optional; you do not need to deploy staging first.

```bash
yarn installer:configure -- \
  --environment=prod \
  --environment-dir=../b1admin-deploy/environments/prod \
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

The default production starter leaves API custom-domain fields blank. That is intentional; the normal install uses the generated API Gateway URL.

For a custom frontend domain, pass these values to `installer:configure`:

```bash
--frontend-domain=admin.example.com
--frontend-certificate-arn=<us-east-1-acm-certificate-arn>
--frontend-hosted-zone-id=<route53-hosted-zone-id>
```

Useful reference commands:

```bash
yarn installer:preflight -- --environment=prod --environment-dir=../b1admin-deploy/environments/prod --repo=<owner>/<private-deploy-repo> --output=markdown
yarn installer:deploy -- --environment=prod --environment-dir=../b1admin-deploy/environments/prod --repo=<owner>/<private-deploy-repo> --preview-only=true
yarn installer:deploy -- --environment=prod --environment-dir=../b1admin-deploy/environments/prod --repo=<owner>/<private-deploy-repo> --confirm=true
yarn installer:verify -- --environment=prod --region=us-east-1 --output=markdown
```

For reset help, use:

```bash
yarn reset:prod -- --region=us-east-1 --dry-run=true
```
