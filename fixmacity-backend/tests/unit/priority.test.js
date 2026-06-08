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

const score1 = computePriorityScore({ votes_count: 10, is_sensitive: true, sensitive_type: 'hospital' });
assert.strictEqual(score1, 9, `Expected 9, got ${score1}`);
console.log(' Test 1 passed: Hospital + 10 votes = 9');

const score2 = computePriorityScore({ votes_count: 0, is_sensitive: false, sensitive_type: 'none' });
assert.strictEqual(score2, 0, `Expected 0, got ${score2}`);
console.log('Test 2 passed: No zone, no votes = 0');

const score3 = computePriorityScore({ votes_count: 30, is_sensitive: true, sensitive_type: 'school' });
assert.strictEqual(score3, 13, `Expected 13, got ${score3}`);
console.log(' Test 3 passed: School + capped votes = 13');

// ══════════════════════════════════════════════════════
//  STATUS TRANSITION TESTS
// ══════════════════════════════════════════════════════

assert.strictEqual(isValidTransition('soumise', 'assignee_chef'), true);
console.log(' Test 4 passed: soumise → assignee_chef valide');

assert.strictEqual(isValidTransition('soumise', 'resolue'), false);
console.log('Test 5 passed: soumise → resolue invalide (transition interdite)');

assert.strictEqual(isValidTransition('en_cours', 'resolue'), true);
console.log(' Test 6 passed: en_cours → resolue valide');

assert.strictEqual(isValidTransition('assignee_agent', 'refusee_agent'), true);
console.log(' Test 7 passed: assignee_agent → refusee_agent valide');

assert.strictEqual(isValidTransition('cloturee', 'soumise'), false);
console.log(' Test 8 passed: cloturee → soumise invalide (état final)');

console.log('\n All 8 unit tests passed');