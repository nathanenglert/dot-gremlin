# Familiar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tamagotchi-like familiar that lives in Claude Code's status line, reacts to coding activity via hooks, and is interacted with through slash commands.

**Architecture:** Node.js core handles state management, personality, evolution, and ASCII rendering. Shell scripts serve as thin glue for Claude Code hooks and status line. A single JSON file persists all state. Skills (`.md` files) provide slash command interaction.

**Tech Stack:** Node.js (built-ins only: `fs`, `path`, `os`), Bash, Claude Code hooks/skills/status line

---

## File Structure

```
familiar/
├── core/
│   ├── state.js             # Read/write state.json, stat decay, clamp helpers
│   ├── evolution.js          # XP awards, level calc, stage transitions
│   ├── personality.js        # Trait shifts, preference tracking, mood calc
│   ├── renderer.js           # Load art templates, render with ANSI, build status line
│   ├── flavor.js             # Flavor text pools, trait-weighted selection
│   └── cli.js               # CLI dispatcher: parses command + args, calls core, prints output
├── test/
│   ├── state.test.js
│   ├── evolution.test.js
│   ├── personality.test.js
│   ├── renderer.test.js
│   ├── flavor.test.js
│   └── cli.test.js
├── art/
│   └── cat/                  # Ship with cat as the starter species
│       ├── egg/
│       │   └── neutral.txt
│       ├── baby/
│       │   ├── happy.txt
│       │   ├── neutral.txt
│       │   ├── hungry.txt
│       │   └── tired.txt
│       ├── juvenile/
│       │   ├── happy.txt
│       │   ├── neutral.txt
│       │   ├── hungry.txt
│       │   └── tired.txt
│       ├── adult/
│       │   ├── happy.txt
│       │   ├── neutral.txt
│       │   ├── hungry.txt
│       │   └── tired.txt
│       └── elder/
│           ├── happy.txt
│           ├── neutral.txt
│           ├── hungry.txt
│           └── tired.txt
├── hooks/
│   ├── session-start.sh
│   ├── stop.sh
│   ├── post-tool-use.sh
│   └── user-prompt-submit.sh
├── skills/
│   └── familiar/
│       └── SKILL.md
├── statusline.sh
├── setup.sh
├── templates/
│   └── claude-md-active.md   # CLAUDE.md template for "active" integration mode
├── package.json              # Scripts only (test runner), no dependencies
└── README.md
```

Note: `flavor.js` is broken out from `personality.js` because flavor text pools are large (many string templates) and the selection logic is independent from trait calculation. Keeps both files focused.

---

### Task 1: Project Scaffolding & Test Runner

**Files:**
- Create: `package.json`
- Create: `core/state.js` (stub)
- Create: `test/state.test.js` (stub)

- [ ] **Step 1: Create package.json with test script**

```json
{
  "name": "familiar",
  "version": "0.1.0",
  "private": true,
  "description": "A tamagotchi-like familiar for Claude Code",
  "scripts": {
    "test": "node --test test/*.test.js"
  }
}
```

Node 18+ has a built-in test runner (`node:test`), so zero dependencies needed.

- [ ] **Step 2: Create stub state module and test to verify runner works**

`core/state.js`:
```js
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

module.exports = { clamp };
```

`test/state.test.js`:
```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { clamp } = require('../core/state.js');

describe('clamp', () => {
  it('returns value when within range', () => {
    assert.equal(clamp(50, 0, 100), 50);
  });

  it('clamps to min', () => {
    assert.equal(clamp(-5, 0, 100), 0);
  });

  it('clamps to max', () => {
    assert.equal(clamp(150, 0, 100), 100);
  });
});
```

- [ ] **Step 3: Run tests to verify setup**

Run: `npm test`
Expected: 3 passing tests

- [ ] **Step 4: Commit**

```bash
git add package.json core/state.js test/state.test.js
git commit -m "feat: scaffold project with test runner and clamp utility"
```

---

### Task 2: State Module — Create, Read, Write, Decay

**Files:**
- Modify: `core/state.js`
- Modify: `test/state.test.js`

- [ ] **Step 1: Write failing tests for state creation**

Add to `test/state.test.js`:
```js
const { clamp, createState, DEFAULT_STATE } = require('../core/state.js');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

describe('createState', () => {
  it('creates a new state with name and species', () => {
    const state = createState('Pixel', 'cat');
    assert.equal(state.name, 'Pixel');
    assert.equal(state.species, 'cat');
    assert.equal(state.level, 0);
    assert.equal(state.stage, 'egg');
    assert.equal(state.xp, 0);
    assert.equal(state.stats.hunger, 0);
    assert.equal(state.stats.energy, 100);
    assert.equal(state.stats.happiness, 100);
    assert.equal(state.settings.integration, 'nudge');
    assert.ok(state.createdAt);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `createState` is not exported

- [ ] **Step 3: Implement createState**

Replace `core/state.js` with:
```js
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const STATE_DIR = path.join(os.homedir(), '.claude', 'familiar');
const STATE_PATH = path.join(STATE_DIR, 'state.json');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createState(name, species) {
  return {
    name,
    species,
    createdAt: new Date().toISOString(),
    level: 0,
    stage: 'egg',
    xp: 0,
    stats: { hunger: 0, energy: 100, happiness: 100 },
    personality: { curiosity: 0.5, playfulness: 0.5, stubbornness: 0.5 },
    preferences: { favoriteLanguage: null, favoriteTime: null },
    settings: { integration: 'nudge' },
    currentProject: null,
    history: {
      totalSessions: 0,
      totalPrompts: 0,
      testsPassed: 0,
      lastFed: null,
      lastPet: null,
      lastSession: null,
    },
  };
}

module.exports = { clamp, createState, STATE_DIR, STATE_PATH };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Write failing tests for readState and writeState**

Add to `test/state.test.js`:
```js
const { clamp, createState, readState, writeState } = require('../core/state.js');

describe('readState / writeState', () => {
  const tmpDir = path.join(os.tmpdir(), `familiar-test-${Date.now()}`);
  const tmpPath = path.join(tmpDir, 'state.json');

  it('writeState saves and readState loads', () => {
    const state = createState('Pixel', 'cat');
    writeState(state, tmpPath);
    const loaded = readState(tmpPath);
    assert.equal(loaded.name, 'Pixel');
    assert.equal(loaded.species, 'cat');
    assert.equal(loaded.stage, 'egg');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('readState returns null when file does not exist', () => {
    const result = readState('/tmp/nonexistent-familiar/state.json');
    assert.equal(result, null);
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `readState` and `writeState` not exported

- [ ] **Step 7: Implement readState and writeState**

Add to `core/state.js` before the `module.exports`:
```js
function writeState(state, filePath = STATE_PATH) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

function readState(filePath = STATE_PATH) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}
```

Update `module.exports`:
```js
module.exports = { clamp, createState, readState, writeState, STATE_DIR, STATE_PATH };
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 9: Write failing tests for decayStats**

