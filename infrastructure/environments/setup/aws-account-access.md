# AWS Account Access

You need access to the AWS account where B1Admin will run. Staging is optional. If you use staging, keep staging and prod separated by their environment names and IAM roles.

For the recommended GitHub Actions deployment, an AWS administrator must create these for each environment you plan to deploy:

- a GitHub OIDC provider for `token.actions.githubusercontent.com`, if the account does not already have one
- a GitHub deploy role for each environment
- a CloudFormation execution role for each environment

The deploy role lets GitHub start and manage the deployment. The CloudFormation role creates the B1Admin resources. Use the installer to render the trust and permission policies instead of editing JSON by hand:

For the normal prod-only path, generate the prod role files:

```bash
yarn installer:aws-roles -- --environment=prod --account-id=<aws-account-id> --repo=<owner>/<private-deploy-repo> --output-dir=../b1admin-deploy/iam/prod --write=true --output=markdown
```

If you choose the optional staging deployment, generate staging role files too:

```bash
yarn installer:aws-roles -- --environment=staging --account-id=<aws-account-id> --repo=<owner>/<private-deploy-repo> --output-dir=../b1admin-deploy/iam/staging --write=true --output=markdown
```

Have an AWS administrator run the printed `aws iam ...` commands. If the account already has the GitHub OIDC provider for `token.actions.githubusercontent.com`, skip the provider creation command. The rendered trust policies scope access to the private deployment repository and the matching GitHub Environment.

The short operator handoff is in [AWS IAM deployment roles](./aws-iam-roles.md). The full sample trust and permission policies are also documented in the [IAM setup guide](../../iam/README.md).

Record the AWS account ID, region, deploy-role ARN, and CloudFormation-role ARN. You will use them while preparing the environment and configuring GitHub secrets.

You are ready when an AWS administrator has created the roles for the environments you plan to deploy and confirmed that their trust policies name your private deployment repository and the matching GitHub Environment.

After the environment files are configured, the installer preflight checks the active AWS CLI identity and any configured frontend certificate/hosted-zone values:

```bash
yarn installer:aws-preflight -- --environment=prod --environment-dir="../b1admin-deploy/environments/prod" --account-id=<aws-account-id> --output=markdown
```

[Back to Start Here](../start-here.md)
