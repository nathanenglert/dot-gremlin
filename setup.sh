#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

echo "=== .gremlin Setup ==="
echo "Install directory: $INSTALL_DIR"
echo ""

# Ensure .claude directory exists
mkdir -p "$CLAUDE_DIR"

# Initialize settings.json if it doesn't exist
if [ ! -f "$SETTINGS_FILE" ]; then
  echo '{}' > "$SETTINGS_FILE"
fi

# Update SKILL.md with actual install path
SKILL_DIR="$INSTALL_DIR/skills/gremlin"
sed -i.bak "s|GREMLIN_INSTALL_DIR|$INSTALL_DIR|g" "$SKILL_DIR/SKILL.md" && rm -f "$SKILL_DIR/SKILL.md.bak"

# Add hooks to settings.json using node (available since Claude Code requires it)
node -e "
const fs = require('fs');
const path = require('path');

const settingsPath = '$SETTINGS_FILE';
const installDir = '$INSTALL_DIR';

let settings = {};
try {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
} catch {}

if (!settings.hooks) settings.hooks = {};

function isGremlin(cmd) {
  return cmd && (cmd.includes('gremlin') || cmd.includes('familiar'));
}

const hookConfigs = {
  SessionStart: { matcher: '', command: path.join(installDir, 'hooks', 'session-start.sh') },
  Stop: { matcher: '', command: path.join(installDir, 'hooks', 'stop.sh') },
  PostToolUse: { matcher: '', command: path.join(installDir, 'hooks', 'post-tool-use.sh') },
  UserPromptSubmit: { matcher: '', command: path.join(installDir, 'hooks', 'user-prompt-submit.sh') },
};

for (const [event, config] of Object.entries(hookConfigs)) {
  if (!settings.hooks[event]) settings.hooks[event] = [];

  // Remove any existing gremlin entries (old or new format)
  settings.hooks[event] = settings.hooks[event].filter(entry => {
    if (isGremlin(entry.command)) return false;
    if (entry.hooks && entry.hooks.some(h => isGremlin(h.command))) return false;
    return true;
  });

  settings.hooks[event].push({
    matcher: config.matcher,
    hooks: [{
      type: 'command',
      command: config.command,
    }],
  });
}

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log('Hooks configured in settings.json');
"

# Configure status line
node -e "
const fs = require('fs');

const settingsPath = '$SETTINGS_FILE';
const installDir = '$INSTALL_DIR';

let settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

settings.statusLine = {
  type: 'command',
  command: installDir + '/statusline.sh',
  padding: 1,
};

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log('Status line configured');
"

# Copy skill to user skills directory
SKILL_DEST="$CLAUDE_DIR/skills/gremlin"
mkdir -p "$SKILL_DEST"
cp "$INSTALL_DIR/skills/gremlin/SKILL.md" "$SKILL_DEST/SKILL.md"
echo "Skill installed to $SKILL_DEST"

echo ""
echo "=== Setup Complete ==="
echo "Start a new Claude Code session and run: /gremlin setup"
echo "This will let you choose a name and species for your gremlin."
