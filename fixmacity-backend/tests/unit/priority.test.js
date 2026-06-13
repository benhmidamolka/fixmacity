// ══════════════════════════════════════════════════════
//  FixMaCity — Unit Tests
//  Priority Score + Status Transition Validation
// ══════════════════════════════════════════════════════

const assert = require('assert'); // ← only once, at the top

// ─── Function 1: Priority Score ───────────────────────
function computePriorityScore({ votes_count, is_sensitive, sensitive_type }) {
  let score = 0;
  if (is_sensitive && sensitive_type === 'hospital') score += 4;
  if (is_sensitive && sensitive_type === 'school')   score += 3;
  score += Math.min(votes_count * 0.5, 10);
  return parseFloat(score.toFixed(2));
}

// ─── Function 2: Status Transition ────────────────────
function isValidTransition(from, to) {
  const allowed = {
    'soumise':        ['assignee_chef'],
    'assignee_chef':  ['assignee_agent', 'refusee_chef'],
    'assignee_agent': ['en_cours', 'refusee_agent'],
    'en_cours':       ['resolue'],
    'resolue':        ['cloturee'],
  };
  return allowed[from]?.includes(to) ?? false;
}

// ══════════════════════════════════════════════════════
//  PRIORITY SCORE TESTS
// ══════════════════════════════════════════════════════

describe('FixMaCity Unit Tests', () => {
  describe('Priority Score', () => {
    test('Test 1: Hospital + 10 votes = 9', () => {
      const score1 = computePriorityScore({ votes_count: 10, is_sensitive: true, sensitive_type: 'hospital' });
      expect(score1).toBe(9);
    });

    test('Test 2: No zone, no votes = 0', () => {
      const score2 = computePriorityScore({ votes_count: 0, is_sensitive: false, sensitive_type: 'none' });
      expect(score2).toBe(0);
    });

    test('Test 3: School + capped votes = 13', () => {
      const score3 = computePriorityScore({ votes_count: 30, is_sensitive: true, sensitive_type: 'school' });
      expect(score3).toBe(13);
    });
  });

  describe('Status Transition Validation', () => {
    test('Test 4: soumise -> assignee_chef valide', () => {
      expect(isValidTransition('soumise', 'assignee_chef')).toBe(true);
    });

    test('Test 5: soumise -> resolue invalide', () => {
      expect(isValidTransition('soumise', 'resolue')).toBe(false);
    });

    test('Test 6: en_cours -> resolue valide', () => {
      expect(isValidTransition('en_cours', 'resolue')).toBe(true);
    });

    test('Test 7: assignee_agent -> refusee_agent valide', () => {
      expect(isValidTransition('assignee_agent', 'refusee_agent')).toBe(true);
    });

    test('Test 8: cloturee -> soumise invalide', () => {
      expect(isValidTransition('cloturee', 'soumise')).toBe(false);
    });
  });
});

function calculatePriorityScore(votes, joursEcoules) {
  return (votes * 3) + (joursEcoules * 0.5);
}

module.exports = { calculatePriorityScore };