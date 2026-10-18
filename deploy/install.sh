#!/usr/bin/env bash
# One-line installer:  curl -fsSL https://raw.githubusercontent.com/ChurchApps/B1Admin/main/deploy/install.sh | bash -s -- --domain example.org
# Downloads the compose stack into ./b1church and runs ./deploy/b1 install. No git, no Node needed.
set -euo pipefail
base="https://raw.githubusercontent.com/ChurchApps/B1Admin/main"
mkdir -p b1church/deploy && cd b1church
curl -fsSL "$base/docker-compose.yml" -o docker-compose.yml
curl -fsSL "$base/deploy/Caddyfile" -o deploy/Caddyfile
curl -fsSL "$base/deploy/b1" -o deploy/b1
chmod +x deploy/b1
exec ./deploy/b1 install "$@"
