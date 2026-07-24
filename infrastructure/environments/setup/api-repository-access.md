# API Repository Access

B1Admin uses the backend code from the `ChurchApps/Api` repository. The deployment workflow checks out that repository, installs its dependencies, packages the Lambda code, and can run its database migrations.

For the normal guided GitHub Actions deployment, the Api repository does not need to be cloned onto the operator's computer. GitHub Actions checks it out during the workflow run.

You normally do not need to create your own private Api repository. Use the source Api repository that contains the backend code you intend to deploy. Create a private fork or mirror only if your organization must deploy customized backend code or cannot allow the workflow to read the upstream source repository directly.

The private deployment workflow also checks out the B1Admin source repository so it can use the deployment scripts and CloudFormation templates. The workflow inputs default to:

- `b1admin_repo=ChurchApps/B1Admin`
- `b1admin_ref=main`
- `api_repo=ChurchApps/Api`
- `api_ref=main`

Confirm that the person setting up the install can open the Api repository in GitHub. Then give the private deployment repository's workflow read access:

- If the Api repository is public, no extra secret is normally needed.
- If the Api repository is private, create a fine-grained personal access token or GitHub App token with read-only contents access to it. A workflow's default token is normally limited to its own repository.
- Save that token as the `API_REPO_CHECKOUT_TOKEN` secret on each deployment environment you use.
- Add `B1ADMIN_REPO_CHECKOUT_TOKEN` only if the workflow cannot read the B1Admin source repository with the default workflow token or the API checkout token.

Do not give this token write access. The installer deploys a selected Api commit but does not push changes back to the Api repository.

Optional local Api checkout:

```text
parent-folder/
  B1Admin/
  b1admin-deploy/
  Api/
```

Use a local `../Api` checkout only for advanced local packaging, local migration work, or troubleshooting. If you do clone it locally, keep it beside `B1Admin`, not inside the user's private repository.

You are ready when the workflow identity can read the Api source repository and the deployment will use the intended branch, tag, or commit, normally `main`.

[Back to Start Here](../start-here.md)
