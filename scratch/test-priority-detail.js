require('dotenv').config({ path: '../fixmacity-backend/.env' });
const supabase = require('../fixmacity-backend/src/config/db');

async function run() {
  console.log('Connecting to local PostgreSQL database...');
  
  // 1. Fetch some declarations to see what we have
  const { data: decls, error } = await supabase
    .from('declarations')
    .select('id, title, priority_score, priority, ai_priority, ai_priority_score, ai_confidence, ai_reasoning, ai_visible_issues, is_sensitive, sensitive_type, votes_count, president_override, president_override_note, priority_approved, priority_approved_at')
    .limit(5);

  if (error) {
    console.error('Database query error:', error.message);
    process.exit(1);
  }

  if (!decls || decls.length === 0) {
    console.log('No declarations found in the database. Generating mock output with dummy data...');
    const dummy = {
      id: 'd9e03d4a-bc12-4217-a068-07e3a985f403',
      title: 'Dépotoir sauvage près de l\'école',
      priority_score: 12,
      priority: 'haute',
      ai_priority: 'urgent',
      ai_priority_score: 10,
      ai_confidence: 92,
      ai_reasoning: 'L\'image montre une accumulation importante de déchets sur la voie publique, obstruant le passage des piétons.',
      ai_visible_issues: ['déchets', 'obstruction'],
      is_sensitive: true,
      sensitive_type: 'school',
      votes_count: 3,
      president_override: null,
      president_override_note: null,
      priority_approved: false,
      priority_approved_at: null
    };
    printDetail(dummy);
    return;
  }

  console.log(`Found ${decls.length} declarations.`);
  decls.forEach((decl, idx) => {
    console.log(`\n--- Test Item #${idx + 1} (${decl.title}) ---`);
    printDetail(decl);
  });
}

function printDetail(decl) {
  const mapToLevel = (val) => {
    if (!val) return 'normal';
    const v = val.toLowerCase();
    if (['haute', 'high', 'critique', 'critical', 'urgent'].includes(v)) return 'urgent';
    if (['basse', 'low', 'faible'].includes(v)) return 'faible';
    return 'normal';
  };

  // Calculate score components
  let score_ai = 0;
  if (decl.ai_priority) {
    const level = mapToLevel(decl.ai_priority);
    score_ai = level === 'urgent' ? 10 : level === 'normal' ? 5 : 1;
  } else if (decl.ai_priority_score !== null && decl.ai_priority_score !== undefined) {
    score_ai = decl.ai_priority_score;
  }
  
  const score_votes = Math.min(decl.votes_count || 0, 5);
  const score_location = decl.is_sensitive
    ? (decl.sensitive_type === 'hospital' ? 4 : decl.sensitive_type === 'school' ? 3 : 2)
    : 0;
  
  const computed_score = score_ai + score_votes + score_location;
  const score_total = Math.min(10, computed_score);

  const computed_priority = score_total >= 7 ? 'urgent' : score_total >= 4 ? 'normal' : 'faible';
  const final_priority = decl.president_override
    ? mapToLevel(decl.president_override)
    : computed_priority;

  let parsedIssues = [];
  if (decl.ai_visible_issues) {
    try {
      parsedIssues = Array.isArray(decl.ai_visible_issues)
        ? decl.ai_visible_issues
        : JSON.parse(decl.ai_visible_issues);
    } catch (e) {
      parsedIssues = typeof decl.ai_visible_issues === 'string'
        ? [decl.ai_visible_issues]
        : [];
    }
  }

  const payload = {
    id: decl.id,
    ai_priority: decl.ai_priority ? mapToLevel(decl.ai_priority) : 'normal',
    ai_priority_score: score_ai,
    ai_confidence: decl.ai_confidence ? (decl.ai_confidence > 1 ? decl.ai_confidence / 100 : decl.ai_confidence) : 0.8,
    ai_reasoning: decl.ai_reasoning || null,
    ai_visible_issues: parsedIssues,
    is_sensitive: !!decl.is_sensitive,
    sensitive_type: decl.sensitive_type || null,
    sensitive_distance_m: decl.is_sensitive ? 120 : null,
    votes_count: decl.votes_count || 0,
    computed_priority,
    computed_score,
    final_priority,
    president_override: decl.president_override ? mapToLevel(decl.president_override) : null,
    president_override_note: decl.president_override_note || null,
    priority_approved: !!decl.priority_approved,
    priority_approved_at: decl.priority_approved_at || null,
    approved_by_name: decl.priority_approved ? 'Président' : null,
    score_ai,
    score_votes,
    score_location,
    score_total,
  };

  console.log('Mapped payload:', JSON.stringify(payload, null, 2));
}

run().catch(console.error);