Add to `test/state.test.js`:
```js
const { clamp, createState, readState, writeState, decayStats } = require('../core/state.js');

describe('decayStats', () => {
  it('increases hunger and decreases energy/happiness based on elapsed hours', () => {
    const state = createState('Pixel', 'cat');
    state.history.lastSession = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    const decayed = decayStats(state);
    assert.equal(decayed.stats.hunger, 10);   // +5/hr * 2hr = 10
    assert.equal(decayed.stats.energy, 94);    // -3/hr * 2hr = -6 → 94
    assert.equal(decayed.stats.happiness, 96); // -2/hr * 2hr = -4 → 96
  });

  it('clamps stats to 0-100', () => {
    const state = createState('Pixel', 'cat');
    state.stats.hunger = 98;
    state.stats.energy = 2;
    state.stats.happiness = 1;
    state.history.lastSession = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(); // 10 hours ago
    const decayed = decayStats(state);
    assert.equal(decayed.stats.hunger, 100);
    assert.equal(decayed.stats.energy, 0);
    assert.equal(decayed.stats.happiness, 0);
  });

  it('does nothing if lastSession is null', () => {
    const state = createState('Pixel', 'cat');
    const decayed = decayStats(state);
    assert.equal(decayed.stats.hunger, 0);
    assert.equal(decayed.stats.energy, 100);
    assert.equal(decayed.stats.happiness, 100);
  });
});
```

- [ ] **Step 10: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `decayStats` not exported

- [ ] **Step 11: Implement decayStats**

Add to `core/state.js` before `module.exports`:
```js
const DECAY_RATES = {
  hunger: 5,      // +5 per hour
  energy: -3,     // -3 per hour
  happiness: -2,  // -2 per hour
};

function decayStats(state) {
  if (!state.history.lastSession) return state;

  const lastSession = new Date(state.history.lastSession).getTime();
  const now = Date.now();
  const hoursElapsed = (now - lastSession) / (1000 * 60 * 60);

  state.stats.hunger = clamp(state.stats.hunger + Math.round(DECAY_RATES.hunger * hoursElapsed), 0, 100);
  state.stats.energy = clamp(state.stats.energy + Math.round(DECAY_RATES.energy * hoursElapsed), 0, 100);
  state.stats.happiness = clamp(state.stats.happiness + Math.round(DECAY_RATES.happiness * hoursElapsed), 0, 100);

  return state;
}
```

Update `module.exports`:
```js
module.exports = { clamp, createState, readState, writeState, decayStats, STATE_DIR, STATE_PATH };
```

- [ ] **Step 12: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add core/state.js test/state.test.js
git commit -m "feat: state module with create, read, write, and decay"
```

---

### Task 3: Evolution Module — XP, Levels, Stages

**Files:**
- Create: `core/evolution.js`
- Create: `test/evolution.test.js`

- [ ] **Step 1: Write failing tests for level and stage calculation**

`test/evolution.test.js`:
```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calcLevel, calcStage } = require('../core/evolution.js');

describe('calcLevel', () => {
  it('returns 0 for 0 XP', () => {
    assert.equal(calcLevel(0), 0);
  });

  it('returns 1 for 10 XP', () => {
    assert.equal(calcLevel(10), 1);
  });

  it('returns 2 for 40 XP', () => {
    assert.equal(calcLevel(40), 2);
  });

  it('returns 7 for 500 XP', () => {
    assert.equal(calcLevel(500), 7);
  });

  it('returns 12 for 1500 XP', () => {
    assert.equal(calcLevel(1500), 12);
  });
});

