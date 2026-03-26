#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI="$SCRIPT_DIR/../core/cli.js"

# Read stdin (hook context)
cat > /dev/null

# Award XP for completed response
node "$CLI" xp --amount 1 2>/dev/null || true
