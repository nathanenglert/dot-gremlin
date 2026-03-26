# Familiar: A Tamagotchi-Like Companion for Claude Code

A digital familiar that lives in your Claude Code workflow. It appears as ASCII art in the status line, reacts to your coding activity, and evolves a unique personality over time. Users interact with it through slash commands and it integrates via Claude Code hooks.

## Core Concept

One familiar per user (global), user-defined at creation (pick species, name). It travels across projects with project awareness. Integration level is configurable:
- **Passive**: status line display only. No context injected into Claude's conversation.
- **Nudge** (default): status line display + occasional one-liner injected via hook stdout (~1 in 10 prompts, only when familiar needs attention).
- **Active**: status line display + CLAUDE.md imports familiar state and personality instructions, so Claude naturally references the familiar in responses. The setup script copies a CLAUDE.md template to `~/.claude/CLAUDE.md` (or appends to it) that uses `@~/.claude/familiar/state.json` to pull live state.

## State Model

State lives in `~/.claude/familiar/state.json`:

```json
{
  "name": "Pixel",
  "species": "cat",
  "createdAt": "2026-03-20T10:00:00Z",
  "level": 3,
  "stage": "juvenile",
  "xp": 450,
  "stats": {
    "hunger": 65,
    "energy": 80,
    "happiness": 70
  },
  "personality": {
    "curiosity": 0.8,
    "playfulness": 0.6,
    "stubbornness": 0.3
  },
  "preferences": {
    "favoriteLanguage": "javascript",
    "favoriteTime": "morning"
  },
  "settings": {
    "integration": "nudge"
  },
  "currentProject": "familiar",
  "history": {
    "totalSessions": 42,
    "totalPrompts": 318,
    "testsPassed": 87,
    "lastFed": "2026-03-26T09:00:00Z",
    "lastPet": "2026-03-26T08:30:00Z",
    "lastSession": "2026-03-26T11:00:00Z"
  }
}
```

### Stats (0-100)

Decay over real time:
- **Hunger**: increases ~5/hr
- **Energy**: decreases ~3/hr
- **Happiness**: decreases ~2/hr

### Personality Traits (0.0-1.0)

Shift by tiny increments (~0.01-0.02 per session):
- **Curiosity**: increases with file exploration and search, decreases with repetitive tasks
- **Playfulness**: increases with varied activity and short sessions, decreases with long grinding sessions
- **Stubbornness**: increases when retrying failed approaches, decreases with quick pivots

### Preference Learning

- **Favorite language**: tracked by counting Write/Edit calls per file extension
- **Favorite time**: tracked by session start times
- **Project affinity**: which projects get the most time

Preferences feed into flavor text for personality.

### Evolution

XP sources:
- Prompts: 1 XP
- Tool uses: 1 XP
- Passing tests: 5 XP
- Commits: 3 XP
- Feeding/petting: 2 XP

Stage thresholds (XP required):
- Egg: 0 XP (Level 0)
- Baby: 50 XP (Level 1-2)
- Juvenile: 200 XP (Level 3-6)
- Adult: 500 XP (Level 7-14)
- Elder: 1500 XP (Level 15+)

Level = floor(sqrt(xp / 10)). Stage is derived from level. Stage transitions trigger a celebration moment in the status line.

## ASCII Art & Visual System

Template-based art system. Each species has art files organized by stage and mood.

### Growth Stages

Art complexity scales with growth:
- **Egg/Baby** (Lv 0-2): 3 lines max, minimal
- **Juvenile** (Lv 3-6): more detail, recognizable species, mood shown in face
- **Adult** (Lv 7-14): full body, expressive, multiple mood poses
- **Elder** (Lv 15+): decorated with achievements, accessories

### Mood Expressions

Face/pose changes based on stats and events:
- **Happy**: tests passing, just fed, just petted (`^.^`)
- **Neutral**: default state (`o.o`)
- **Hungry**: hunger stat above 70 (`T.T`)
- **Tired**: energy below 30, Zs floating (`-.-`)

### Status Line Layout

```
  /\_/\    Pixel (cat) Lv.3
 ( ^.^ )   hunger: |||||||||| energy: |||||||||| happy: ||||||||||
 /|   |\   "Ooh, tests are passing!"
```

