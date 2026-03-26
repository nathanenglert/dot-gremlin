#!/usr/bin/env node

const path = require('node:path');
const os = require('node:os');
const { createState, readState, writeState, decayStats, clamp } = require('./state.js');
const { calcMood, shiftTraits, updatePreferences } = require('./personality.js');
const { awardXP } = require('./evolution.js');
const { renderStatusLine } = require('./renderer.js');
const { getFlavor } = require('./flavor.js');

const STATE_PATH = process.env.GREMLIN_STATE_PATH
  || path.join(os.homedir(), '.gremlin', 'state.json');
const ART_DIR = process.env.GREMLIN_ART_DIR
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
    console.log('No gremlin found. Run: /gremlin setup');
    process.exit(1);
  }
  return state;
}

const commands = {
  setup(args) {
    const opts = parseArgs(args);
    const name = opts.name || 'Gremlin';
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
  console.log('Usage: gremlin <command>');
  console.log('Commands: setup, status, feed, pet, rest, name, settings, xp, decay, render, nudge');
  process.exit(command ? 1 : 0);
}

commands[command](args);
