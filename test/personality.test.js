const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calcMood, shiftTraits, updatePreferences } = require('../core/personality.js');
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
