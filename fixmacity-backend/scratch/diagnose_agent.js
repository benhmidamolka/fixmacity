// scratch/diagnose_agent.js
// Run with: node scratch/diagnose_agent.js  (from fixmacity-backend folder)
require('dotenv').config();
const supabase = require('../src/config/db');


async function diagnose() {
  console.log('\n=== AGENT DATA DIAGNOSIS ===\n');

  // 1. Find the agent user
  const { data: agent, error: agentErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role, department_id, is_active')
    .eq('email', 'agent.voirie@sousse.tn')
    .single();

  if (agentErr || !agent) {
    console.error('❌ Agent not found:', agentErr?.message);
    process.exit(1);
  }

  console.log('✅ Agent found:');
  console.log('   ID:', agent.id);
  console.log('   Name:', agent.first_name, agent.last_name);
  console.log('   Department ID:', agent.department_id || '⚠️  NULL — this is the problem!');
  console.log('   Active:', agent.is_active);
  console.log();

  // 2. Check the department
  if (agent.department_id) {
    const { data: dept } = await supabase
      .from('departments')
      .select('id, name_fr, code')
      .eq('id', agent.department_id)
      .single();
    console.log('✅ Department:', dept?.name_fr, '(', dept?.code, ')');
  } else {
    console.log('⚠️  Agent has NO department_id — ALL queries will return empty results.');
  }

  // 3. Check declarations in the agent's department
  if (agent.department_id) {
    const { data: decls, error: declErr } = await supabase
      .from('declarations')
      .select('id, status, agent_id, title')
      .eq('department_id', agent.department_id)
      .is('deleted_at', null)
      .eq('is_deleted', false);

    console.log('\n✅ Declarations in this department:', decls?.length ?? 0);

    // Declarations assigned to this agent
    const assigned = (decls || []).filter(d => d.agent_id === agent.id);
    console.log('   → Assigned to this agent:', assigned.length);

    // Unassigned declarations with status assignee_agent
    const unassigned = (decls || []).filter(d => !d.agent_id && d.status === 'assignee_agent');
    console.log('   → Unassigned (assignee_agent):', unassigned.length);

    if (decls && decls.length > 0) {
      console.log('\n   First 5 declarations:');
      decls.slice(0, 5).forEach(d => {
        console.log(`     - [${d.status}] ${d.title?.slice(0, 50)} | agent_id: ${d.agent_id || 'none'}`);
      });
    }
  } else {
    // No department — show ALL declarations with status assignee_agent across all depts
    const { data: allDecls } = await supabase
      .from('declarations')
      .select('id, status, agent_id, department_id, title')
      .in('status', ['assignee_agent', 'en_cours'])
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .limit(10);

    console.log('\n📋 All active declarations (any dept):');
    (allDecls || []).forEach(d => {
      console.log(`   - [${d.status}] dept: ${d.department_id} | agent: ${d.agent_id || 'none'} | ${d.title?.slice(0, 40)}`);
    });
  }

  // 4. List all departments for reference
  const { data: depts } = await supabase
    .from('departments')
    .select('id, name_fr, code')
    .order('name_fr');

  console.log('\n📂 All Departments:');
  (depts || []).forEach(d => console.log(`   [${d.code}] ${d.name_fr} — ${d.id}`));

  console.log('\n=== DONE ===\n');
  process.exit(0);
}

diagnose().catch(err => { console.error(err); process.exit(1); });