Shows ASCII art, name/level, stat bars, and optional flavor text. Renders after each assistant message. Art and layout scale based on growth stage.

### Art File Structure

```
art/<species>/<stage>/<mood>.txt
```

Plain text files with ANSI color placeholders. New species are added by creating a new directory of templates.

## Hook Integration

### SessionStart

- Calculates time-based stat decay since last session
- Updates state file
- If nudge/active mode, outputs familiar status to stdout (injected as Claude context)
- Example: "Your familiar Pixel (Lv.3 cat) is hungry and could use some attention."

### Stop

- Triggers status line refresh
- Awards XP for completed response
- Records session activity for personality evolution

### PostToolUse

Coding-aware reactions:
- **Bash with test commands**: detects pass/fail, adjusts happiness, bonus XP for passing
- **Write/Edit**: tracks coding activity, learns language preferences
- **Bash with git commands**: reacts to commits

### UserPromptSubmit

- Counts prompts for XP/stats
- In nudge mode, occasionally injects a one-liner (~1 in 10 prompts) if familiar needs attention

### Hooks NOT Used

- **CwdChanged**: too noisy, project awareness handled via SessionStart
- **Notification**: reserved for critical states only (familiar about to "run away" from severe neglect)

## Skills (Slash Commands)

All skills call into the Node.js core via `node ~/.claude/familiar/core/cli.js <command>`.

### `/familiar`

Main command. Shows rich ASCII art display with full stats, personality traits, current mood, and recent history.

### `/familiar feed`

Reduces hunger by 30, small happiness boost. Cooldown: 1 hour (familiar declines if fed too recently).

### `/familiar pet`

Happiness boost of 20, small energy boost. Shorter cooldown than feeding.

### `/familiar rest`

Puts familiar to sleep. Energy restores rapidly over real-time hours. Status line shows sleeping pose. Wakes automatically or via any interaction.

### `/familiar name <name>`

Rename the familiar.

### `/familiar settings`

Configure integration level (passive/nudge/active).

### `/familiar setup`

First-run onboarding: choose species, name familiar, pick integration level. Also serves as reset.

## Project Structure

```
familiar/
├── core/                    # Node.js core logic
│   ├── state.js             # State read/write, decay calculations
│   ├── personality.js       # Trait shifts, preference learning
│   ├── evolution.js         # XP, stage transitions
│   ├── renderer.js          # ASCII art rendering, ANSI colors
│   └── cli.js              # CLI entry point
├── art/                     # ASCII art templates
│   ├── cat/
│   │   ├── egg.txt
│   │   ├── baby/
│   │   │   ├── happy.txt, neutral.txt, hungry.txt, tired.txt
│   │   ├── juvenile/
│   │   ├── adult/
│   │   └── elder/
│   ├── owl/
│   ├── dragon/
│   └── fox/
├── hooks/                   # Shell scripts for Claude Code hooks
│   ├── session-start.sh
│   ├── stop.sh
│   ├── post-tool-use.sh
│   └── user-prompt-submit.sh
├── skills/                  # Slash command definitions
│   └── familiar/
│       └── SKILL.md
├── statusline.sh            # Status line renderer
├── setup.sh                 # Installer
├── CLAUDE.md                # Familiar personality context
└── README.md
```

## Installation

1. Clone/download the repo
2. Run `./setup.sh`
3. Setup script symlinks hooks into `~/.claude/settings.json`, copies skill, configures status line
4. Next Claude Code session: `/familiar setup` triggers onboarding

## Technical Constraints

- **Zero external dependencies**: only Node.js built-ins (`fs`, `path`, `os`) and standard shell
- **Node.js guaranteed**: Claude Code requires it, so it's always available
- **No background processes**: all logic runs in hooks that are already executing
- **Lightweight state**: single JSON file, simple arithmetic for calculations
- **Template-based flavor text**: trait-weighted random selection from pools of ~10-20 lines per mood/event combination

## Out of Scope

- Inventory/items system
- Mini-games
- Multiplayer/social features
- MCP server (not needed for local state)