describe('calcStage', () => {
  it('returns egg for level 0', () => {
    assert.equal(calcStage(0), 'egg');
  });

  it('returns baby for level 1', () => {
    assert.equal(calcStage(1), 'baby');
  });

  it('returns baby for level 2', () => {
    assert.equal(calcStage(2), 'baby');
  });

  it('returns juvenile for level 3', () => {
    assert.equal(calcStage(3), 'juvenile');
  });

  it('returns adult for level 7', () => {
    assert.equal(calcStage(7), 'adult');
  });

  it('returns elder for level 15', () => {
    assert.equal(calcStage(15), 'elder');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — module not found

- [ ] **Step 3: Implement calcLevel and calcStage**

`core/evolution.js`:
```js
function calcLevel(xp) {
  return Math.floor(Math.sqrt(xp / 10));
}

function calcStage(level) {
  if (level <= 0) return 'egg';
  if (level <= 2) return 'baby';
  if (level <= 6) return 'juvenile';
  if (level <= 14) return 'adult';
  return 'elder';
}

module.exports = { calcLevel, calcStage };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Write failing tests for awardXP**

Add to `test/evolution.test.js`:
```js
const { calcLevel, calcStage, awardXP } = require('../core/evolution.js');
const { createState } = require('../core/state.js');

describe('awardXP', () => {
  it('adds XP and updates level and stage', () => {
    const state = createState('Pixel', 'cat');
    const result = awardXP(state, 50);
    assert.equal(result.state.xp, 50);
    assert.equal(result.state.level, 2);
    assert.equal(result.state.stage, 'baby');
    assert.equal(result.evolved, true);
  });

  it('returns evolved false when stage does not change', () => {
    const state = createState('Pixel', 'cat');
    state.xp = 45;
    state.level = 2;
    state.stage = 'baby';
    const result = awardXP(state, 3);
    assert.equal(result.state.xp, 48);
    assert.equal(result.evolved, false);
  });

  it('handles stage transition from baby to juvenile', () => {
    const state = createState('Pixel', 'cat');
    state.xp = 85;
    state.level = 2;
    state.stage = 'baby';
    const result = awardXP(state, 5);
    assert.equal(result.state.xp, 90);
    assert.equal(result.state.level, 3);
    assert.equal(result.state.stage, 'juvenile');
    assert.equal(result.evolved, true);
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `awardXP` not exported

- [ ] **Step 7: Implement awardXP**

Add to `core/evolution.js` before `module.exports`:
```js
function awardXP(state, amount) {
  const oldStage = state.stage;
  state.xp += amount;
  state.level = calcLevel(state.xp);
  state.stage = calcStage(state.level);
  return { state, evolved: state.stage !== oldStage };
}
```

Update `module.exports`:
```js
module.exports = { calcLevel, calcStage, awardXP };
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add core/evolution.js test/evolution.test.js
git commit -m "feat: evolution module with XP, level, and stage calculations"
```

---

### Task 4: Personality Module — Traits, Mood, Preferences

**Files:**
- Create: `core/personality.js`
- Create: `test/personality.test.js`

- [ ] **Step 1: Write failing tests for mood calculation**

`test/personality.test.js`:
```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calcMood } = require('../core/personality.js');
const { createState } = require('../core/state.js');

describe('calcMood', () => {
  it('returns happy when all stats are good', () => {
    const state = createState('Pixel', 'cat');
    state.stats = { hunger: 10, energy: 80, happiness: 80 };
    assert.equal(calcMood(state), 'happy');
  });

  it('returns hungry when hunger is above 70', () => {
    const state = createState('Pixel', 'cat');
    state.stats = { hunger: 75, energy: 80, happiness: 50 };
    assert.equal(calcMood(state), 'hungry');
  });

  it('returns tired when energy is below 30', () => {
    const state = createState('Pixel', 'cat');
    state.stats = { hunger: 30, energy: 20, happiness: 50 };
    assert.equal(calcMood(state), 'tired');
  });

  it('returns neutral when stats are middling', () => {
    const state = createState('Pixel', 'cat');
    state.stats = { hunger: 40, energy: 50, happiness: 40 };
    assert.equal(calcMood(state), 'neutral');
  });

  it('prioritizes hungry over tired', () => {
    const state = createState('Pixel', 'cat');
    state.stats = { hunger: 80, energy: 20, happiness: 30 };
    assert.equal(calcMood(state), 'hungry');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — module not found

- [ ] **Step 3: Implement calcMood**

`core/personality.js`:
```js
function calcMood(state) {
  const { hunger, energy, happiness } = state.stats;

  // Priority: hungry > tired > happy > neutral
  if (hunger > 70) return 'hungry';
  if (energy < 30) return 'tired';
  if (happiness > 60 && hunger < 40) return 'happy';
  return 'neutral';
}

module.exports = { calcMood };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Write failing tests for shiftTraits**

Add to `test/personality.test.js`:
```js
const { calcMood, shiftTraits } = require('../core/personality.js');

describe('shiftTraits', () => {
  it('increases curiosity for explore events', () => {
    const state = createState('Pixel', 'cat');
    state.personality.curiosity = 0.5;
    shiftTraits(state, { type: 'explore' });
    assert.ok(state.personality.curiosity > 0.5);
  });

  it('increases stubbornness for retry events', () => {
    const state = createState('Pixel', 'cat');
    state.personality.stubbornness = 0.5;
    shiftTraits(state, { type: 'retry' });
    assert.ok(state.personality.stubbornness > 0.5);
  });

  it('increases playfulness for varied events', () => {
    const state = createState('Pixel', 'cat');
    state.personality.playfulness = 0.5;
    shiftTraits(state, { type: 'varied' });
    assert.ok(state.personality.playfulness > 0.5);
  });

  it('clamps traits to 0-1 range', () => {
    const state = createState('Pixel', 'cat');
    state.personality.curiosity = 0.99;
    shiftTraits(state, { type: 'explore' });
    assert.ok(state.personality.curiosity <= 1.0);
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `shiftTraits` not exported

- [ ] **Step 7: Implement shiftTraits**

Add to `core/personality.js`:
```js
const TRAIT_SHIFT = 0.02;

const TRAIT_EFFECTS = {
  explore: { curiosity: TRAIT_SHIFT, playfulness: 0, stubbornness: 0 },
  retry: { curiosity: 0, playfulness: 0, stubbornness: TRAIT_SHIFT },
  varied: { curiosity: 0, playfulness: TRAIT_SHIFT, stubbornness: 0 },
  grind: { curiosity: -TRAIT_SHIFT, playfulness: -TRAIT_SHIFT, stubbornness: 0 },
  pivot: { curiosity: 0, playfulness: 0, stubbornness: -TRAIT_SHIFT },
};

function clampTrait(value) {
  return Math.max(0, Math.min(1, value));
}

function shiftTraits(state, event) {
  const effects = TRAIT_EFFECTS[event.type];
  if (!effects) return state;

  for (const [trait, delta] of Object.entries(effects)) {
    if (delta !== 0) {
      state.personality[trait] = clampTrait(state.personality[trait] + delta);
    }
  }
  return state;
}
```

Update `module.exports`:
```js
module.exports = { calcMood, shiftTraits };
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 9: Write failing tests for updatePreferences**

Add to `test/personality.test.js`:
```js
const { calcMood, shiftTraits, updatePreferences } = require('../core/personality.js');

describe('updatePreferences', () => {
  it('sets favoriteLanguage to most-used extension', () => {
    const state = createState('Pixel', 'cat');
    updatePreferences(state, { fileExtension: '.js' });
    updatePreferences(state, { fileExtension: '.js' });
    updatePreferences(state, { fileExtension: '.py' });
    assert.equal(state.preferences.favoriteLanguage, 'javascript');
  });

  it('sets favoriteTime based on session hour', () => {
    const state = createState('Pixel', 'cat');
    updatePreferences(state, { sessionHour: 9 });
    assert.equal(state.preferences.favoriteTime, 'morning');
  });

  it('maps afternoon hours correctly', () => {
    const state = createState('Pixel', 'cat');
    updatePreferences(state, { sessionHour: 14 });
    assert.equal(state.preferences.favoriteTime, 'afternoon');
  });

  it('maps evening hours correctly', () => {
    const state = createState('Pixel', 'cat');
    updatePreferences(state, { sessionHour: 20 });
    assert.equal(state.preferences.favoriteTime, 'evening');
  });

  it('maps night hours correctly', () => {
    const state = createState('Pixel', 'cat');
    updatePreferences(state, { sessionHour: 2 });
    assert.equal(state.preferences.favoriteTime, 'night');
  });
});
```

- [ ] **Step 10: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `updatePreferences` not exported

- [ ] **Step 11: Implement updatePreferences**

Add to `core/personality.js`:
```js
const EXT_TO_LANGUAGE = {
  '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c', '.h': 'c',
  '.cpp': 'cpp', '.hpp': 'cpp',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell',
};

function timeOfDay(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function updatePreferences(state, event) {
  if (!state._langCounts) state._langCounts = {};

  if (event.fileExtension) {
    const lang = EXT_TO_LANGUAGE[event.fileExtension] || event.fileExtension;
    state._langCounts[lang] = (state._langCounts[lang] || 0) + 1;

    let maxLang = null;
    let maxCount = 0;
    for (const [lang, count] of Object.entries(state._langCounts)) {
      if (count > maxCount) { maxLang = lang; maxCount = count; }
    }
    state.preferences.favoriteLanguage = maxLang;
  }

  if (event.sessionHour !== undefined) {
    state.preferences.favoriteTime = timeOfDay(event.sessionHour);
  }

  return state;
}
```

Update `module.exports`:
```js
module.exports = { calcMood, shiftTraits, updatePreferences };
```

- [ ] **Step 12: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add core/personality.js test/personality.test.js
git commit -m "feat: personality module with mood, traits, and preferences"
```

---

### Task 5: Flavor Text Module

**Files:**
- Create: `core/flavor.js`
- Create: `test/flavor.test.js`

- [ ] **Step 1: Write failing tests for flavor text selection**

`test/flavor.test.js`:
```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getFlavor } = require('../core/flavor.js');
const { createState } = require('../core/state.js');

describe('getFlavor', () => {
  it('returns a string for happy mood', () => {
    const state = createState('Pixel', 'cat');
    state.personality.curiosity = 0.8;
    const text = getFlavor(state, 'happy');
    assert.equal(typeof text, 'string');
    assert.ok(text.length > 0);
  });

  it('returns a string for hungry mood', () => {
    const state = createState('Pixel', 'cat');
    const text = getFlavor(state, 'hungry');
    assert.equal(typeof text, 'string');
    assert.ok(text.length > 0);
  });

  it('returns event-specific flavor for test_pass', () => {
    const state = createState('Pixel', 'cat');
    const text = getFlavor(state, 'happy', 'test_pass');
    assert.equal(typeof text, 'string');
    assert.ok(text.length > 0);
  });

  it('returns event-specific flavor for commit', () => {
    const state = createState('Pixel', 'cat');
    const text = getFlavor(state, 'happy', 'commit');
    assert.equal(typeof text, 'string');
    assert.ok(text.length > 0);
  });

  it('includes familiar name via template', () => {
    const state = createState('Pixel', 'cat');
    // Run multiple times to check at least one includes the name
    const texts = Array.from({ length: 20 }, () => getFlavor(state, 'happy'));
    const hasName = texts.some(t => t.includes('Pixel'));
    assert.ok(hasName, 'Expected at least one flavor text to include the familiar name');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — module not found

- [ ] **Step 3: Implement getFlavor**

`core/flavor.js`:
```js
const FLAVOR_POOLS = {
  happy: {
    default: [
      '{name} purrs contentedly.',
      '{name} bounces happily!',
      '{name} looks at you with bright eyes.',
      'All is well in {name}\'s world.',
      '{name} chirps cheerfully.',
    ],
    test_pass: [
      '{name} does a little victory dance!',
      'Tests green! {name} beams with pride.',
      '{name} high-fives you (metaphorically).',
      '{name} is impressed by your test coverage!',
    ],
    commit: [
      '{name} nods approvingly at the clean commit.',
      'Another commit! {name} loves progress.',
      '{name} watches the commit with satisfaction.',
    ],
  },
  neutral: {
    default: [
      '{name} watches quietly.',
      '{name} tilts their head curiously.',
      '{name} is here, keeping you company.',
      '{name} observes your work.',
    ],
  },
  hungry: {
    default: [
      '{name} looks at you with pleading eyes...',
      '{name}\'s tummy rumbles.',
      '{name} nudges you gently. Snack time?',
      '{name} eyes your keyboard hungrily.',
      'Feed me! ...is what {name}\'s eyes seem to say.',
    ],
  },
  tired: {
    default: [
      '{name} yawns widely.',
      '{name} is struggling to keep their eyes open.',
      '{name} curls up and dozes off...',
      'Maybe {name} needs a rest?',
    ],
  },
};

function getFlavor(state, mood, event = 'default') {
  const moodPool = FLAVOR_POOLS[mood] || FLAVOR_POOLS.neutral;
  const pool = moodPool[event] || moodPool.default;
  const template = pool[Math.floor(Math.random() * pool.length)];
  return template.replace(/\{name\}/g, state.name);
}

module.exports = { getFlavor };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add core/flavor.js test/flavor.test.js
git commit -m "feat: flavor text module with mood and event pools"
```

---

### Task 6: ASCII Art Renderer

**Files:**
- Create: `core/renderer.js`
- Create: `test/renderer.test.js`
- Create: `art/cat/egg/neutral.txt`
- Create: `art/cat/baby/happy.txt`, `neutral.txt`, `hungry.txt`, `tired.txt`
- Create: `art/cat/juvenile/happy.txt`, `neutral.txt`, `hungry.txt`, `tired.txt`
- Create: `art/cat/adult/happy.txt`, `neutral.txt`, `hungry.txt`, `tired.txt`
- Create: `art/cat/elder/happy.txt`, `neutral.txt`, `hungry.txt`, `tired.txt`

- [ ] **Step 1: Create all cat art template files**

`art/cat/egg/neutral.txt`:
```
 ___
(o.o)
 (_)
```

`art/cat/baby/happy.txt`:
```
 /\  /\
( ^.^ )
  \_/
```

`art/cat/baby/neutral.txt`:
```
 /\  /\
( o.o )
  \_/
```

`art/cat/baby/hungry.txt`:
```
 /\  /\
( T.T )
  \_/
```

`art/cat/baby/tired.txt`:
```
 /\  /\
( -.- )z
  \_/
```

`art/cat/juvenile/happy.txt`:
```
 /\_/\
( ^.^ )
 > ^ <
```

`art/cat/juvenile/neutral.txt`:
```
 /\_/\
( o.o )
 > ^ <
```

`art/cat/juvenile/hungry.txt`:
```
 /\_/\
( T.T )
 > ^ <
```

`art/cat/juvenile/tired.txt`:
```
 /\_/\
( -.- )z
 > ^ < z
```

`art/cat/adult/happy.txt`:
```
  /\_/\
 ( ^.^ )
 /|   |\
(_|   |_)
```

`art/cat/adult/neutral.txt`:
```
  /\_/\
 ( o.o )
 /|   |\
(_|   |_)
```

`art/cat/adult/hungry.txt`:
```
  /\_/\
 ( T.T )
 /|   |\
(_|   |_)
```

`art/cat/adult/tired.txt`:
```
  /\_/\
 ( -.- ) z
 /|   |\  z
(_|   |_)
```

`art/cat/elder/happy.txt`:
```
  /\_/\
 ( ^.^ ) ~*
 /|   |\  *
(_|   |_)*
  ~wisdom~
```

`art/cat/elder/neutral.txt`:
```
  /\_/\
 ( o.o ) ~*
 /|   |\  *
(_|   |_)*
  ~wisdom~
```

`art/cat/elder/hungry.txt`:
```
  /\_/\
 ( T.T ) ~*
 /|   |\  *
(_|   |_)*
  ~wisdom~
```

`art/cat/elder/tired.txt`:
```
  /\_/\
 ( -.- ) z*
 /|   |\  z
(_|   |_)*
  ~wisdom~
```

- [ ] **Step 2: Write failing tests for renderer**

`test/renderer.test.js`:
```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadArt, renderStatBar, renderStatusLine } = require('../core/renderer.js');
const { createState } = require('../core/state.js');

const ART_DIR = path.join(__dirname, '..', 'art');

describe('loadArt', () => {
  it('loads art for cat/egg/neutral', () => {
    const art = loadArt('cat', 'egg', 'neutral', ART_DIR);
    assert.ok(art.includes('(o.o)'));
  });

  it('loads art for cat/adult/happy', () => {
    const art = loadArt('cat', 'adult', 'happy', ART_DIR);
    assert.ok(art.includes('( ^.^ )'));
  });

  it('falls back to neutral when mood file missing', () => {
    const art = loadArt('cat', 'egg', 'happy', ART_DIR);
    assert.ok(art.includes('(o.o)'));
  });

  it('falls back to egg/neutral for unknown species', () => {
    const art = loadArt('unicorn', 'adult', 'happy', ART_DIR);
    assert.equal(typeof art, 'string');
    assert.ok(art.length > 0);
  });
});

describe('renderStatBar', () => {
  it('renders a full bar at 100', () => {
    const bar = renderStatBar(100, 10);
    assert.equal(bar.replace(/\x1b\[[0-9;]*m/g, '').length, 10);
  });

  it('renders an empty bar at 0', () => {
    const bar = renderStatBar(0, 10);
    assert.equal(typeof bar, 'string');
  });

  it('renders half bar at 50', () => {
    const bar = renderStatBar(50, 10);
    assert.equal(typeof bar, 'string');
  });
});

describe('renderStatusLine', () => {
  it('returns multiline string with art and stats', () => {
    const state = createState('Pixel', 'cat');
    state.stats = { hunger: 30, energy: 80, happiness: 70 };
    const output = renderStatusLine(state, 'happy', 'Pixel purrs contentedly.', ART_DIR);
    assert.ok(output.includes('Pixel'));
    assert.equal(typeof output, 'string');
    assert.ok(output.split('\n').length >= 3);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — module not found

- [ ] **Step 4: Implement renderer**

`core/renderer.js`:
```js
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_ART_DIR = path.join(__dirname, '..', 'art');

function loadArt(species, stage, mood, artDir = DEFAULT_ART_DIR) {
  const candidates = [
    path.join(artDir, species, stage, `${mood}.txt`),
    path.join(artDir, species, stage, 'neutral.txt'),
    path.join(artDir, species, 'egg', 'neutral.txt'),
    path.join(artDir, 'cat', 'egg', 'neutral.txt'),
  ];

  for (const candidate of candidates) {
    try {
      return fs.readFileSync(candidate, 'utf-8').trimEnd();
    } catch {
      continue;
    }
  }
  return '(o.o)';
}

function renderStatBar(value, width = 10) {
  const filled = Math.round((value / 100) * width);
  const empty = width - filled;
  const green = '\x1b[32m';
  const dim = '\x1b[2m';
  const reset = '\x1b[0m';
  return green + '\u2588'.repeat(filled) + reset + dim + '\u2591'.repeat(empty) + reset;
}

function renderStatusLine(state, mood, flavorText, artDir = DEFAULT_ART_DIR) {
  const art = loadArt(state.species, state.stage, mood, artDir);
  const artLines = art.split('\n');

  const infoLines = [
    `${state.name} (${state.species}) Lv.${state.level}`,
    `hunger: ${renderStatBar(100 - state.stats.hunger)} energy: ${renderStatBar(state.stats.energy)} happy: ${renderStatBar(state.stats.happiness)}`,
    flavorText ? `"${flavorText}"` : '',
  ];

  const maxArtWidth = Math.max(...artLines.map(l => l.length));
  const padded = artLines.map(l => l.padEnd(maxArtWidth));

  const lines = [];
  const maxLines = Math.max(padded.length, infoLines.length);
  for (let i = 0; i < maxLines; i++) {
    const artPart = padded[i] || ' '.repeat(maxArtWidth);
    const infoPart = infoLines[i] || '';
    lines.push(`${artPart}   ${infoPart}`);
  }

  return lines.join('\n');
}

module.exports = { loadArt, renderStatBar, renderStatusLine };
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add core/renderer.js test/renderer.test.js art/
git commit -m "feat: ASCII art renderer with cat templates and status line layout"
```

---

### Task 7: CLI Dispatcher

**Files:**
- Create: `core/cli.js`
- Create: `test/cli.test.js`

- [ ] **Step 1: Write failing tests for CLI commands**

`test/cli.test.js`:
```js
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const CLI_PATH = path.join(__dirname, '..', 'core', 'cli.js');
const TMP_DIR = path.join(os.tmpdir(), `familiar-cli-test-${Date.now()}`);
const STATE_PATH = path.join(TMP_DIR, 'state.json');
const ART_DIR = path.join(__dirname, '..', 'art');

function run(...args) {
  return execFileSync('node', [CLI_PATH, ...args], {
    encoding: 'utf-8',
    env: { ...process.env, FAMILIAR_STATE_PATH: STATE_PATH, FAMILIAR_ART_DIR: ART_DIR },
  }).trim();
}

describe('cli', () => {
  beforeEach(() => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it('setup creates a new familiar', () => {
    const output = run('setup', '--name', 'Pixel', '--species', 'cat');
    assert.ok(output.includes('Pixel'));
    assert.ok(fs.existsSync(STATE_PATH));
  });

  it('status shows familiar info', () => {
    run('setup', '--name', 'Pixel', '--species', 'cat');
    const output = run('status');
    assert.ok(output.includes('Pixel'));
    assert.ok(output.includes('Lv.'));
  });

  it('feed reduces hunger', () => {
    run('setup', '--name', 'Pixel', '--species', 'cat');
    // Manually set hunger high
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    state.stats.hunger = 50;
    fs.writeFileSync(STATE_PATH, JSON.stringify(state));

    const output = run('feed');
    assert.ok(output.length > 0);

    const after = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    assert.equal(after.stats.hunger, 20);
  });

  it('pet increases happiness', () => {
    run('setup', '--name', 'Pixel', '--species', 'cat');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    state.stats.happiness = 50;
    fs.writeFileSync(STATE_PATH, JSON.stringify(state));

    const output = run('pet');
    assert.ok(output.length > 0);

    const after = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    assert.equal(after.stats.happiness, 70);
  });

  it('rest sets resting state', () => {
    run('setup', '--name', 'Pixel', '--species', 'cat');
    const output = run('rest');
    assert.ok(output.length > 0);

    const after = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    assert.ok(after._resting);
  });

  it('name renames the familiar', () => {
    run('setup', '--name', 'Pixel', '--species', 'cat');
    run('name', '--name', 'Sparky');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    assert.equal(state.name, 'Sparky');
  });

  it('settings updates integration level', () => {
    run('setup', '--name', 'Pixel', '--species', 'cat');
    run('settings', '--integration', 'active');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    assert.equal(state.settings.integration, 'active');
  });

  it('xp awards XP and updates level', () => {
    run('setup', '--name', 'Pixel', '--species', 'cat');
    run('xp', '--amount', '50');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    assert.equal(state.xp, 50);
    assert.ok(state.level > 0);
  });

  it('decay applies time-based stat changes', () => {
    run('setup', '--name', 'Pixel', '--species', 'cat');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    state.history.lastSession = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    fs.writeFileSync(STATE_PATH, JSON.stringify(state));

    run('decay');
    const after = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    assert.ok(after.stats.hunger > 0);
  });

  it('render outputs status line', () => {
    run('setup', '--name', 'Pixel', '--species', 'cat');
    const output = run('render');
    assert.ok(output.includes('Pixel'));
    assert.ok(output.includes('Lv.'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cli.js not found

- [ ] **Step 3: Implement CLI dispatcher**

`core/cli.js`:
```js
#!/usr/bin/env node

const path = require('node:path');
const os = require('node:os');
const { createState, readState, writeState, decayStats, clamp } = require('./state.js');
const { calcMood, shiftTraits, updatePreferences } = require('./personality.js');
const { awardXP } = require('./evolution.js');
const { renderStatusLine } = require('./renderer.js');
const { getFlavor } = require('./flavor.js');

const STATE_PATH = process.env.FAMILIAR_STATE_PATH
  || path.join(os.homedir(), '.claude', 'familiar', 'state.json');
const ART_DIR = process.env.FAMILIAR_ART_DIR
  || path.join(__dirname, '..', 'art');

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      parsed[key] = args[i + 1] || true;
      i++;
    }
  }
  return parsed;
}

function requireState() {
  const state = readState(STATE_PATH);
  if (!state) {
    console.log('No familiar found. Run: /familiar setup');
    process.exit(1);
  }
  return state;
}

const commands = {
  setup(args) {
    const opts = parseArgs(args);
    const name = opts.name || 'Familiar';
    const species = opts.species || 'cat';
    const state = createState(name, species);
    if (opts.integration) {
      state.settings.integration = opts.integration;
    }
    writeState(state, STATE_PATH);
    const mood = calcMood(state);
    const flavor = getFlavor(state, mood);
    console.log(renderStatusLine(state, mood, flavor, ART_DIR));
    console.log(`\nWelcome, ${name} the ${species}!`);
  },

  status(args) {
    const state = requireState();
    const mood = calcMood(state);
    const flavor = getFlavor(state, mood);
    console.log(renderStatusLine(state, mood, flavor, ART_DIR));
  },

  feed(args) {
    const state = requireState();
    const now = Date.now();
    const lastFed = state.history.lastFed ? new Date(state.history.lastFed).getTime() : 0;
    const hoursSinceFed = (now - lastFed) / (1000 * 60 * 60);

    if (hoursSinceFed < 1) {
      console.log(`${state.name} isn't hungry yet. Try again later!`);
      return;
    }

    state.stats.hunger = clamp(state.stats.hunger - 30, 0, 100);
    state.stats.happiness = clamp(state.stats.happiness + 5, 0, 100);
    state.history.lastFed = new Date().toISOString();
    const { state: updated } = awardXP(state, 2);
    writeState(updated, STATE_PATH);

    const mood = calcMood(updated);
    const flavor = getFlavor(updated, mood);
    console.log(renderStatusLine(updated, mood, flavor, ART_DIR));
    console.log(`\n${updated.name} munches happily!`);
  },

  pet(args) {
    const state = requireState();
    const now = Date.now();
    const lastPet = state.history.lastPet ? new Date(state.history.lastPet).getTime() : 0;
    const minutesSincePet = (now - lastPet) / (1000 * 60);

    if (minutesSincePet < 30) {
      console.log(`${state.name} appreciates the thought but needs some space.`);
      return;
    }

    state.stats.happiness = clamp(state.stats.happiness + 20, 0, 100);
    state.stats.energy = clamp(state.stats.energy + 5, 0, 100);
    state.history.lastPet = new Date().toISOString();
    const { state: updated } = awardXP(state, 2);
    writeState(updated, STATE_PATH);

    const mood = calcMood(updated);
    const flavor = getFlavor(updated, mood);
    console.log(renderStatusLine(updated, mood, flavor, ART_DIR));
    console.log(`\n${updated.name} nuzzles against you!`);
  },

  rest(args) {
    const state = requireState();
    state._resting = true;
    state.stats.energy = clamp(state.stats.energy + 30, 0, 100);
    writeState(state, STATE_PATH);

    const flavor = getFlavor(state, 'tired');
    console.log(renderStatusLine(state, 'tired', flavor, ART_DIR));
    console.log(`\n${state.name} curls up for a nap...`);
  },

  name(args) {
    const state = requireState();
    const opts = parseArgs(args);
    if (!opts.name) {
      console.log(`Current name: ${state.name}`);
      return;
    }
    const oldName = state.name;
    state.name = opts.name;
    writeState(state, STATE_PATH);
    console.log(`${oldName} is now known as ${state.name}!`);
  },

  settings(args) {
    const state = requireState();
    const opts = parseArgs(args);
    if (opts.integration) {
      if (!['passive', 'nudge', 'active'].includes(opts.integration)) {
        console.log('Integration must be one of: passive, nudge, active');
        return;
      }
      state.settings.integration = opts.integration;
      writeState(state, STATE_PATH);
      console.log(`Integration mode set to: ${opts.integration}`);
    } else {
      console.log(`Current settings:`);
      console.log(`  integration: ${state.settings.integration}`);
    }
  },

  xp(args) {
    const opts = parseArgs(args);
    const amount = parseInt(opts.amount, 10) || 1;
    const state = requireState();
    const { state: updated, evolved } = awardXP(state, amount);
    writeState(updated, STATE_PATH);

    if (evolved) {
      console.log(`*** ${updated.name} evolved to ${updated.stage}! ***`);
    }
  },

  decay(args) {
    const state = requireState();
    const decayed = decayStats(state);
    decayed.history.lastSession = new Date().toISOString();
    writeState(decayed, STATE_PATH);
  },

  render(args) {
    const state = requireState();
    if (state._resting) {
      state._resting = false;
      state.stats.energy = clamp(state.stats.energy + 10, 0, 100);
      writeState(state, STATE_PATH);
    }
    const mood = calcMood(state);
    const flavor = getFlavor(state, mood);
    console.log(renderStatusLine(state, mood, flavor, ART_DIR));
  },

  nudge(args) {
    const state = requireState();
    if (state.settings.integration === 'passive') return;

    state.history.totalPrompts = (state.history.totalPrompts || 0) + 1;

    // Only nudge ~1 in 10 prompts
    const shouldNudge = Math.random() < 0.1;
    const needsAttention = state.stats.hunger > 60 || state.stats.energy < 30 || state.stats.happiness < 30;

    if (shouldNudge && needsAttention) {
      const mood = calcMood(state);
      const flavor = getFlavor(state, mood);
      console.log(`[${state.name}] ${flavor}`);
    }

    writeState(state, STATE_PATH);
  },
};

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command || !commands[command]) {
  if (command && command !== 'help') {
    console.log(`Unknown command: ${command}`);
  }
  console.log('Usage: familiar <command>');
  console.log('Commands: setup, status, feed, pet, rest, name, settings, xp, decay, render, nudge');
  process.exit(command ? 1 : 0);
}

commands[command](args);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add core/cli.js test/cli.test.js
git commit -m "feat: CLI dispatcher with all commands"
```

---

### Task 8: Hook Shell Scripts

**Files:**
- Create: `hooks/session-start.sh`
- Create: `hooks/stop.sh`
- Create: `hooks/post-tool-use.sh`
- Create: `hooks/user-prompt-submit.sh`

- [ ] **Step 1: Create session-start hook**

`hooks/session-start.sh`:
```bash
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
```

- [ ] **Step 2: Create stop hook**

`hooks/stop.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI="$SCRIPT_DIR/../core/cli.js"

# Read stdin (hook context)
cat > /dev/null

# Award XP for completed response
node "$CLI" xp --amount 1 2>/dev/null || true
```

- [ ] **Step 3: Create post-tool-use hook**

`hooks/post-tool-use.sh`:
```bash
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
    # Check if it was a test command by looking at tool input
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
    # Award 1 XP for tool use (already covered by stop hook, skip to avoid double-counting)
    ;;
esac
```

- [ ] **Step 4: Create user-prompt-submit hook**

`hooks/user-prompt-submit.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI="$SCRIPT_DIR/../core/cli.js"

# Read stdin (hook context)
cat > /dev/null

# Count prompt and maybe nudge
node "$CLI" nudge 2>/dev/null || true
```

- [ ] **Step 5: Make all hooks executable**

Run: `chmod +x hooks/*.sh`

- [ ] **Step 6: Commit**

```bash
git add hooks/
git commit -m "feat: hook shell scripts for session, stop, tool use, and prompt events"
```

---

### Task 9: Status Line Script

**Files:**
- Create: `statusline.sh`

- [ ] **Step 1: Create status line renderer script**

`statusline.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI="$SCRIPT_DIR/core/cli.js"

# Status line receives JSON session data on stdin — consume it
cat > /dev/null

# Render the familiar (outputs the ASCII status line)
node "$CLI" render 2>/dev/null || echo "(familiar sleeping...)"
```

- [ ] **Step 2: Make executable**

Run: `chmod +x statusline.sh`

- [ ] **Step 3: Commit**

```bash
git add statusline.sh
git commit -m "feat: status line script for ASCII familiar display"
```

---

### Task 10: Skill Definition (Slash Command)

**Files:**
- Create: `skills/familiar/SKILL.md`

- [ ] **Step 1: Create the skill file**

`skills/familiar/SKILL.md`:
````markdown
---
name: familiar
description: Interact with your tamagotchi-like familiar companion
user-invocable: true
---

# Familiar

Your digital familiar companion. Use subcommands to interact.

## Current Status

!`node "FAMILIAR_INSTALL_DIR/core/cli.js" status 2>/dev/null || echo "No familiar found. Run /familiar setup to create one."`

## Commands

Based on the user's input in $ARGUMENTS, run the appropriate command:

- **No arguments or "status"**: Show the familiar's current state. Run: `node "FAMILIAR_INSTALL_DIR/core/cli.js" status`
- **"feed"**: Feed the familiar. Run: `node "FAMILIAR_INSTALL_DIR/core/cli.js" feed`
- **"pet"**: Pet the familiar. Run: `node "FAMILIAR_INSTALL_DIR/core/cli.js" pet`
- **"rest"**: Let the familiar rest. Run: `node "FAMILIAR_INSTALL_DIR/core/cli.js" rest`
- **"name NAME"**: Rename the familiar. Run: `node "FAMILIAR_INSTALL_DIR/core/cli.js" name --name NAME`
- **"settings LEVEL"**: Set integration level (passive/nudge/active). Run: `node "FAMILIAR_INSTALL_DIR/core/cli.js" settings --integration LEVEL`
- **"setup"**: Create or reset your familiar. Ask the user for a name and species (cat, owl, dragon, fox), then run: `node "FAMILIAR_INSTALL_DIR/core/cli.js" setup --name NAME --species SPECIES`

Display the output to the user. If the command includes ASCII art, display it in a code block.
````

Note: `FAMILIAR_INSTALL_DIR` is a placeholder that `setup.sh` replaces with the actual install path during installation.

- [ ] **Step 2: Commit**

```bash
git add skills/
git commit -m "feat: /familiar slash command skill definition"
```

---

### Task 11: Active Mode CLAUDE.md Template

**Files:**
- Create: `templates/claude-md-active.md`

- [ ] **Step 1: Create the CLAUDE.md template for active integration**

`templates/claude-md-active.md`:
```markdown
# Your Familiar

You have a digital familiar companion. Their current state:

@~/.claude/familiar/state.json

## Personality

- Reference the familiar by name occasionally (not every response)
- React naturally to their mood: if hungry, suggest feeding; if tired, suggest rest
- Celebrate milestones like level ups and stage evolutions
- Let the familiar's personality traits color your reactions:
  - High curiosity: mention interesting things about the code
  - High playfulness: lighter tone, occasional wordplay
  - High stubbornness: encouraging persistence
- Keep it subtle — the familiar adds flavor, it shouldn't dominate responses
```

- [ ] **Step 2: Commit**

```bash
git add templates/
git commit -m "feat: CLAUDE.md template for active integration mode"
```

---

### Task 12: Setup / Install Script

**Files:**
- Create: `setup.sh`

- [ ] **Step 1: Write the setup script**

`setup.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

echo "=== Familiar Setup ==="
echo "Install directory: $INSTALL_DIR"
echo ""

# Ensure .claude directory exists
mkdir -p "$CLAUDE_DIR"

# Initialize settings.json if it doesn't exist
if [ ! -f "$SETTINGS_FILE" ]; then
  echo '{}' > "$SETTINGS_FILE"
fi

# Update SKILL.md with actual install path
SKILL_DIR="$INSTALL_DIR/skills/familiar"
sed -i.bak "s|FAMILIAR_INSTALL_DIR|$INSTALL_DIR|g" "$SKILL_DIR/SKILL.md" && rm -f "$SKILL_DIR/SKILL.md.bak"

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

const hookConfigs = {
  SessionStart: { command: path.join(installDir, 'hooks', 'session-start.sh') },
  Stop: { command: path.join(installDir, 'hooks', 'stop.sh') },
  PostToolUse: { command: path.join(installDir, 'hooks', 'post-tool-use.sh') },
  UserPromptSubmit: { command: path.join(installDir, 'hooks', 'user-prompt-submit.sh') },
};

for (const [event, config] of Object.entries(hookConfigs)) {
  if (!settings.hooks[event]) settings.hooks[event] = [];
  const existing = settings.hooks[event].find(h => h.command && h.command.includes('familiar'));
  if (!existing) {
    settings.hooks[event].push({
      type: 'command',
      command: config.command,
    });
  }
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
SKILL_DEST="$CLAUDE_DIR/skills/familiar"
mkdir -p "$SKILL_DEST"
cp "$INSTALL_DIR/skills/familiar/SKILL.md" "$SKILL_DEST/SKILL.md"
echo "Skill installed to $SKILL_DEST"

echo ""
echo "=== Setup Complete ==="
echo "Start a new Claude Code session and run: /familiar setup"
echo "This will let you choose a name and species for your familiar."
```

- [ ] **Step 2: Make executable**

Run: `chmod +x setup.sh`

- [ ] **Step 3: Test the setup script manually**

Run: `bash -n setup.sh` (syntax check only)
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add setup.sh
git commit -m "feat: setup script to install hooks, skills, and status line"
```

---

### Task 13: Additional Species Art (Owl, Dragon, Fox)

**Files:**
- Create: `art/owl/` (all stages and moods)
- Create: `art/dragon/` (all stages and moods)
- Create: `art/fox/` (all stages and moods)

- [ ] **Step 1: Create owl art templates**

`art/owl/egg/neutral.txt`:
```
 {o}
(o.o)
 \_/
```

`art/owl/baby/happy.txt`:
```
 {^}
(^o^)
 /_\
```

`art/owl/baby/neutral.txt`:
```
 {o}
(o.o)
 /_\
```

`art/owl/baby/hungry.txt`:
```
 {o}
(;o;)
 /_\
```

`art/owl/baby/tired.txt`:
```
 {-}
(-o-) z
 /_\
```

`art/owl/juvenile/happy.txt`:
```
  {\}/
 (^o^)
 /| |\
  " "
```

`art/owl/juvenile/neutral.txt`:
```
  {\}/
 (o.o)
 /| |\
  " "
```

`art/owl/juvenile/hungry.txt`:
```
  {\}/
 (;o;)
 /| |\
  " "
```

`art/owl/juvenile/tired.txt`:
```
  {\}/
 (-o-) z
 /| |\  z
  " "
```

`art/owl/adult/happy.txt`:
```
  ,___,
 (^o o^)
 /|) (|\
  `` ``
```

`art/owl/adult/neutral.txt`:
```
  ,___,
 (o   o)
 /|) (|\
  `` ``
```

`art/owl/adult/hungry.txt`:
```
  ,___,
 (;   ;)
 /|) (|\
  `` ``
```

`art/owl/adult/tired.txt`:
```
  ,___,
 (-   -) z
 /|) (|\  z
  `` ``
```

`art/owl/elder/happy.txt`:
```
  ,___,
 (^o o^) ~*
 /|) (|\  *
  `` ``  *
 ~scholar~
```

`art/owl/elder/neutral.txt`:
```
  ,___,
 (o   o) ~*
 /|) (|\  *
  `` ``  *
 ~scholar~
```

`art/owl/elder/hungry.txt`:
```
  ,___,
 (;   ;) ~*
 /|) (|\  *
  `` ``  *
 ~scholar~
```

`art/owl/elder/tired.txt`:
```
  ,___,
 (-   -) z*
 /|) (|\  z
  `` ``  *
 ~scholar~
```

- [ ] **Step 2: Create dragon art templates**

`art/dragon/egg/neutral.txt`:
```
 /~\
{o.o}
 \_/
```

`art/dragon/baby/happy.txt`:
```
 /\  /\
(^,,^)>
 ~\/~
```

`art/dragon/baby/neutral.txt`:
```
 /\  /\
(o,,o)>
 ~\/~
```

`art/dragon/baby/hungry.txt`:
```
 /\  /\
(T,,T)>
 ~\/~
```

`art/dragon/baby/tired.txt`:
```
 /\  /\
(-,,-)>z
 ~\/~
```

`art/dragon/juvenile/happy.txt`:
```
  /\  /\
 (^,,^)>~
 /|  |\
  \/\/
```

`art/dragon/juvenile/neutral.txt`:
```
  /\  /\
 (o,,o)>~
 /|  |\
  \/\/
```

`art/dragon/juvenile/hungry.txt`:
```
  /\  /\
 (T,,T)>~
 /|  |\
  \/\/
```

`art/dragon/juvenile/tired.txt`:
```
  /\  /\
 (-,,-)>z
 /|  |\  z
  \/\/
```

`art/dragon/adult/happy.txt`:
```
   /\  /\
  (^,,^)>>~
  /|  |\
_/ |  | \_
   \/\/
```

`art/dragon/adult/neutral.txt`:
```
   /\  /\
  (o,,o)>>~
  /|  |\
_/ |  | \_
   \/\/
```

`art/dragon/adult/hungry.txt`:
```
   /\  /\
  (T,,T)>>~
  /|  |\
_/ |  | \_
   \/\/
```

`art/dragon/adult/tired.txt`:
```
   /\  /\
  (-,,-)>> z
  /|  |\    z
_/ |  | \_
   \/\/
```

`art/dragon/elder/happy.txt`:
```
   /\  /\
  (^,,^)>>>~*
  /|  |\    *
_/ |  | \_ *
   \/\/
  ~ancient~
```

`art/dragon/elder/neutral.txt`:
```
   /\  /\
  (o,,o)>>>~*
  /|  |\    *
_/ |  | \_ *
   \/\/
  ~ancient~
```

`art/dragon/elder/hungry.txt`:
```
   /\  /\
  (T,,T)>>>~*
  /|  |\    *
_/ |  | \_ *
   \/\/
  ~ancient~
```

`art/dragon/elder/tired.txt`:
```
   /\  /\
  (-,,-)>>> z*
  /|  |\     z
_/ |  | \_ *
   \/\/
  ~ancient~
```

- [ ] **Step 3: Create fox art templates**

`art/fox/egg/neutral.txt`:
```
 /V\
(o.o)
 \_/
```

`art/fox/baby/happy.txt`:
```
 /\ /\
(^.^)
 w w
```

`art/fox/baby/neutral.txt`:
```
 /\ /\
(o.o)
 w w
```

`art/fox/baby/hungry.txt`:
```
 /\ /\
(T.T)
 w w
```

`art/fox/baby/tired.txt`:
```
 /\ /\
(-.-)z
 w w
```

`art/fox/juvenile/happy.txt`:
```
  /\_/\
 ( ^.^ )
  / > >
  \w w/
```

`art/fox/juvenile/neutral.txt`:
```
  /\_/\
 ( o.o )
  / > >
  \w w/
```

`art/fox/juvenile/hungry.txt`:
```
  /\_/\
 ( T.T )
  / > >
  \w w/
```

`art/fox/juvenile/tired.txt`:
```
  /\_/\
 ( -.- )z
  / > > z
  \w w/
```

`art/fox/adult/happy.txt`:
```
   /\_/\
  ( ^.^ )
  /|   |\_
 / |   |  \~
   \w w/
```

`art/fox/adult/neutral.txt`:
```
   /\_/\
  ( o.o )
  /|   |\_
 / |   |  \~
   \w w/
```

`art/fox/adult/hungry.txt`:
```
   /\_/\
  ( T.T )
  /|   |\_
 / |   |  \~
   \w w/
```

`art/fox/adult/tired.txt`:
```
   /\_/\
  ( -.- ) z
  /|   |\_  z
 / |   |  \~
   \w w/
```

`art/fox/elder/happy.txt`:
```
   /\_/\
  ( ^.^ ) ~*
  /|   |\_  *
 / |   |  \~*
   \w w/
  ~trickster~
```

`art/fox/elder/neutral.txt`:
```
   /\_/\
  ( o.o ) ~*
  /|   |\_  *
 / |   |  \~*
   \w w/
  ~trickster~
```

`art/fox/elder/hungry.txt`:
```
   /\_/\
  ( T.T ) ~*
  /|   |\_  *
 / |   |  \~*
   \w w/
  ~trickster~
```

`art/fox/elder/tired.txt`:
```
   /\_/\
  ( -.- ) z*
  /|   |\_  z
 / |   |  \~*
   \w w/
  ~trickster~
```

- [ ] **Step 4: Commit**

```bash
git add art/
git commit -m "feat: add owl, dragon, and fox ASCII art templates"
```

---

### Task 14: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

`README.md`:
```markdown
# Familiar

A tamagotchi-like companion that lives in your Claude Code workflow. Your familiar appears as ASCII art in the status line, reacts to your coding activity, and evolves a unique personality over time.

## Quick Start

1. Clone this repo
2. Run `./setup.sh`
3. Start a new Claude Code session
4. Run `/familiar setup` to create your familiar

## Species

Choose from: **cat**, **owl**, **dragon**, **fox**

Each species has unique ASCII art across five growth stages (egg, baby, juvenile, adult, elder).

## Commands

| Command | Description |
|---------|-------------|
| `/familiar` | Check on your familiar |
| `/familiar feed` | Feed your familiar (reduces hunger) |
| `/familiar pet` | Pet your familiar (boosts happiness) |
| `/familiar rest` | Let your familiar sleep (restores energy) |
| `/familiar name Sparky` | Rename your familiar |
| `/familiar settings nudge` | Set integration level (passive/nudge/active) |
| `/familiar setup` | Create or reset your familiar |

## How It Works

Your familiar has three core stats that decay over real time:
- **Hunger** — increases ~5/hr, feed to reduce
- **Energy** — decreases ~3/hr, rest to restore
- **Happiness** — decreases ~2/hr, pet to boost

It also develops personality traits based on your coding patterns:
- **Curiosity** — grows when you explore and search codebases
- **Playfulness** — grows with varied, short coding sessions
- **Stubbornness** — grows when you persist through errors

Your familiar earns XP from your coding activity and evolves through five stages: egg, baby, juvenile, adult, elder.

## Integration Levels

- **Passive** — status line display only
- **Nudge** (default) — occasional reminders when your familiar needs attention
- **Active** — your familiar's personality is woven into Claude's responses

## Requirements

- Claude Code (provides Node.js)
- No additional dependencies
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and usage instructions"
```

---

### Task 15: End-to-End Manual Test

No new files — this is a verification task.

- [ ] **Step 1: Run all unit tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Test CLI end-to-end with temp state**

```bash
export FAMILIAR_STATE_PATH="/tmp/familiar-e2e-test/state.json"
export FAMILIAR_ART_DIR="$(pwd)/art"
node core/cli.js setup --name TestPet --species cat
node core/cli.js status
node core/cli.js feed
node core/cli.js pet
node core/cli.js rest
node core/cli.js name --name NewName
node core/cli.js settings --integration active
node core/cli.js xp --amount 50
node core/cli.js render
rm -rf /tmp/familiar-e2e-test
unset FAMILIAR_STATE_PATH FAMILIAR_ART_DIR
```

Expected: Each command produces output without errors.

- [ ] **Step 3: Verify setup script syntax**

Run: `bash -n setup.sh`
Expected: No errors

- [ ] **Step 4: Commit any fixes if needed**

Only commit if tests revealed issues that needed fixes.
