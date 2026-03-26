#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI="$SCRIPT_DIR/core/cli.js"

# Status line receives JSON session data on stdin — consume it
cat > /dev/null

# Render the gremlin (outputs the ASCII status line)
node "$CLI" render 2>/dev/null || echo "(gremlin sleeping...)"
