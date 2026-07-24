# GitHub CLI

Install GitHub CLI for the guided installer path. The installer uses `gh` to check repository access, prepare GitHub Environments and secrets, dispatch deployments, watch workflow runs, and download deployment evidence.

GitHub CLI is optional only if an advanced operator chooses to do the GitHub steps manually in the GitHub website instead of using the guided runner.

After installing `gh`, authenticate and select the GitHub account that can access the private deployment repository:

```bash
gh auth login
gh auth status
```

Check repository access:

```bash
gh repo view <owner>/<deploy-repo>
yarn installer:doctor -- --repo=<owner>/<deploy-repo> --output=markdown
```

What good output looks like:

- `gh auth status` shows you are logged in to the GitHub account that can access the user's private repository.
- `gh repo view <owner>/<deploy-repo>` prints repository information instead of `not found` or `HTTP 404`.
- `installer:doctor` can read the repository and does not report a GitHub authentication blocker.

Common fixes:

- If `gh` is not found, install GitHub CLI and open a new terminal.
- If the wrong GitHub account is signed in, run `gh auth logout`, then `gh auth login`.
- If the repository is not found, confirm the repository name and ask the GitHub administrator to grant your account access.
- If the repository exists but Actions are disabled, enable Actions in the user's private repository settings.

You are ready when both checks succeed. Authentication to a different GitHub account is a common cause of repository or workflow lookup failures.

[Back to Start Here](../start-here.md)
