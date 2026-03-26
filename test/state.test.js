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
