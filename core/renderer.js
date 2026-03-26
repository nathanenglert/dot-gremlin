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
    lines.push(`\u2502 ${artPart}   ${infoPart}`);
  }

  return lines.join('\n');
}

module.exports = { loadArt, renderStatBar, renderStatusLine };
