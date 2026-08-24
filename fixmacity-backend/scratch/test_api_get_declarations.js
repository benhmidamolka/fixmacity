require('dotenv').config();
const supabase = require('../src/config/db');

const agentId = 'f1953019-0a65-40a5-a2a5-42cd7ff067ac';
const deptId = 'c3c9d2cd-4b55-481b-b577-92ae1ee7d8d1'; // VR

const SELECT_FIELDS = `id, ref_citoyen, ref_service, title, description, category, status,
     priority, priority_score, is_sensitive, sensitive_type,
     created_at, assigned_at, started_at, resolved_at, votes_count,
     address, latitude, longitude, photo_avant,
     agent_id, department_id,
     delegations:delegation_id (name, code),
     citizen:citizen_id (id, first_name, last_name, email, phone)`;

const VALID_STATUSES = [
  'assignee_agent', 'en_cours', 'resolue', 'refusee_agent', 'cloturee',
];

async function main() {
  try {
    const { data: dsa } = await supabase
      .from('declaration_service_agents')
      .select('declaration_service_id')
      .eq('agent_id', agentId);
    
    let assignedIds = [];
    if (dsa && dsa.length > 0) {
      const dsIds = dsa.map(a => a.declaration_service_id).filter(Boolean);
      if (dsIds.length > 0) {
        const { data: ds } = await supabase
          .from('declaration_services')
          .select('declaration_id')
          .in('id', dsIds);
        if (ds) {
          assignedIds = ds.map(d => d.declaration_id).filter(Boolean);
        }
      }
    }

    console.log("Assigned IDs via DSA:", assignedIds);

    let orClauseA = `agent_id.eq.${agentId}`;
    if (assignedIds.length > 0) orClauseA += `,id.in.(${assignedIds.join(',')})`;

    let qA = supabase
      .from('declarations')
      .select(SELECT_FIELDS)
      .eq('department_id', deptId)
      .or(orClauseA)
      .is('deleted_at', null)
      .or('is_deleted.eq.false,is_deleted.is.null');

    let qB = supabase
      .from('declarations')
      .select(SELECT_FIELDS)
      .eq('department_id', deptId)
      .eq('status', 'assignee_agent')
      .is('agent_id', null)
      .is('deleted_at', null)
      .or('is_deleted.eq.false,is_deleted.is.null');

    const [resA, resB] = await Promise.all([
      qA,
      qB,
    ]);

    if (resA.error) {
      console.error("resA error:", resA.error);
    }
    if (resB.error) {
      console.error("resB error:", resB.error);
    }

    console.log("qA result count:", resA.data?.length);
    console.log("qB result count:", resB.data?.length);

    const seen = new Set();
    let declarations = [...(resA.data || []), ...(resB.data || [])].filter(d => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });

    console.log("Total merged declarations:", declarations.length);
    if (declarations.length > 0) {
      console.log("First 3 declarations:", declarations.slice(0, 3));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
