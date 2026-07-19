#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
chmod +x "$repo_root/.githooks/prepare-commit-msg"
git -C "$repo_root" config core.hooksPath .githooks
echo "Git hooks installed (.githooks/prepare-commit-msg)."
