const FLAVOR_POOLS = {
  happy: {
    default: [
      '{name} purrs contentedly.',
      '{name} bounces happily!',
      '{name} looks at you with bright eyes.',
      'All is well in {name}\'s world.',
      '{name} chirps cheerfully.',
    ],
    test_pass: [
      '{name} does a little victory dance!',
      'Tests green! {name} beams with pride.',
      '{name} high-fives you (metaphorically).',
      '{name} is impressed by your test coverage!',
    ],
    commit: [
      '{name} nods approvingly at the clean commit.',
      'Another commit! {name} loves progress.',
      '{name} watches the commit with satisfaction.',
    ],
  },
  neutral: {
    default: [
      '{name} watches quietly.',
      '{name} tilts their head curiously.',
      '{name} is here, keeping you company.',
      '{name} observes your work.',
    ],
  },
  hungry: {
    default: [
      '{name} looks at you with pleading eyes...',
      '{name}\'s tummy rumbles.',
      '{name} nudges you gently. Snack time?',
      '{name} eyes your keyboard hungrily.',
      'Feed me! ...is what {name}\'s eyes seem to say.',
    ],
  },
  tired: {
    default: [
      '{name} yawns widely.',
      '{name} is struggling to keep their eyes open.',
      '{name} curls up and dozes off...',
      'Maybe {name} needs a rest?',
    ],
  },
};

function getFlavor(state, mood, event = 'default') {
  const moodPool = FLAVOR_POOLS[mood] || FLAVOR_POOLS.neutral;
  const pool = moodPool[event] || moodPool.default;
  const template = pool[Math.floor(Math.random() * pool.length)];
  return template.replace(/\{name\}/g, state.name);
}

module.exports = { getFlavor };
