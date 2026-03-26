#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI="$SCRIPT_DIR/../core/cli.js"

# Read hook input from stdin
INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | node -e "
  let d='';
  process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try { console.log(JSON.parse(d).tool_name || ''); }
    catch { console.log(''); }
  });
" 2>/dev/null || echo "")

case "$TOOL_NAME" in
  Bash)
    TOOL_INPUT=$(echo "$INPUT" | node -e "
      let d='';
      process.stdin.on('data',c=>d+=c);
      process.stdin.on('end',()=>{
        try { console.log(JSON.parse(d).tool_input?.command || ''); }
        catch { console.log(''); }
      });
    " 2>/dev/null || echo "")

    if echo "$TOOL_INPUT" | grep -qE '(npm test|jest|pytest|cargo test|go test|node --test)'; then
      EXIT_CODE=$(echo "$INPUT" | node -e "
        let d='';
        process.stdin.on('data',c=>d+=c);
        process.stdin.on('end',()=>{
          try { console.log(JSON.parse(d).tool_result?.exit_code ?? ''); }
          catch { console.log(''); }
        });
      " 2>/dev/null || echo "")

      if [ "$EXIT_CODE" = "0" ]; then
        node "$CLI" xp --amount 5 2>/dev/null || true
      fi
    fi

    if echo "$TOOL_INPUT" | grep -qE '^git commit'; then
      node "$CLI" xp --amount 3 2>/dev/null || true
    fi
    ;;

  Write|Edit)
    # Tool use XP is covered by the stop hook — skip to avoid double-counting
    ;;
esac
