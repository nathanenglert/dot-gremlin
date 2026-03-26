const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const CLI_PATH = path.join(__dirname, '..', 'core', 'cli.js');
const TMP_DIR = path.join(os.tmpdir(), `gremlin-cli-test-${Date.now()}`);
const STATE_PATH = path.join(TMP_DIR, 'state.json');
const ART_DIR = path.join(__dirname, '..', 'art');

function run(...args) {
  return execFileSync('node', [CLI_PATH, ...args], {
    encoding: 'utf-8',
    env: { ...process.env, GREMLIN_STATE_PATH: STATE_PATH, GREMLIN_ART_DIR: ART_DIR },
  }).trim();
}

describe('cli', () => {
  beforeEach(() => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it('setup creates a new gremlin', () => {
    const output = run('setup', '--name', 'Pixel', '--species', 'cat');
    assert.ok(output.includes('Pixel'));
    assert.ok(fs.existsSync(STATE_PATH));
  });

  it('status shows gremlin info', () => {
    run('setup', '--name', 'Pixel', '--species', 'cat');
    const output = run('status');
    assert.ok(output.includes('Pixel'));
    assert.ok(output.includes('Lv.'));
  });

  it('feed reduces hunger', () => {
    run('setup', '--name', 'Pixel', '--species', 'cat');
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

  it('name renames the gremlin', () => {
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
