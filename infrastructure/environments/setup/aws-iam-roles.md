# AWS IAM Deployment Roles

GitHub needs permission to deploy B1Admin into AWS. The recommended setup uses GitHub OIDC, which lets GitHub assume short-lived AWS roles without storing long-lived AWS keys in GitHub.

There are two roles per environment you deploy:

- GitHub deploy role: trusted by the private deployment repo's GitHub Environment.
- CloudFormation execution role: used by CloudFormation to create and update the B1Admin AWS resources.

Generate one AWS admin handoff document from the installer:

```bash
yarn installer:aws-handoff -- --customer-file=../b1admin-deploy/customer-values.json --deploy-repo-dir=../b1admin-deploy --write=true --output=markdown
```

If you manage the AWS account yourself (the normal case for a small organization), you do not need to run the printed commands by hand: approve the `AWS IAM roles created` step in the guided runner, or run the role generator with `--apply=true`, and the installer creates the OIDC provider and both roles with your AWS sign-in. It safely skips anything that already exists.

If a separate person manages your AWS account, send them `../b1admin-deploy/aws-admin-handoff.md` and have them run the printed `aws iam ...` commands. If the AWS account already has the GitHub OIDC provider for `token.actions.githubusercontent.com`, they should skip the provider creation command. Afterward, run the `AWS IAM roles created` step once yourself to confirm the roles exist.

If you only need one environment, use the lower-level role generator for prod:

```bash
yarn installer:aws-roles -- --environment=prod --customer-file=../b1admin-deploy/customer-values.json --output-dir=../b1admin-deploy/iam/prod --write=true --output=markdown
```

After the roles exist, save these values for each deployed environment:

- GitHub deploy-role ARN
- CloudFormation execution-role ARN

The installer can derive the default ARNs from your AWS account ID. If your administrator chooses different role names, pass the actual ARNs when setting GitHub secrets.

You are ready when the roles exist in AWS and the trust policies name your private deployment repository and the matching GitHub Environment, normally `aws-prod` and, only if you use staging, `aws-staging`.

[Back to Start Here](../start-here.md)
