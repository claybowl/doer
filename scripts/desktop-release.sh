#!/usr/bin/env bash
# Bump desktop/package.json version, commit, push, and trigger the
# desktop-release workflow on GitHub Actions (builds Mac + Windows,
# publishes to Cloudflare R2, and creates a GitHub Release).
#
# Usage:
#   ./scripts/desktop-release.sh <version>     # e.g. 0.0.9
#   ./scripts/desktop-release.sh <version> --dry-run   # build only, no R2/GH Release
#
# Requirements: gh CLI authenticated (gh auth status)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DESKTOP_PKG="$REPO_ROOT/desktop/package.json"
REPO="claybowl/doer"

# ── Args ──────────────────────────────────────────────────────────────────────
version="${1:-}"
dry_run=false

if [[ "${2:-}" == "--dry-run" ]]; then
  dry_run=true
fi

if [[ -z "$version" ]]; then
  echo "Usage: $0 <version> [--dry-run]" >&2
  echo "  e.g. $0 0.0.9" >&2
  exit 1
fi

if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "error: version must be semver (e.g. 0.0.9), got: $version" >&2
  exit 1
fi

# ── Pre-flight ─────────────────────────────────────────────────────────────
echo "==> Pre-flight checks..."

branch="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD)"
if [[ "$branch" != "main" ]]; then
  echo "error: must be on main branch (currently on '$branch')" >&2
  exit 1
fi

if [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
  echo "error: working tree is dirty — commit or stash changes first" >&2
  git -C "$REPO_ROOT" status --short
  exit 1
fi

if ! gh auth status -h github.com &>/dev/null; then
  echo "error: gh CLI not authenticated — run: gh auth login" >&2
  exit 1
fi

current_version="$(node -p "require('$DESKTOP_PKG').version")"
echo "  current version : $current_version"
echo "  target version  : $version"
echo "  dry_run         : $dry_run"

if [[ "$current_version" == "$version" ]]; then
  echo "  (already at $version — skipping bump and commit, re-triggering workflow)"
else
  # ── Bump ──────────────────────────────────────────────────────────────────
  echo ""
  echo "==> Bumping desktop/package.json to $version..."
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$DESKTOP_PKG', 'utf8'));
    pkg.version = '$version';
    fs.writeFileSync('$DESKTOP_PKG', JSON.stringify(pkg, null, '\t') + '\n');
  "
  bumped="$(node -p "require('$DESKTOP_PKG').version")"
  if [[ "$bumped" != "$version" ]]; then
    echo "error: bump failed — package.json still shows $bumped" >&2
    exit 1
  fi
  echo "  ✓ bumped to $bumped"

  # ── Commit + push ─────────────────────────────────────────────────────────
  echo ""
  echo "==> Committing and pushing..."
  git -C "$REPO_ROOT" add desktop/package.json
  git -C "$REPO_ROOT" commit -m "chore(desktop): bump version to $version"
  git -C "$REPO_ROOT" push origin main
  echo "  ✓ pushed"
fi

# ── Trigger workflow ───────────────────────────────────────────────────────
echo ""
if [[ "$dry_run" == "true" ]]; then
  echo "==> Triggering desktop-release workflow (dry run — build only, no R2/GH Release)..."
  gh workflow run desktop-release.yml -R "$REPO" -f dry_run=true
else
  echo "==> Triggering desktop-release workflow (real release → R2 + GitHub Release)..."
  gh workflow run desktop-release.yml -R "$REPO" -f dry_run=false
fi

sleep 3
run_url="$(gh run list -R "$REPO" --workflow=desktop-release.yml --limit 1 --json url --jq '.[0].url')"
echo "  ✓ workflow triggered"
echo ""
echo "  Watch it: $run_url"
echo "  Or run:   gh run watch \$(gh run list -R $REPO --workflow=desktop-release.yml --limit 1 --json databaseId --jq '.[0].databaseId') -R $REPO"
echo ""
echo "==> Done. Expected build time: ~15 min (Mac ~3 min, Windows ~13 min)."
