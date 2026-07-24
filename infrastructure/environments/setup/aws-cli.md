# AWS CLI

Install AWS CLI for the guided installer path. The installer uses it for local readiness checks, AWS identity checks, verification, and clean reset commands.

AWS CLI is optional only if an advanced operator does every AWS inspection and reset step from the AWS console or another approved tool.

Configure a local AWS profile using your organization's normal sign-in method. Prefer IAM Identity Center or another short-lived credential method over permanent access keys.

Verify the active identity and region before running any command that changes AWS:

```bash
aws sts get-caller-identity
aws configure get region
yarn installer:doctor -- --output=markdown
```

If you use a named profile, add `--profile <profile-name>` to AWS CLI commands or set it through your normal shell configuration.

What good output looks like:

- `aws sts get-caller-identity` prints an `Account` value that matches the AWS account where B1Admin will run.
- `aws configure get region` prints the deployment region, normally `us-east-1`.
- `installer:doctor` can read the AWS identity without an authentication error.

Common fixes:

- If AWS CLI is not found, install AWS CLI and open a new terminal.
- If the account is wrong, sign out or switch profiles before continuing.
- If the region is blank, configure your default region or set the region using your organization's normal AWS CLI setup.
- If your organization uses AWS IAM Identity Center, make sure your session has not expired.

You are ready when the identity command shows the intended AWS account and the configured region is the region where B1Admin will be deployed, normally `us-east-1`.

[Back to Start Here](../start-here.md)
