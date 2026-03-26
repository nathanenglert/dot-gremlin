# .gremlin

A tamagotchi-like companion that lives in your Claude Code workflow. Your gremlin appears as ASCII art in the status line, reacts to your coding activity, and evolves a unique personality over time.

## Quick Start

1. Clone this repo
2. Run `./setup.sh`
3. Start a new Claude Code session
4. Run `/gremlin setup` to create your gremlin

## Species

Choose from: **cat**, **owl**, **dragon**, **fox**

Each species has unique ASCII art across five growth stages (egg, baby, juvenile, adult, elder).

## Commands

| Command | Description |
|---------|-------------|
| `/gremlin` | Check on your gremlin |
| `/gremlin feed` | Feed your gremlin (reduces hunger) |
| `/gremlin pet` | Pet your gremlin (boosts happiness) |
| `/gremlin rest` | Let your gremlin sleep (restores energy) |
| `/gremlin name Sparky` | Rename your gremlin |
| `/gremlin settings nudge` | Set integration level (passive/nudge/active) |
| `/gremlin setup` | Create or reset your gremlin |

## How It Works

Your gremlin has three core stats that decay over real time:
- **Hunger** — increases ~5/hr, feed to reduce
- **Energy** — decreases ~3/hr, rest to restore
- **Happiness** — decreases ~2/hr, pet to boost

It also develops personality traits based on your coding patterns:
- **Curiosity** — grows when you explore and search codebases
- **Playfulness** — grows with varied, short coding sessions
- **Stubbornness** — grows when you persist through errors

Your gremlin earns XP from your coding activity and evolves through five stages: egg, baby, juvenile, adult, elder.

## Integration Levels

- **Passive** — status line display only
- **Nudge** (default) — occasional reminders when your gremlin needs attention
- **Active** — your gremlin's personality is woven into Claude's responses

## Requirements

- Claude Code (provides Node.js)
- No additional dependencies
