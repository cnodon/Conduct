#!/usr/bin/env bash
set -euo pipefail

FORCE=0
DRYRUN=0

usage() {
  cat <<'USAGE'
Usage: uninstall_conduct.sh [options]

Options:
  -y, --yes       Do not prompt for confirmation
  -n, --dry-run   Print what would be removed, but do not delete anything
  -h, --help      Show this help

Removes Conduct app, logs, and local config/cache files.
USAGE
}

for arg in "$@"; do
  case "$arg" in
    -y|--yes) FORCE=1 ;;
    -n|--dry-run) DRYRUN=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg"; usage; exit 1 ;;
  esac
done

paths=(
  "/Applications/Conduct.app"
  "$HOME/Applications/Conduct.app"
  "$HOME/Library/Logs/Conduct"
  "$HOME/Library/Logs/com.conduct.app"
  "$HOME/.Conduct/skills_repo.json"
  "$HOME/.Conduct"
  "$HOME/Library/Application Support/Conduct"
  "$HOME/Library/Caches/Conduct"
  "$HOME/Library/Preferences/com.conduct.app.plist"
  "$HOME/Library/Saved Application State/com.conduct.app.savedState"
)

if [ "$FORCE" -ne 1 ]; then
  echo "This will remove the following paths if they exist:"
  for p in "${paths[@]}"; do
    echo "  - $p"
  done
  echo ""
  read -r -p "Proceed? [y/N] " reply
  case "$reply" in
    y|Y|yes|YES) ;;
    *) echo "Aborted."; exit 0 ;;
  esac
fi

rm_path() {
  local target="$1"
  if [ -e "$target" ]; then
    if [ "$DRYRUN" -eq 1 ]; then
      echo "Would remove: $target"
    else
      rm -rf "$target"
      echo "Removed: $target"
    fi
  else
    echo "Not found: $target"
  fi
}

for p in "${paths[@]}"; do
  rm_path "$p"
done

if [ "$DRYRUN" -eq 1 ]; then
  echo "Dry run completed."
else
  echo "Uninstall complete."
fi
