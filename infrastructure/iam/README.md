# IAM Roles For GitHub AWS Deploys

Use these templates when you want the GitHub workflow to assume a narrow OIDC deploy role that passes a separate CloudFormation execution role.

This is the recommended least-privilege model for B1Admin AWS rollouts.

## Roles

Create two roles per environment:

1. GitHub OIDC deploy role
2. CloudFormation execution role

For staging, the suggested names are:

- `b1admin-staging-github-deploy`
- `b1admin-staging-cfn-exec`

## Files

- [`github-oidc-deploy-role-trust.sample.json`](./github-oidc-deploy-role-trust.sample.json)
- [`github-oidc-deploy-policy.sample.json`](./github-oidc-deploy-policy.sample.json)
- [`cloudformation-execution-role-trust.sample.json`](./cloudformation-execution-role-trust.sample.json)
- [`cloudformation-execution-policy.sample.json`](./cloudformation-execution-policy.sample.json)

## Replace These Placeholders

- `<account-id>`
- `<repo-owner>`
- `<deploy-repo>`
- `<github-environment>`
- `<region>`
- `<project-name>`
- `<environment>`
- `<cloudformation-execution-role-name>`

To avoid hand-editing these files, render environment-specific copies with:

```bash
yarn installer:aws-roles -- --environment=staging --account-id=<aws-account-id> --repo=<owner>/<private-deploy-repo> --output-dir=../b1admin-deploy/iam/staging --write=true --output=markdown
```

The generated AWS commands use the GitHub OIDC provider URL `https://token.actions.githubusercontent.com` and audience `sts.amazonaws.com`. If the provider already exists in the AWS account, skip the provider creation command.

## GitHub Environment Secret

When you use the two-role model, store these secrets in the GitHub Environment:

- `AWS_ROLE_TO_ASSUME`
- `AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN`

The workflow now supports `AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN` directly and passes it to the deploy scripts through `CLOUDFORMATION_EXECUTION_ROLE_ARN`.

Before you paste those values manually, you can ask the repo to discover the exact ARNs from AWS:

`yarn discover:github-aws-roles -- --environment=staging --output=markdown`

That helper looks for the expected role names:

- `b1admin-staging-github-deploy`
- `b1admin-staging-cfn-exec`

and prints copy-paste `gh secret set ... --body '<full-arn>'` commands.

## Notes

- The GitHub OIDC deploy role is intentionally narrow. It handles workflow-side orchestration, artifact upload, frontend publish, and app-config secret sync.
- The CloudFormation execution role handles stack resource creation and mutation.
- These roles are not created by the GitHub deploy/bootstrap workflow itself. They must exist before GitHub can assume AWS access, so they stay as an explicit pre-deploy IAM setup step rather than a later bootstrap side effect.
- If you use the optional initial-admin bootstrap helper, the GitHub deploy role also needs `rds-data:BeginTransaction`, `rds-data:CommitTransaction`, `rds-data:ExecuteStatement`, `rds-data:RollbackTransaction`, and `secretsmanager:GetSecretValue` so the workflow can seed the first admin user directly through the Aurora Data API after migrations complete.
- If you are doing a first pass without custom domains, you can often remove or defer Route53- and ACM-related permissions until later.
- First live staging rollout note: the CloudFormation execution role must include `secretsmanager:GetRandomPassword`, API Gateway management actions such as `apigateway:POST`, `GET`, `PATCH`, `PUT`, `DELETE`, `TagResource`, and `UntagResource`, and S3 bucket configuration actions including `s3:PutBucketOwnershipControls` and `s3:PutBucketCORS`. Aurora creation also needed `iam:CreateServiceLinkedRole` for `rds.amazonaws.com`, rollback snapshot creation needed `rds:CreateDBClusterSnapshot`, Lambda-role inline policy wiring needed `iam:GetRolePolicy`, layered Lambda deploys needed `lambda:GetLayerVersion`, and versioned Lambda artifact rollouts needed `s3:GetObjectVersion` on the artifact bucket objects. The sample policy includes them now because the June 23-25, 2026 staging deploys failed without those permissions.
