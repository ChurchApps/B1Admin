# Local Runtime

Install Node.js and npm on the machine where you will run the installer commands.

Use the version supported by this repository's `package.json` (Node.js 20 or newer). If your organization already has a standard Node installer or version manager, use that. Otherwise, install the current long-term support Node.js release from [nodejs.org](https://nodejs.org/en/download). Git is available from [git-scm.com](https://git-scm.com/downloads) if it is not already installed.

This repository uses a pinned version of Yarn, managed by Corepack. Corepack ships with Node.js 20+, so enable it once:

```bash
corepack enable
```

Do not install Yarn with `npm install -g yarn`; that installs an old version this repository rejects. After `corepack enable`, the correct Yarn version is picked up automatically inside the repository folder.

Confirm the local tools are available:

```bash
node --version
npm --version
yarn --version
git --version
gh --version
aws --version
```

Each command should print a version number. If a command says it was not found, install that tool and open a new terminal before continuing. If only `yarn` fails, run `corepack enable` and open a new terminal.

The first installer step can create the private deployment workspace before dependencies are installed. When the guided flow reaches first-admin bootstrap or browser smoke, install dependencies from the B1Admin checkout:

```bash
yarn install
```

You can run the local readiness report any time after dependencies are installed:

```bash
yarn installer:doctor -- --output=markdown
```

Before dependencies are installed, the doctor may report dependency-related TODO items. That is expected early in the install.

You are ready for the first installer steps when `node`, `npm`, `yarn`, `git`, `gh`, and `aws` are installed and the `B1Admin` source repository is on your computer. You are ready for first-admin bootstrap and browser smoke when the doctor also shows the B1Admin dependency checks as complete.

[Back to Start Here](../start-here.md)
