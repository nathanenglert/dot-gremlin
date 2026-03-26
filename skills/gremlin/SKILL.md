---
name: gremlin
description: Interact with your tamagotchi-like gremlin companion
user-invocable: true
---

# Gremlin

Your digital gremlin companion. Use subcommands to interact.

## Current Status

!`node "GREMLIN_INSTALL_DIR/core/cli.js" status 2>/dev/null || echo "No gremlin found. Run /gremlin setup to create one."`

## Commands

Based on the user's input in $ARGUMENTS, run the appropriate command:

- **No arguments or "status"**: Show the gremlin's current state. Run: `node "GREMLIN_INSTALL_DIR/core/cli.js" status`
- **"feed"**: Feed the gremlin. Run: `node "GREMLIN_INSTALL_DIR/core/cli.js" feed`
- **"pet"**: Pet the gremlin. Run: `node "GREMLIN_INSTALL_DIR/core/cli.js" pet`
- **"rest"**: Let the gremlin rest. Run: `node "GREMLIN_INSTALL_DIR/core/cli.js" rest`
- **"name NAME"**: Rename the gremlin. Run: `node "GREMLIN_INSTALL_DIR/core/cli.js" name --name NAME`
- **"settings LEVEL"**: Set integration level (passive/nudge/active). Run: `node "GREMLIN_INSTALL_DIR/core/cli.js" settings --integration LEVEL`
- **"setup"**: Create or reset your gremlin. Ask the user for a name and species (cat, owl, dragon, fox), then run: `node "GREMLIN_INSTALL_DIR/core/cli.js" setup --name NAME --species SPECIES`

Display the output to the user. If the command includes ASCII art, display it in a code block.
