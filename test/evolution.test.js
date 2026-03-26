const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calcLevel, calcStage, awardXP } = require('../core/evolution.js');
const { createState } = require('../core/state.js');

describe('calcLevel', () => {
  it('returns 0 for 0 XP', () => { assert.equal(calcLevel(0), 0); });
  it('returns 1 for 10 XP', () => { assert.equal(calcLevel(10), 1); });
  it('returns 2 for 40 XP', () => { assert.equal(calcLevel(40), 2); });
  it('returns 7 for 500 XP', () => { assert.equal(calcLevel(500), 7); });
  it('returns 12 for 1500 XP', () => { assert.equal(calcLevel(1500), 12); });
});

describe('calcStage', () => {
  it('returns egg for level 0', () => { assert.equal(calcStage(0), 'egg'); });
  it('returns baby for level 1', () => { assert.equal(calcStage(1), 'baby'); });
  it('returns baby for level 2', () => { assert.equal(calcStage(2), 'baby'); });
  it('returns juvenile for level 3', () => { assert.equal(calcStage(3), 'juvenile'); });
  it('returns adult for level 7', () => { assert.equal(calcStage(7), 'adult'); });
  it('returns elder for level 15', () => { assert.equal(calcStage(15), 'elder'); });
});

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
    state.xp = 45; state.level = 2; state.stage = 'baby';
    const result = awardXP(state, 3);
    assert.equal(result.state.xp, 48);
    assert.equal(result.evolved, false);
  });

  it('handles stage transition from baby to juvenile', () => {
    const state = createState('Pixel', 'cat');
    state.xp = 85; state.level = 2; state.stage = 'baby';
    const result = awardXP(state, 5);
    assert.equal(result.state.xp, 90);
    assert.equal(result.state.level, 3);
    assert.equal(result.state.stage, 'juvenile');
    assert.equal(result.evolved, true);
  });
});
