#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/Gan-Xing/ai-agent-best-practices.git"

if [ ! -d .git ]; then
  git init
fi

git branch -M main
git add .
git commit -m "init ai agent best practices" || true

git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"
git push -u origin main

echo "Pushed to $REPO_URL"
