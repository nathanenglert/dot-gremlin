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
