#!/usr/bin/env bash
# sync-py-data.sh — Creates symlinks in python/wrapex/data/ pointing to
# repo-root data directories. Needed for editable installs (pip install -e .).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$REPO_ROOT/python/wrapex/data"

mkdir -p "$DATA_DIR"

# Create symlinks for each data directory
for dir in skills rules examples templates src; do
    target="$REPO_ROOT/$dir"
    link="$DATA_DIR/$dir"
    if [ -L "$link" ]; then
        rm "$link"
    fi
    if [ -e "$target" ]; then
        ln -s "$target" "$link"
        echo "  Linked: $link -> $target"
    else
        echo "  Warning: $target does not exist, skipping"
    fi
done

# Symlink SKILL.md
skill_target="$REPO_ROOT/SKILL.md"
skill_link="$DATA_DIR/SKILL.md"
if [ -L "$skill_link" ]; then
    rm "$skill_link"
fi
if [ -e "$skill_target" ]; then
    ln -s "$skill_target" "$skill_link"
    echo "  Linked: $skill_link -> $skill_target"
fi

echo "Done. python/wrapex/data/ is ready for editable install."
