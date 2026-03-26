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
  it('includes gremlin name via template', () => {
    const state = createState('Pixel', 'cat');
    const texts = Array.from({ length: 20 }, () => getFlavor(state, 'happy'));
    const hasName = texts.some(t => t.includes('Pixel'));
    assert.ok(hasName, 'Expected at least one flavor text to include the gremlin name');
  });
});
