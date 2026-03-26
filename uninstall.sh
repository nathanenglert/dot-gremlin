#!/usr/bin/env bash
set -euo pipefail

CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

echo "=== .gremlin Uninstall ==="

# Remove hooks from settings.json
if [ -f "$SETTINGS_FILE" ]; then
  node -e "
const fs = require('fs');

const settingsPath = '$SETTINGS_FILE';
let settings = {};
try {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
} catch { process.exit(0); }

if (settings.hooks) {
  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event].filter(entry => {
      if (entry.command && entry.command.includes('gremlin')) return false;
      if (entry.hooks && entry.hooks.some(h => h.command && h.command.includes('gremlin'))) return false;
      return true;
    });
    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }
}

if (settings.statusLine && settings.statusLine.command && settings.statusLine.command.includes('gremlin')) {
  delete settings.statusLine;
}

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log('Hooks and status line removed from settings.json');
"
fi

# Remove skill
SKILL_DIR="$CLAUDE_DIR/skills/gremlin"
if [ -d "$SKILL_DIR" ]; then
  rm -rf "$SKILL_DIR"
  echo "Skill removed from $SKILL_DIR"
fi

echo ""
echo "=== Uninstall Complete ==="
echo "Note: Your gremlin's state is still saved at ~/.gremlin/state.json"
echo "To delete it permanently: rm -rf ~/.gremlin"
