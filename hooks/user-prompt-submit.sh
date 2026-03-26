#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI="$SCRIPT_DIR/../core/cli.js"

# Read stdin (hook context)
cat > /dev/null

# Count prompt and maybe nudge
node "$CLI" nudge 2>/dev/null || true
