const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const STATE_DIR = path.join(os.homedir(), '.gremlin');
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

module.exports = { clamp, createState, readState, writeState, decayStats, STATE_DIR, STATE_PATH };
