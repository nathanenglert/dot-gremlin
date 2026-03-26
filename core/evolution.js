function calcLevel(xp) {
  return Math.floor(Math.sqrt(xp / 10));
}

function calcStage(level) {
  if (level <= 0) return 'egg';
  if (level <= 2) return 'baby';
  if (level <= 6) return 'juvenile';
  if (level <= 14) return 'adult';
  return 'elder';
}

function awardXP(state, amount) {
  const oldStage = state.stage;
  state.xp += amount;
  state.level = calcLevel(state.xp);
  state.stage = calcStage(state.level);
  return { state, evolved: state.stage !== oldStage };
}

module.exports = { calcLevel, calcStage, awardXP };
