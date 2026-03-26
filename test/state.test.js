const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { clamp, createState, readState, writeState, decayStats, DEFAULT_STATE } = require('../core/state.js');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

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

describe('readState / writeState', () => {
  const tmpDir = path.join(os.tmpdir(), `gremlin-test-${Date.now()}`);
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
    const result = readState('/tmp/nonexistent-gremlin/state.json');
    assert.equal(result, null);
  });
});

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
