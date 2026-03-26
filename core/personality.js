function calcMood(state) {
  const { hunger, energy, happiness } = state.stats;
  if (hunger > 70) return 'hungry';
  if (energy < 30) return 'tired';
  if (happiness > 60 && hunger < 40) return 'happy';
  return 'neutral';
}

const TRAIT_SHIFT = 0.02;

const TRAIT_EFFECTS = {
  explore:  { curiosity: TRAIT_SHIFT,  playfulness: 0,           stubbornness: 0           },
  retry:    { curiosity: 0,            playfulness: 0,           stubbornness: TRAIT_SHIFT  },
  varied:   { curiosity: 0,            playfulness: TRAIT_SHIFT, stubbornness: 0           },
  grind:    { curiosity: -TRAIT_SHIFT, playfulness: -TRAIT_SHIFT, stubbornness: 0          },
  pivot:    { curiosity: 0,            playfulness: 0,           stubbornness: -TRAIT_SHIFT },
};

function clampTrait(value) {
  return Math.max(0, Math.min(1, value));
}

function shiftTraits(state, event) {
  const effects = TRAIT_EFFECTS[event.type];
  if (!effects) return state;
  for (const [trait, delta] of Object.entries(effects)) {
    if (delta !== 0) {
      state.personality[trait] = clampTrait(state.personality[trait] + delta);
    }
  }
  return state;
}

const EXT_TO_LANGUAGE = {
  '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript',
  '.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust',
  '.java': 'java', '.c': 'c', '.h': 'c', '.cpp': 'cpp', '.hpp': 'cpp',
  '.cs': 'csharp', '.swift': 'swift', '.kt': 'kotlin',
  '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell',
};

function timeOfDay(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function updatePreferences(state, event) {
  if (!state._langCounts) state._langCounts = {};
  if (event.fileExtension) {
    const lang = EXT_TO_LANGUAGE[event.fileExtension] || event.fileExtension;
    state._langCounts[lang] = (state._langCounts[lang] || 0) + 1;
    let maxLang = null;
    let maxCount = 0;
    for (const [lang, count] of Object.entries(state._langCounts)) {
      if (count > maxCount) { maxLang = lang; maxCount = count; }
    }
    state.preferences.favoriteLanguage = maxLang;
  }
  if (event.sessionHour !== undefined) {
    state.preferences.favoriteTime = timeOfDay(event.sessionHour);
  }
  return state;
}

module.exports = { calcMood, shiftTraits, updatePreferences };
