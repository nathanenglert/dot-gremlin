#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI="$SCRIPT_DIR/../core/cli.js"

# Apply time-based decay
node "$CLI" decay 2>/dev/null || true

# Read stdin (hook receives JSON context) but we don't need it here
cat > /dev/null

# Output nudge context for Claude (stdout is injected as context)
node "$CLI" nudge 2>/dev/null || true
