# Local Runtime

Install Node.js and npm on the machine where you will run the installer commands.

Use the version supported by this repository's `package.json`. If your organization already has a standard Node installer or version manager, use that. Otherwise, install the current long-term support Node.js release.

Confirm the local tools are available:

```bash
node --version
npm --version
git --version
gh --version
aws --version
```

Each command should print a version number. If a command says it was not found, install that tool and open a new terminal before continuing.

The first installer step can create the private deployment workspace before dependencies are installed. When the guided flow reaches first-admin bootstrap or browser smoke, install dependencies from the B1Admin checkout:

```bash
yarn install
```

You can run the local readiness report any time after dependencies are installed:

```bash
yarn installer:doctor -- --output=markdown
```

Before dependencies are installed, the doctor may report dependency-related TODO items. That is expected early in the install.

You are ready for the first installer steps when `node`, `npm`, `git`, `gh`, and `aws` are installed and the `B1Admin` source repository is on your computer. You are ready for first-admin bootstrap and browser smoke when the doctor also shows the B1Admin dependency checks as complete.

[Back to Start Here](../start-here.md)
