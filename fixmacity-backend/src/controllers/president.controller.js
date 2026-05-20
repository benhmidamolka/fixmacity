const bcrypt = require('bcrypt');
const supabase = require('../config/db');
const { validationResult } = require('express-validator');
const { generateRefService } = require('../services/refGenerator.service');
const { logStatusChange } = require('../services/statusHistory.service');
const { notifyStatusChange, notifyChefAssigned } = require('../services/notification.service');
const { getNextGenAI } = require('../services/gemini.rotation');

const SALT_ROUNDS = 12;

/* ──────────── GET /api/president/declarations ──────────── */
exports.listDeclarations = async (req, res) => {
  try {
    const { status, delegation_id, department_id, service_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('declarations')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)

      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (delegation_id) query = query.eq('delegation_id', delegation_id);
    if (department_id) query = query.eq('department_id', department_id);
    if (service_id) query = query.eq('service_id', service_id);

    let { data, error, count } = await query;

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(d => d.user_id || d.citizen_id).filter(Boolean))];
      const agentIds = [...new Set(data.map(d => d.agent_id).filter(Boolean))];
      const allUserIds = [...new Set([...userIds, ...agentIds])];

      const delegIds = [...new Set(data.map(d => d.delegation_id).filter(Boolean))];

      let userMap = {};
      if (allUserIds.length > 0) {
        const { data: usersData } = await supabase.from('users')
          .select('id, first_name, last_name, email')
          .in('id', allUserIds);
        if (usersData) usersData.forEach(u => userMap[u.id] = u);
      }

      let delegMap = {};
      if (delegIds.length > 0) {
        const { data: delegData } = await supabase.from('delegations').select('id, name').in('id', delegIds);
        if (delegData) delegData.forEach(d => delegMap[d.id] = d.name);
      }

      data = data.map(d => {
        const agent = d.agent_id ? userMap[d.agent_id] : null;
        return {
          ...d,
          // Ensure priority fields are always present
          priority_score:  d.priority_score  ?? 0,
          priority_label:  d.priority_label  ?? null,
          priority_method: d.priority_method ?? null,
          users: userMap[d.user_id || d.citizen_id] || null,
          agent_name: agent ? `${agent.first_name} ${agent.last_name}` : null,
          delegation_name: d.delegation_id ? (delegMap[d.delegation_id] || 'Sousse Nord') : 'Sousse Nord',
          arrondissement_name: d.delegation_id ? (delegMap[d.delegation_id] || 'Sousse Nord') : 'Sousse Nord',
          delegations: d.delegation_id ? { name: delegMap[d.delegation_id] } : null
        };
      });
    }

    if (error) {
      console.error('[President] ListDecl error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    return res.status(200).json({ declarations: data, total: count, page: +page, limit: +limit });
  } catch (e) {
    console.error('[President] listDeclarations error:', e);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

exports.getDeclarationDetail = async (req, res) => {
  try {
    const { id } = req.params;
 
    // ── 1. Fetch base declaration ──────────────────────────────────────────
    const { data: decl, error: declErr } = await supabase
      .from('declarations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .single();

    // Ensure priority fields are included (in case * doesn't include them)
    if (decl && !('priority_score' in decl)) {
      decl.priority_score = decl.priority_score ?? 0;
      decl.priority_label = decl.priority_label ?? null;
      decl.priority_method = decl.priority_method ?? null;
      decl.priority_meta = decl.priority_meta ?? {};
    }
 
    if (declErr || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    }
 
    // ── 2. Citizen info ────────────────────────────────────────────────────
    let citizen = null;
    const citizenId = decl.citizen_id || decl.user_id;
    if (citizenId) {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone')
        .eq('id', citizenId)
        .maybeSingle();
      citizen = data || null;
    }
 
    // ── 3. Department / service ────────────────────────────────────────────
    let department = null;
    if (decl.department_id) {
      const { data } = await supabase
        .from('services')
        .select('id, name_fr, name_ar, name_en, code')
        .eq('id', decl.department_id)
        .maybeSingle();
      if (data) department = { ...data, name: data.name_fr || data.name_en || data.code };
    }
 
    // ── 4. Chef de service ─────────────────────────────────────────────────
    let chef = null;
    if (decl.department_id) {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('role', 'chef')
        .eq('department_id', decl.department_id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      chef = data || null;
    }
 
    // ── 5. Agent ───────────────────────────────────────────────────────────
    let agent = null;
    const agentId = decl.agent_id || decl.assigned_agent_id;
    if (agentId) {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', agentId)
        .maybeSingle();
      agent = data || null;
    }
 
    // ── 6. Photos ──────────────────────────────────────────────────────────
    const { data: photos } = await supabase
      .from('declaration_photos')
      .select('*')
      .eq('declaration_id', id);
 
    // ── 7. Status history ──────────────────────────────────────────────────
    const { data: historyRaw } = await supabase
      .from('status_history')
      .select('*')
      .eq('declaration_id', id)
      .order('created_at', { ascending: false });
 
    // Enrich history with user info
    let history = [];
    if (historyRaw && historyRaw.length > 0) {
      const uIds = [...new Set(historyRaw.map(h => h.changed_by).filter(Boolean))];
      let userMap = {};
      if (uIds.length > 0) {
        const { data: uData } = await supabase
          .from('users')
          .select('id, first_name, last_name, role')
          .in('id', uIds);
        if (uData) uData.forEach(u => userMap[u.id] = u);
      }
      history = historyRaw.map(h => ({
        ...h,
        user: h.changed_by ? (userMap[h.changed_by] || null) : null,
      }));
    }
 
    // ── 8. Internal comments ───────────────────────────────────────────────
    const { data: commentsRaw } = await supabase
      .from('internal_comments')
      .select('*')
      .eq('declaration_id', id)
      .order('created_at', { ascending: true });
 
    let comments = [];
    if (commentsRaw && commentsRaw.length > 0) {
      const uIds = [...new Set(commentsRaw.map(c => c.user_id).filter(Boolean))];
      let userMap = {};
      if (uIds.length > 0) {
        const { data: uData } = await supabase
          .from('users')
          .select('id, first_name, last_name, role')
          .in('id', uIds);
        if (uData) uData.forEach(u => userMap[u.id] = u);
      }
      comments = commentsRaw.map(c => ({
        ...c,
        user: userMap[c.user_id] || null,
      }));
    }
 
    // ── 9. Rating (if any) ─────────────────────────────────────────────────
    const { data: rating } = await supabase
      .from('ratings')
      .select('score, comment, rated_at')
      .eq('declaration_id', id)
      .maybeSingle();
 
    // ── 10. Build response ─────────────────────────────────────────────────
    return res.status(200).json({
      declaration: {
        ...decl,
        // Ensure priority fields are always present (even if null in DB)
        priority_score:  decl.priority_score  ?? 0,
        priority_label:  decl.priority_label  ?? null,
        priority_method: decl.priority_method ?? null,
        priority_meta:   decl.priority_meta   ?? {},
        citizen,
        department,
        chef,
        agent,
        rating: rating || null,
      },
      photos:   photos   || [],
      history:  history  || [],
      comments: comments || [],
    });
 
  } catch (err) {
    console.error('[President] getDeclarationDetail error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
 
/* ──────────── POST /api/president/declarations/:id/analyze-image ──────────── */
exports.analyzeDeclarationImage = async (req, res) => {
  try {
    const { id } = req.params;
 
    const { data: decl, error } = await supabase
      .from('declarations')
      .select('id, title, category, description, photo_avant, image_url, is_sensitive, sensitive_type, votes_count, latitude, longitude')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
 
    if (error || !decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
 
    // Resolve image URL — try photo_avant first, then image_url, then first photo record
    let imageUrl = decl.photo_avant || decl.image_url;
    if (!imageUrl) {
      const { data: firstPhoto } = await supabase
        .from('declaration_photos').select('url').eq('declaration_id', id).limit(1).maybeSingle();
      imageUrl = firstPhoto?.url || null;
    }
 
    // Build score from non-AI signals regardless of whether we have an image
    const voteBonus = Math.min(decl.votes_count || 0, 5);
    const locBonus  = decl.is_sensitive
      ? (decl.sensitive_type === 'hospital' ? 4 : decl.sensitive_type === 'school' ? 3 : 2)
      : 0;
 
    let aiResult = null;
 
    // Only call Gemini if we have an image
    if (imageUrl) {
      try {
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) throw new Error('Image fetch failed');
        const imageBuffer = await imageRes.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        let mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
        if (mimeType === 'application/octet-stream' || !mimeType.startsWith('image/')) {
          const ext = imageUrl.split('.').pop().split('?')[0].toLowerCase();
          mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        }

        const contextParts = [
          `Titre: ${decl.title}`,
          `Catégorie: ${decl.category || 'Non spécifiée'}`,
          `Description: ${decl.description || 'Aucune'}`,
          decl.is_sensitive ? `Zone sensible: ${decl.sensitive_type === 'hospital' ? 'Proximité hôpital' : 'Proximité école'}` : '',
          decl.votes_count > 0 ? `Votes communautaires: ${decl.votes_count}` : '',
        ].filter(Boolean).join('\n');
 
        const prompt = `Tu es expert en maintenance urbaine à Sousse, Tunisie.
Analyse cette photo et évalue la priorité d'intervention municipale.
 
Contexte:
${contextParts}
 
Critères:
- URGENT: Danger immédiat (nid-de-poule profond, câble électrique exposé, fuite d'eau majeure, éclairage cassé sur route principale)
- NORMAL: Problème visible nécessitant intervention rapide sans danger immédiat
- FAIBLE: Problème esthétique ou mineur (graffiti, fissure légère, herbe haute)
 
Réponds UNIQUEMENT avec ce JSON (sans markdown):
{
  "priority": "urgent" | "normal" | "faible",
  "confidence": 0-100,
  "severity_label": "max 4 mots",
  "reasoning": "1-2 phrases en français",
  "visible_issues": ["problème1", "problème2"]
}`;
 
        const genAI = getNextGenAI();
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent([prompt, { inlineData: { mimeType, data: base64Image } }]);
        const text = result.response.text().trim();
        const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
        aiResult = JSON.parse(jsonStr);
 
        // Normalize priority value
        const prioMap = {
          critique: 'urgent', critical: 'urgent', urgent: 'urgent',
          normal: 'normal', normale: 'normal', medium: 'normal',
          faible: 'faible', low: 'faible', basse: 'faible',
        };
        aiResult.priority = prioMap[aiResult.priority?.toLowerCase()] || 'normal';
      } catch (aiErr) {
        console.warn('[President] Gemini call failed, using fallback score:', aiErr.message);
        // aiResult stays null → we compute without AI
      }
    }
 
    // Score computation
    const aiScore = aiResult
      ? (aiResult.priority === 'urgent' ? 10 : aiResult.priority === 'normal' ? 5 : 1)
      : 0;
    const totalScore = aiScore + voteBonus + locBonus;
    const autoLabel  = totalScore >= 12 ? 'urgent' : totalScore >= 5 ? 'normal' : 'faible';
 
    // Persist analysis result to declarations table
    const updatePayload = {
      ai_priority:           aiResult ? aiResult.priority : null,
      ai_confidence:         aiResult?.confidence || null,
      ai_reasoning:          aiResult?.reasoning || null,
      ai_visible_issues:     aiResult?.visible_issues || [],
      ai_severity_label:     aiResult?.severity_label || null,
      ai_analyzed_at:        new Date().toISOString(),
      priority_score:        totalScore,
      // Mirror final priority into DB priority column (unless president already locked it)
      ...(!(decl.ai_priority_confirmed) && {
        priority: autoLabel === 'urgent' ? 'haute' : autoLabel === 'normal' ? 'moyenne' : 'basse',
      }),
    };
 
    await supabase.from('declarations').update(updatePayload).eq('id', id).is('deleted_at', null);
 
    return res.status(200).json({
      // AI analysis (null if no image or AI failed)
      has_image:     !!imageUrl,
      ai_used:       !!aiResult,
      ai_priority:   aiResult?.priority || null,
      ai_confidence: aiResult?.confidence || null,
      ai_reasoning:  aiResult?.reasoning || null,
      ai_visible_issues: aiResult?.visible_issues || [],
      ai_severity_label: aiResult?.severity_label || null,
      // Score breakdown
      score_breakdown: {
        ai_score:    aiScore,
        vote_bonus:  voteBonus,
        loc_bonus:   locBonus,
        total_score: totalScore,
      },
      // Final computed label
      computed_priority: autoLabel,
    });
  } catch (e) {
    console.error('[President] analyzeDeclarationImage error:', e);
    return res.status(500).json({ error: 'Erreur lors de l\'analyse.' });
  }
};





/* ──────────── PATCH /api/president/declarations/:id/priority ──────────── */
exports.overridePriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { priority, ai_confirmed, president_override, president_override_note, president_id } = req.body;

    const updateData = {
      updated_at: new Date().toISOString(),
      priority_approved: true,
      priority_approved_at: new Date().toISOString(),
    };

    // Map any priority string to DB values
    const levelToDb = (level) => {
      const v = (level || '').toLowerCase();
      if (['urgent', 'critique', 'critical', 'haute', 'high'].includes(v)) return { priority: 'haute', priority_score: 90 };
      if (['faible', 'low', 'basse'].includes(v)) return { priority: 'basse', priority_score: 15 };
      return { priority: 'moyenne', priority_score: 50 };
    };

    // Handle AIPriorityPanel format: president_override field
    if (president_override !== undefined) {
      updateData.president_override = president_override;
      updateData.president_override_note = president_override_note ?? null;
      if (president_override) {
        const mapped = levelToDb(president_override);
        updateData.priority = mapped.priority;
        updateData.priority_score = mapped.priority_score;
      }
    }

    // Handle older format: priority field (critical/normal/low)
    if (priority) {
      if (!['critical', 'normal', 'low'].includes(priority)) {
        return res.status(400).json({ error: 'Priorité invalide.' });
      }
      const mapped = levelToDb(priority);
      updateData.priority = mapped.priority;
      updateData.priority_score = mapped.priority_score;
      updateData.ai_priority_confirmed = ai_confirmed ?? true;
    }

    const { data: updated, error } = await supabase
      .from('declarations')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select('id, priority, priority_score, president_override, president_override_note, priority_approved, priority_approved_at')
      .single();

    if (error) {
      console.error('[President] overridePriority error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }

    // Return in format AIPriorityPanel expects
    const mapToLevel = (val) => {
      if (!val) return 'normal';
      const v = val.toLowerCase();
      if (['haute', 'high', 'critique', 'critical', 'urgent'].includes(v)) return 'urgent';
      if (['basse', 'low', 'faible'].includes(v)) return 'faible';
      return 'normal';
    };

    return res.status(200).json({
      success: true,
      final_priority: mapToLevel(updated.priority),
      president_override: updated.president_override ? mapToLevel(updated.president_override) : null,
      president_override_note: updated.president_override_note,
      priority_approved: updated.priority_approved,
      priority_approved_at: updated.priority_approved_at,
      declaration: updated,
    });
  } catch (e) {
    console.error('[President] overridePriority error:', e);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
/* ──────────── POST /api/president/declarations/:id/assign ──────────── */
exports.assignDeclaration = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { department_id, additional_department_ids, priority, planned_start, planned_end } = req.body;

    let priority_score = 4;
    if (priority === 'High') priority_score = 8;
    if (priority === 'Low') priority_score = 1;

    // Fetch declaration
    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchErr || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    }

    if (decl.status !== 'soumise') {
      return res.status(400).json({ error: 'Seules les déclarations au statut soumise peuvent être affectées.' });
    }

    // Look up service code for ref_service generation
    const { data: service } = await supabase
      .from('services')
      .select('id, code')
      .eq('id', department_id)
      .single();

    if (!service || !service.code) {
      return res.status(400).json({ error: 'Département/service invalide.' });
    }

    const refService = await generateRefService(service.code);

    const { data: updated, error: updateErr } = await supabase
      .from('declarations')
      .update({
        status: 'assignee_chef',
        department_id,
        service_id: department_id,
        ref_service: refService,
        priority_score: priority_score,
        planned_start: planned_start || null,
        planned_end: planned_end || null,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      console.error('[President] Assign error:', updateErr.message);
      return res.status(500).json({ error: 'Erreur lors de l\'affectation.' });
    }

    await logStatusChange(id, 'soumise', 'assignee_chef', req.user.id);
    await notifyStatusChange(req.app, updated, updated.citizen_id, 'assignee_chef');

    const { data: chef } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'chef')
      .eq('department_id', department_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (chef) {
      await notifyChefAssigned(req.app, updated, chef.id);
    }

    // Process additional departments by duplicating the declaration and its photos
    const extraDepts = Array.isArray(additional_department_ids)
      ? additional_department_ids.filter(dId => dId && dId !== department_id)
      : [];

    if (extraDepts.length > 0) {
      // Fetch photos of the original declaration
      const { data: photos } = await supabase
        .from('declaration_photos')
        .select('*')
        .eq('declaration_id', id);

      for (const addDeptId of extraDepts) {
        const { data: serviceAdd } = await supabase
          .from('services')
          .select('id, code')
          .eq('id', addDeptId)
          .single();

        if (!serviceAdd || !serviceAdd.code) {
          continue;
        }

        const refServiceSub = await generateRefService(serviceAdd.code);

        const subDeclData = {
          title: decl.title,
          description: decl.description,
          category: decl.category || null,
          delegation_id: decl.delegation_id,
          citizen_id: decl.citizen_id,
          user_id: decl.user_id,
          ref_citoyen: decl.ref_citoyen,
          status: 'assignee_chef',
          department_id: addDeptId,
          service_id: addDeptId,
          ref_service: refServiceSub,
          priority_score: priority_score,
          planned_start: planned_start || null,
          planned_end: planned_end || null,
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          latitude: decl.latitude || null,
          longitude: decl.longitude || null,
          address: decl.address || null,
          priority: decl.priority || 'moyenne',
          photo_avant: decl.photo_avant || null,
          is_deleted: false,
        };

        const { data: subDecl, error: subDeclErr } = await supabase
          .from('declarations')
          .insert(subDeclData)
          .select('*')
          .single();

        if (subDeclErr) {
          console.error('[President] Sub-assign error:', subDeclErr.message);
          continue;
        }

        if (photos && photos.length > 0) {
          const subPhotos = photos.map(ph => ({
            declaration_id: subDecl.id,
            url: ph.url,
            uploaded_by: ph.uploaded_by,
            photo_type: ph.photo_type || 'photo_avant'
          }));
          await supabase.from('declaration_photos').insert(subPhotos);
        }

        await logStatusChange(subDecl.id, 'soumise', 'assignee_chef', req.user.id);
        await notifyStatusChange(req.app, subDecl, subDecl.citizen_id, 'assignee_chef');

        const { data: subChef } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'chef')
          .eq('department_id', addDeptId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (subChef) {
          await notifyChefAssigned(req.app, subDecl, subChef.id);
        }
      }
    }

    return res.status(200).json({ declaration: updated });
  } catch (err) {
    console.error('[President] Assign error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/president/declarations/:id/reassign ──────────── */
exports.reassignDeclaration = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { department_id, additional_department_ids, priority, planned_start, planned_end } = req.body;

    let priority_score = 4;
    if (priority === 'High') priority_score = 8;
    if (priority === 'Low') priority_score = 1;

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchErr || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    }

    if (!['refusee_chef', 'refusee_agent', 'assignee_chef', 'assignee_agent', 'en_cours'].includes(decl.status)) {
      return res.status(400).json({ error: 'Seules les déclarations non résolues ou refusées peuvent être réaffectées.' });
    }

    const { data: service } = await supabase
      .from('services')
      .select('id, code')
      .eq('id', department_id)
      .single();

    if (!service || !service.code) {
      return res.status(400).json({ error: 'Département/service invalide.' });
    }

    const refService = await generateRefService(service.code);
    const oldStatus = decl.status;

    const { data: updated, error: updateErr } = await supabase
      .from('declarations')
      .update({
        status: 'assignee_chef',
        department_id,
        service_id: department_id,
        agent_id: null,
        ref_service: refService,
        priority_score: priority_score,
        planned_start: planned_start || null,
        planned_end: planned_end || null,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      console.error('[President] Reassign error:', updateErr.message);
      return res.status(500).json({ error: 'Erreur lors de la réaffectation.' });
    }

    await logStatusChange(id, oldStatus, 'assignee_chef', req.user.id, 'Réaffectation par le président');
    await notifyStatusChange(req.app, updated, updated.citizen_id, 'assignee_chef');

    const { data: chef } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'chef')
      .eq('department_id', department_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (chef) {
      await notifyChefAssigned(req.app, updated, chef.id);
    }

    // Process additional departments by duplicating the declaration and its photos
    const extraDepts = Array.isArray(additional_department_ids)
      ? additional_department_ids.filter(dId => dId && dId !== department_id)
      : [];

    if (extraDepts.length > 0) {
      // Fetch photos of the original declaration
      const { data: photos } = await supabase
        .from('declaration_photos')
        .select('*')
        .eq('declaration_id', id);

      for (const addDeptId of extraDepts) {
        const { data: serviceAdd } = await supabase
          .from('services')
          .select('id, code')
          .eq('id', addDeptId)
          .single();

        if (!serviceAdd || !serviceAdd.code) {
          continue;
        }

        const refServiceSub = await generateRefService(serviceAdd.code);

        const subDeclData = {
          title: decl.title,
          description: decl.description,
          category: decl.category || null,
          delegation_id: decl.delegation_id,
          citizen_id: decl.citizen_id,
          user_id: decl.user_id,
          ref_citoyen: decl.ref_citoyen,
          status: 'assignee_chef',
          department_id: addDeptId,
          service_id: addDeptId,
          ref_service: refServiceSub,
          priority_score: priority_score,
          planned_start: planned_start || null,
          planned_end: planned_end || null,
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          latitude: decl.latitude || null,
          longitude: decl.longitude || null,
          address: decl.address || null,
          priority: decl.priority || 'moyenne',
          photo_avant: decl.photo_avant || null,
          is_deleted: false,
        };

        const { data: subDecl, error: subDeclErr } = await supabase
          .from('declarations')
          .insert(subDeclData)
          .select('*')
          .single();

        if (subDeclErr) {
          console.error('[President] Sub-reassign error:', subDeclErr.message);
          continue;
        }

        if (photos && photos.length > 0) {
          const subPhotos = photos.map(ph => ({
            declaration_id: subDecl.id,
            url: ph.url,
            uploaded_by: ph.uploaded_by,
            photo_type: ph.photo_type || 'photo_avant'
          }));
          await supabase.from('declaration_photos').insert(subPhotos);
        }

        await logStatusChange(subDecl.id, oldStatus, 'assignee_chef', req.user.id, 'Réaffectation par le président (département additionnel)');
        await notifyStatusChange(req.app, subDecl, subDecl.citizen_id, 'assignee_chef');

        const { data: subChef } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'chef')
          .eq('department_id', addDeptId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (subChef) {
          await notifyChefAssigned(req.app, subDecl, subChef.id);
        }
      }
    }

    return res.status(200).json({ declaration: updated });
  } catch (err) {
    console.error('[President] Reassign error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/president/users ──────────── */
exports.listUsers = async (req, res) => {
  try {
    const { role, department_id, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, role, delegation_id, department_id, is_active, created_at, phone', { count: 'exact' })
      .order('role', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (role) query = query.eq('role', role);
    if (department_id) query = query.eq('department_id', department_id);

    const { data, error, count } = await query;

    if (error) {
      console.error('[President] ListUsers error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    // 1. Fetch counts from declarations for agents and departments (totals + resolved + accepted)
    const agentStatsRes = await supabase.pool.query(`
      SELECT
        agent_id,
        COUNT(*)                                                              AS total,
        COUNT(*) FILTER (WHERE status IN ('resolue','cloturee'))              AS resolved,
        COUNT(*) FILTER (WHERE status NOT IN ('soumise','refusee_chef'))      AS accepted
      FROM declarations
      WHERE agent_id IS NOT NULL AND deleted_at IS NULL AND COALESCE(is_deleted, false) = false
      GROUP BY agent_id
    `);
    const agentStats = {};
    agentStatsRes.rows.forEach(r => {
      agentStats[r.agent_id] = {
        total: parseInt(r.total, 10),
        resolved: parseInt(r.resolved, 10),
        accepted: parseInt(r.accepted, 10),
      };
    });

    const deptStatsRes = await supabase.pool.query(`
      SELECT
        department_id,
        COUNT(*)                                                              AS total,
        COUNT(*) FILTER (WHERE status IN ('resolue','cloturee'))              AS resolved,
        COUNT(*) FILTER (WHERE status NOT IN ('soumise','refusee_chef'))      AS accepted
      FROM declarations
      WHERE department_id IS NOT NULL AND deleted_at IS NULL AND COALESCE(is_deleted, false) = false
      GROUP BY department_id
    `);
    const deptStats = {};
    deptStatsRes.rows.forEach(r => {
      deptStats[r.department_id] = {
        total: parseInt(r.total, 10),
        resolved: parseInt(r.resolved, 10),
        accepted: parseInt(r.accepted, 10),
      };
    });

    // Enrich with department name and code
    let enrichedData = data || [];
    if (enrichedData.length > 0) {
      const deptIds = [...new Set(enrichedData.map(u => u.department_id).filter(Boolean))];
      const delegIds = [...new Set(enrichedData.map(u => u.delegation_id).filter(Boolean))];

      let serviceMap = {};
      if (deptIds.length > 0) {
        const { data: services } = await supabase
          .from('services')
          .select('id, name_fr, code')
          .in('id', deptIds);
        if (services) services.forEach(s => serviceMap[s.id] = s);
      }

      let delegMap = {};
      if (delegIds.length > 0) {
        const { data: delegs } = await supabase
          .from('delegations')
          .select('id, name')
          .in('id', delegIds);
        if (delegs) delegs.forEach(d => delegMap[d.id] = d.name);
      }

      enrichedData = enrichedData.map(u => {
        const stats = u.role === 'agent'
          ? (agentStats[u.id] || { total: 0, resolved: 0, accepted: 0 })
          : (deptStats[u.department_id] || { total: 0, resolved: 0, accepted: 0 });
        return {
          ...u,
          department_name: u.department_id ? (serviceMap[u.department_id]?.name_fr || 'Service') : 'N/A',
          department_code: u.department_id ? (serviceMap[u.department_id]?.code || '??') : '??',
          location: u.delegation_id ? (delegMap[u.delegation_id] || 'Sousse') : 'Sousse',
          total_tasks: stats.total,
          resolved_tasks: stats.resolved,
          accepted_tasks: stats.accepted,
        };
      });
    }

    return res.status(200).json({ users: enrichedData, total: count, page: +page, limit: +limit });
  } catch (err) {
    console.error('[President] ListUsers error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/president/users ──────────── */
exports.createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name, role, department_id, delegation_id } = req.body;

    // DB enum uses 'agent' and 'chef' (not 'chef_service')
    if (!['agent', 'chef'].includes(role)) {
      return res.status(400).json({ error: 'Le président ne peut créer que des comptes agent ou chef.' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: hashedPassword,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        role,
        department_id: department_id || null,
        delegation_id: delegation_id || null,
        is_active: true,
      })
      .select('id, email, first_name, last_name, role, department_id, delegation_id, is_active')
      .single();

    if (error) {
      console.error('[President] CreateUser error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la création du compte.' });
    }

    return res.status(201).json({ user });
  } catch (err) {
    console.error('[President] CreateUser error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PATCH /api/president/users/:id ──────────── */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};

    // ── Fields the president is allowed to edit ──
    const {
      role, department_id, is_active, delegation_id,
      first_name, last_name, email, phone, password
    } = req.body;

    if (role !== undefined) updates.role = role;
    if (department_id !== undefined) updates.department_id = department_id;
    if (delegation_id !== undefined) updates.delegation_id = delegation_id;
    if (is_active !== undefined) updates.is_active = is_active;
    if (first_name !== undefined) updates.first_name = first_name.trim();
    if (last_name !== undefined) updates.last_name = last_name.trim();
    if (phone !== undefined) updates.phone = phone.trim() || null;

    // Email: check uniqueness before updating
    if (email !== undefined) {
      const normalized = email.toLowerCase().trim();
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalized)
        .neq('id', id)        // exclude current user
        .maybeSingle();
      if (existing) {
        return res.status(409).json({ error: 'Cet email est déjà utilisé par un autre compte.' });
      }
      updates.email = normalized;
    }

    // Password: hash before saving
    if (password && password.trim().length >= 8) {
      updates.password_hash = await bcrypt.hash(password.trim(), SALT_ROUNDS);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour.' });
    }

    updates.updated_at = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, email, first_name, last_name, role, department_id, delegation_id, is_active, phone')
      .single();

    if (error) {
      console.error('[President] UpdateUser error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }

    return res.status(200).json({ user, success: true });
  } catch (err) {
    console.error('[President] UpdateUser error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
/* ──────────── DELETE /api/president/users/:id ──────────── */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Exception 3: Impossible de désactiver ou supprimer un agent ayant des missions en cours
    const { count: activeMissions } = await supabase
      .from('declarations')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', id)
      .in('status', ['assignee_agent', 'en_cours'])
      .is('deleted_at', null);

    if ((activeMissions || 0) > 0) {
      return res.status(400).json({ error: 'Impossible de supprimer cet agent car il a des missions en cours (assignées ou en cours d\'exécution).' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .select('id, email')
      .single();

    if (error) {
      if (error.code === '23503') {
        await supabase.from('users').update({ is_active: false }).eq('id', id);
        return res.status(200).json({
          message: 'L\'utilisateur ne peut pas être supprimé définitivement car il possède un historique d\'activité (déclarations archivées). Il a été désactivé à la place.',
          is_active: false
        });
      }
      throw error;
    }

    return res.status(200).json({
      message: 'Utilisateur supprimé définitivement.',
      id: id
    });
  } catch (err) {
    console.error('[President] DeleteUser error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/president/departments ──────────── */
exports.listDepartments = async (req, res) => {
  try {
    /* 1 ── Fetch all services */
    const { data: services, error } = await supabase
      .from('services')
      .select('id, name_fr, name_ar, name_en, code, description, is_active, created_at')
      .order('name_fr', { ascending: true });

    if (error) {
      console.error('[President] ListDept error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    const deptIds = (services || []).map(s => s.id);

    /* 2 ── Chefs map  (one per department, first active chef wins) */
    let chefMap = {};
    if (deptIds.length > 0) {
      const { data: chefs } = await supabase
        .from('users')
        .select('id, first_name, last_name, department_id')
        .eq('role', 'chef')
        .eq('is_active', true)
        .in('department_id', deptIds);
      if (chefs) {
        chefs.forEach(c => {
          if (!chefMap[c.department_id]) chefMap[c.department_id] = c;
        });
      }
    }

    /* 3 ── Agent counts per department */
    let agentsCountMap = {};
    if (deptIds.length > 0) {
      const { data: agentRows } = await supabase
        .from('users')
        .select('department_id')
        .eq('role', 'agent')
        .eq('is_active', true)
        .in('department_id', deptIds);
      if (agentRows) {
        agentRows.forEach(a => {
          agentsCountMap[a.department_id] = (agentsCountMap[a.department_id] || 0) + 1;
        });
      }
    }
    /* ── POST /api/president/departments ── */
    exports.createDepartment = async (req, res) => {
      try {
        const { name_fr, name_ar, name_en, code, description } = req.body;

        if (!name_fr?.trim()) return res.status(400).json({ error: 'Nom français obligatoire.' });
        if (!code?.trim()) return res.status(400).json({ error: 'Code obligatoire.' });
        if (code.length > 3) return res.status(400).json({ error: 'Code max 3 caractères.' });

        const upperCode = code.toUpperCase().trim();

        // Check code uniqueness
        const { data: byCode } = await supabase.from('services').select('id').eq('code', upperCode).maybeSingle();
        if (byCode) return res.status(409).json({ error: `Le code ${upperCode} est déjà utilisé.` });

        // Check name uniqueness
        const { data: byName } = await supabase.from('services').select('id').eq('name_fr', name_fr.trim()).maybeSingle();
        if (byName) return res.status(409).json({ error: 'Un service avec ce nom existe déjà.' });

        const { data: dept, error } = await supabase
          .from('services')
          .insert({
            name_fr: name_fr.trim(),
            name_ar: name_ar?.trim() || null,
            name_en: name_en?.trim() || null,
            code: upperCode,
            description: description?.trim() || null,
            is_active: true,
          })
          .select('*')
          .single();

        if (error) {
          console.error('[President] CreateDept error:', error.message);
          return res.status(500).json({ error: 'Erreur lors de la création.' });
        }

        return res.status(201).json({ department: dept, success: true });
      } catch (err) {
        console.error('[President] CreateDept error:', err);
        return res.status(500).json({ error: 'Erreur serveur.' });
      }
    };

    /* ── DELETE /api/president/departments/:id ── */
    exports.deleteDepartment = async (req, res) => {
      try {
        const { id } = req.params;

        // Block if active declarations exist
        const { data: active } = await supabase
          .from('declarations')
          .select('id')
          .eq('department_id', id)
          .is('deleted_at', null)
          .not('status', 'in', '(resolue,cloturee)')
          .limit(1)
          .maybeSingle();

        if (active) {
          return res.status(409).json({
            error: 'Impossible de supprimer: des déclarations actives sont encore assignées à ce service.'
          });
        }

        // Detach users first
        await supabase.from('users').update({ department_id: null }).eq('department_id', id);

        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) {
          console.error('[President] DeleteDept error:', error.message);
          return res.status(500).json({ error: 'Erreur lors de la suppression.' });
        }

        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('[President] DeleteDept error:', err);
        return res.status(500).json({ error: 'Erreur serveur.' });
      }
    };
    /* 4 ── Declaration counts per department — all status buckets in one query */
    const declRes = await supabase.pool.query(`
      SELECT
        department_id,
        COUNT(*)                                                                            AS total,
        COUNT(*) FILTER (WHERE status NOT IN ('soumise','refusee_chef'))                   AS accepted,
        COUNT(*) FILTER (WHERE status IN ('resolue','cloturee'))                           AS resolved,
        COUNT(*) FILTER (WHERE status IN ('refusee_chef','refusee_agent'))                 AS rejected,
        COUNT(*) FILTER (WHERE status = 'en_cours')                                        AS in_progress
      FROM declarations
      WHERE department_id IS NOT NULL
        AND deleted_at IS NULL
        AND COALESCE(is_deleted, false) = false
      GROUP BY department_id
    `);

    const countsMap = {};
    (declRes.rows || []).forEach(r => {
      countsMap[r.department_id] = {
        total: parseInt(r.total, 10),
        accepted: parseInt(r.accepted, 10),
        resolved: parseInt(r.resolved, 10),
        rejected: parseInt(r.rejected, 10),
        in_progress: parseInt(r.in_progress, 10),
      };
    });

    /* 5 ── Build response */
    const departments = (services || []).map(dept => {
      const chef = chefMap[dept.id] || null;
      const counts = countsMap[dept.id] || { total: 0, accepted: 0, resolved: 0, rejected: 0, in_progress: 0 };
      return {
        ...dept,
        name: dept.name_fr,
        chef_name: chef ? `${chef.first_name} ${chef.last_name}` : null,
        chef_id: chef?.id || null,
        agents_count: agentsCountMap[dept.id] || 0,
        ...counts,
      };
    });

    return res.status(200).json({ departments, success: true });
  } catch (err) {
    console.error('[President] ListDept error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};


/* ──────────── POST /api/president/propositions ──────────── */
exports.createProposition = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, start_date, end_date, category, status = 'active' } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Titre requis.' });

    const { data: prop, error } = await supabase
      .from('propositions')
      .insert({
        title: title.trim(),
        description: description?.trim() || '',
        category: category || 'Général',
        start_date: start_date || null,
        end_date: end_date || null,
        created_by: req.user.id,
        status,
      })
      .select('*').single();

    if (error) throw error;
    return res.status(201).json({ success: true, proposition: prop });
  } catch (err) {
    console.error('[President] createProposition error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PUT /api/president/propositions/:id ──────────── */
exports.updateProposition = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, start_date, end_date, status } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (category) updates.category = category;
    if (start_date !== undefined) updates.start_date = start_date || null;
    if (end_date !== undefined) updates.end_date = end_date || null;
    if (status) updates.status = status;

    const { data, error } = await supabase
      .from('propositions').update(updates).eq('id', id).select('*').single();

    if (error) throw error;
    return res.status(200).json({ success: true, proposition: data });
  } catch (err) {
    console.error('[President] updateProposition error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};


/* ──────────── DELETE /api/president/propositions/:id  ──────────── (NEW) */
exports.deleteProposition = async (req, res) => {
  try {
    const { id } = req.params;
    // Delete votes first (FK constraint)
    await supabase.from('proposition_votes').delete().eq('proposition_id', id);
    const { error } = await supabase.from('propositions').delete().eq('id', id);
    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Proposition supprimée.' });
  } catch (err) {
    console.error('[President] deleteProposition error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};


/* ──────────── GET /api/president/propositions ──────────── */
exports.listPropositions = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('propositions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    // Enrich with creator info
    const userIds = [...new Set((data || []).map(p => p.created_by).filter(Boolean))];
    let userMap = {};
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users').select('id, role, first_name, last_name').in('id', userIds);
      if (usersData) usersData.forEach(u => (userMap[u.id] = u));
    }

    const structured = (data || []).map(p => {
      const creator = userMap[p.created_by];
      const isPresidential = creator?.role === 'president';
      return {
        ...p,
        is_presidential: isPresidential,
        citizen: creator ? `${creator.first_name} ${creator.last_name}` : 'Anonyme',
        citizen_role: creator?.role || 'citizen',
        pour: p.votes_pour || 0,
        contre: p.votes_contre || 0,
        total: (p.votes_pour || 0) + (p.votes_contre || 0),
        category: p.category || 'Général',
      };
    });

    return res.status(200).json({
      success: true,
      propositions: structured,
      presidential: structured.filter(p => p.is_presidential),
      citizen: structured.filter(p => !p.is_presidential),
      total: count,
    });
  } catch (err) {
    console.error('[President] listPropositions error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/president/dashboard ──────────── */
exports.dashboard = async (req, res) => {
  try {
    const { period, status, department_id, delegation_id } = req.query;

    let baseQuery = supabase
      .from('declarations')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .or('is_deleted.eq.false,is_deleted.is.null')
      ;

    let sqlFilter = ` AND d.deleted_at IS NULL AND COALESCE(d.is_deleted, false) = false`;

    if (period && period !== 'all') {
      const days = parseInt(period, 10);
      if (!isNaN(days)) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        baseQuery = baseQuery.gte('created_at', dateLimit.toISOString());
        sqlFilter += ` AND d.created_at >= NOW() - INTERVAL '${days} days'`;
      }
    }
    if (status && status !== 'all') {
      baseQuery = baseQuery.eq('status', status);
      const validStatuses = ['soumise', 'assignee_chef', 'assignee_agent', 'en_cours', 'resolue', 'cloturee', 'refusee_chef', 'refusee_agent'];
      if (validStatuses.includes(status)) {
        sqlFilter += ` AND d.status = '${status}'`;
      }
    }
    if (department_id && department_id !== 'all') {
      baseQuery = baseQuery.eq('department_id', department_id);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(department_id)) {
        sqlFilter += ` AND d.department_id = '${department_id}'`;
      }
    }
    if (delegation_id && delegation_id !== 'all') {
      baseQuery = baseQuery.eq('delegation_id', delegation_id);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(delegation_id)) {
        sqlFilter += ` AND d.delegation_id = '${delegation_id}'`;
      }
    }

    // -- Total Declarations --
    const { count: totalDecl } = await baseQuery;

    // -- Status Counts --
    const statusCountsRes = await supabase.pool.query(`
      SELECT d.status, COUNT(*) as count
      FROM declarations d
      WHERE 1=1 ${sqlFilter}
      GROUP BY d.status
    `);
    const byStatus = {
      soumise: 0, assignee_chef: 0, assignee_agent: 0,
      en_cours: 0, resolue: 0, cloturee: 0,
      refusee_chef: 0, refusee_agent: 0
    };
    statusCountsRes.rows.forEach(r => {
      if (byStatus.hasOwnProperty(r.status)) {
        byStatus[r.status] = parseInt(r.count, 10);
      }
    });

    // -- Arrondissement (Delegation) Counts --
    const delegCountsRes = await supabase.pool.query(`
      SELECT dg.id, dg.name, COUNT(d.id) as count
      FROM delegations dg
      LEFT JOIN declarations d ON d.delegation_id = dg.id ${sqlFilter}
      GROUP BY dg.id, dg.name
    `);
    const byArrondissement = {};
    delegCountsRes.rows.forEach(r => {
      byArrondissement[r.id] = { name: r.name, count: parseInt(r.count, 10) };
    });

    // -- Total Users --
    const { count: totalUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    // -- Average Rating --
    const { data: avgData } = await supabase
      .from('ratings')
      .select('score');

    const avgRating = avgData && avgData.length > 0
      ? (avgData.reduce((sum, r) => sum + (r.score || 0), 0) / avgData.length).toFixed(2)
      : null;

    // ── Trend Data (Last 6 Months) ──
    const trendRes = await supabase.pool.query(`
      WITH months AS (
        SELECT to_char(date_trunc('month', (current_date - interval '5 months') + (n || ' months')::interval), 'MON') as name,
               date_trunc('month', (current_date - interval '5 months') + (n || ' months')::interval) as m_start
        FROM generate_series(0, 5) n
      )
      SELECT 
        m.name,
        COUNT(d.id) FILTER (WHERE d.created_at >= m.m_start AND d.created_at < m.m_start + interval '1 month') as reports,
        COUNT(d.id) FILTER (WHERE d.status IN ('resolue', 'cloturee') AND d.resolved_at >= m.m_start AND d.resolved_at < m.m_start + interval '1 month') as resolved
      FROM months m  
      LEFT JOIN declarations d ON 1=1 ${sqlFilter}
      GROUP BY m.name, m.m_start
      ORDER BY m.m_start ASC;
    `);
    const trendData = trendRes.rows.map(r => ({
      name: r.name,
      reports: parseInt(r.reports, 10),
      resolved: parseInt(r.resolved, 10)
    }));

    // ── Department Performance ──
    let byDepartment = [];
    try {
      const deptRes = await supabase.pool.query(`
        SELECT
          s.name_fr as name,
          s.id,
          s.code,
          COUNT(d.id)                                                      AS total,
          COUNT(d.id) FILTER (WHERE d.status IN ('resolue','cloturee'))   AS resolved
        FROM services s
        LEFT JOIN declarations d
          ON d.department_id = s.id
          AND d.deleted_at IS NULL
          AND COALESCE(d.is_deleted, false) = false
        GROUP BY s.id, s.name_fr, s.code
        ORDER BY total DESC
      `);
      byDepartment = deptRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        code: r.code,
        total: parseInt(r.total, 10),
        resolved: parseInt(r.resolved, 10),
        perf: parseInt(r.total, 10) > 0
          ? Math.round((parseInt(r.resolved, 10) / parseInt(r.total, 10)) * 100)
          : 0,
        highSatisfactionCount: 0,   // computed separately below
      }));

      // Satisfaction counts in a separate, isolated query to avoid JOIN explosion
      if (byDepartment.length > 0) {
        const satRes = await supabase.pool.query(`
          SELECT d.department_id, COUNT(DISTINCT d.id) AS sat_count
          FROM declarations d
          INNER JOIN ratings rt ON rt.declaration_id = d.id AND rt.score > 3
          WHERE d.deleted_at IS NULL AND COALESCE(d.is_deleted, false) = false
          GROUP BY d.department_id
        `);
        const satMap = {};
        (satRes.rows || []).forEach(r => { satMap[r.department_id] = parseInt(r.sat_count, 10); });
        byDepartment = byDepartment.map(d => ({
          ...d,
          highSatisfactionCount: satMap[d.id] || 0,
        }));
      }
    } catch (deptErr) {
      console.error('[President] Dashboard deptPerf query error:', deptErr);
      // Non-fatal — dashboard still renders without department performance data
    }

    // ── Aggregate KPI stats (same filters as dashboard) ──
    let stats = { criticalCount: 0, resolvedCount: 0, highSatisfactionCount: 0 };
    try {
      const statsRes = await supabase.pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE d.priority = 'haute') AS critical_count,
          COUNT(*) FILTER (WHERE d.status IN ('resolue', 'cloturee')) AS resolved_count
        FROM declarations d
        WHERE 1=1 ${sqlFilter}
      `);
      const satRes = await supabase.pool.query(`
        SELECT COUNT(DISTINCT d.id) AS high_satisfaction_count
        FROM declarations d
        INNER JOIN ratings r ON r.declaration_id = d.id AND r.score > 3
        WHERE 1=1 ${sqlFilter}
      `);
      const sr = statsRes.rows[0] || {};
      const hr = satRes.rows[0] || {};
      stats = {
        criticalCount: parseInt(sr.critical_count, 10) || 0,
        resolvedCount: parseInt(sr.resolved_count, 10) || 0,
        highSatisfactionCount: parseInt(hr.high_satisfaction_count, 10) || 0
      };
    } catch (statsErr) {
      console.error('[President] Dashboard stats query error:', statsErr);
    }

    // ── Recent Declarations ──
    let recentQuery = supabase
      .from('declarations')
      .select('id, ref_citoyen, title, status, description, category, created_at, citizen_id, delegation_id, priority')
      .is('deleted_at', null)
      .or('is_deleted.eq.false,is_deleted.is.null')

      .order('created_at', { ascending: false })
      .limit(8);

    let crucialQuery = supabase
      .from('declarations')
      .select('id, ref_citoyen, title, status, description, created_at, citizen_id, votes_count, priority_score, address, category, delegation_id')
      .is('deleted_at', null)
      .or('is_deleted.eq.false,is_deleted.is.null')

      .in('status', ['soumise', 'assignee_chef', 'assignee_agent', 'en_cours'])
      .order('priority_score', { ascending: false })
      .limit(8);

    if (period && period !== 'all') {
      const days = parseInt(period, 10);
      if (!isNaN(days)) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        recentQuery = recentQuery.gte('created_at', dateLimit.toISOString());
        crucialQuery = crucialQuery.gte('created_at', dateLimit.toISOString());
      }
    }
    if (status && status !== 'all') {
      recentQuery = recentQuery.eq('status', status);
      // If filtering by a resolved status, crucial cases might naturally be empty.
      crucialQuery = crucialQuery.eq('status', status);
    }
    if (department_id && department_id !== 'all') {
      recentQuery = recentQuery.eq('department_id', department_id);
      crucialQuery = crucialQuery.eq('department_id', department_id);
    }
    if (delegation_id && delegation_id !== 'all') {
      recentQuery = recentQuery.eq('delegation_id', delegation_id);
      crucialQuery = crucialQuery.eq('delegation_id', delegation_id);
    }

    const { data: recentDecl } = await recentQuery;
    const { data: crucialCases } = await crucialQuery;

    let topVotedDeclarations = [];
    try {
      const topVotedRes = await supabase.pool.query(`
        SELECT d.id, d.title, d.status, d.votes_count, d.created_at, d.citizen_id, d.category
        FROM declarations d
        WHERE 1=1 ${sqlFilter}
        ORDER BY d.votes_count DESC NULLS LAST
        LIMIT 5
      `);
      topVotedDeclarations = topVotedRes.rows || [];
    } catch (tvErr) {
      console.error('[President] topVotedDeclarations query error:', tvErr);
    }

    const { data: moneyVotes } = await supabase
      .from('propositions')
      .select('*')
      .order('votes_pour', { ascending: false })
      .limit(5);

    const citizenIds = [...new Set([
      ...(recentDecl || []).map(d => d.citizen_id),
      ...(crucialCases || []).map(d => d.citizen_id),
      ...topVotedDeclarations.map(d => d.citizen_id)
    ].filter(Boolean))];
    let citizenMap = {};
    if (citizenIds.length > 0) {
      const { data: citizens } = await supabase
        .from('users').select('id, first_name, last_name').in('id', citizenIds);
      (citizens || []).forEach(c => { citizenMap[c.id] = `${c.first_name} ${c.last_name}`.trim() || 'Anonyme'; });
    }

    const delegIds = [...new Set([
      ...(recentDecl || []).map(d => d.delegation_id),
      ...(crucialCases || []).map(d => d.delegation_id)
    ].filter(Boolean))];
    let delegMap = {};
    if (delegIds.length > 0) {
      const { data: delegs } = await supabase.from('delegations').select('id, name').in('id', delegIds);
      (delegs || []).forEach(x => { delegMap[x.id] = x.name; });
    }

    return res.status(200).json({
      success: true,
      // Aliases matching the frontend field names
      total: totalDecl || 0,
      total_declarations: totalDecl || 0,
      byStatus: byStatus,
      by_status: byStatus,
      byArrondissement: byArrondissement,
      by_arrondissement: byArrondissement,
      byDepartment: byDepartment,
      by_department: byDepartment,
      totalUsers: totalUsers || 0,
      total_users: totalUsers || 0,
      avgRating: avgRating ? parseFloat(avgRating) : 0,
      average_rating: avgRating,
      stats,
      trendData,
      recentDeclarations: (recentDecl || []).map(d => ({
        ...d,
        citizen_name: citizenMap[d.citizen_id] || 'Anonyme',
        arrondissement_name: d.delegation_id ? (delegMap[d.delegation_id] || null) : null
      })),
      crucialCases: (crucialCases || []).map(d => ({
        ...d,
        citizen_name: citizenMap[d.citizen_id] || 'Anonyme',
        arrondissement_name: d.delegation_id ? (delegMap[d.delegation_id] || null) : null
      })),
      moneyVotes: moneyVotes || [],
      topVotedDeclarations: (topVotedDeclarations || []).map(d => ({
        ...d,
        citizen_name: citizenMap[d.citizen_id] || 'Anonyme'
      }))
    });
  } catch (err) {
    console.error('[President] Dashboard error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};


/* ──────────── GET /api/president/analytics ──────────── */
exports.analytics = async (req, res) => {
  try {
    const { department_id, delegation_id, period } = req.query;
    let filter = `d.deleted_at IS NULL`;

    if (period && !isNaN(parseInt(period, 10))) {
      filter += ` AND d.created_at >= NOW() - INTERVAL '${parseInt(period, 10)} days'`;
    }
    if (department_id && /^[0-9a-f-]{36}$/i.test(department_id)) {
      filter += ` AND d.department_id = '${department_id}'`;
    }
    if (delegation_id && /^[0-9a-f-]{36}$/i.test(delegation_id)) {
      filter += ` AND d.delegation_id = '${delegation_id}'`;
    }

    // Top zones (delegation + count of open critical declarations)
    const zonesRes = await supabase.pool.query(`
      SELECT
        dg.id,
        dg.name,
        COUNT(d.id) as count,
        COUNT(d.id) FILTER (WHERE d.priority_score >= 8) as critical_count
      FROM delegations dg
      LEFT JOIN declarations d ON d.delegation_id = dg.id AND ${filter}
      GROUP BY dg.id, dg.name
      ORDER BY count DESC
    `);

    // Agent workload
    const agentRes = await supabase.pool.query(`
      SELECT
        u.id, u.first_name, u.last_name,
        COUNT(d.id) FILTER (WHERE d.status = 'en_cours') as active,
        COUNT(d.id) FILTER (WHERE d.status IN ('resolue','cloturee')) as resolved
      FROM users u
      LEFT JOIN declarations d ON d.agent_id = u.id AND ${filter}
      WHERE u.role = 'agent' AND u.is_active = true
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY active DESC
      LIMIT 10
    `);

    return res.status(200).json({
      success: true,
      zones: zonesRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        count: parseInt(r.count, 10),
        critical_count: parseInt(r.critical_count, 10),
      })),
      agents: agentRes.rows,
    });
  } catch (err) {
    console.error('[President] analytics error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};


/* ──────────── GET /api/president/export ──────────── */
exports.exportData = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    const { data, error } = await supabase
      .from('declarations')
      .select('ref_citoyen, ref_service, title, category, status, delegation_id, department_id, created_at, assigned_at, resolved_at')
      .is('deleted_at', null)

      .order('created_at', { ascending: false });

    if (error) {
      console.error('[President] Export error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    if (format === 'csv') {
      const headers = ['ref_citoyen', 'ref_service', 'title', 'category', 'status', 'delegation_id', 'department_id', 'created_at', 'assigned_at', 'resolved_at'];
      const csvRows = [headers.join(',')];

      (data || []).forEach(row => {
        csvRows.push(headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','));
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=declarations_export.csv');
      return res.status(200).send(csvRows.join('\n'));
    }

    return res.status(200).json({ data });
  } catch (err) {
    console.error('[President] Export error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PATCH /api/president/departments/:id/status ──────────── */
exports.updateDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabase
      .from('services')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    console.error('[President] Update department status error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/president/departments ──────────── */
exports.createDepartment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name_fr, name_ar, name_en, code, description } = req.body;

    const { data: existing } = await supabase
      .from('services')
      .select('id')
      .eq('code', code.toUpperCase().trim())
      .maybeSingle();

    if (existing) return res.status(409).json({ error: 'Ce code de département existe déjà.' });

    const { data: dept, error } = await supabase
      .from('services')
      .insert({
        name_fr: name_fr.trim(),
        name_ar: name_ar?.trim() || null,
        name_en: name_en?.trim() || null,
        code: code.toUpperCase().trim(),
        description: description?.trim() || null,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[President] CreateDept error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la création du département.' });
    }

    return res.status(201).json({ department: dept });
  } catch (err) {
    console.error('[President] CreateDept error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PATCH /api/president/departments/:id ──────────── */
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name_fr, name_ar, name_en, description } = req.body;

    const updates = {};
    if (name_fr !== undefined) updates.name_fr = name_fr.trim();
    if (name_ar !== undefined) updates.name_ar = name_ar?.trim() || null;
    if (name_en !== undefined) updates.name_en = name_en?.trim() || null;
    if (description !== undefined) updates.description = description?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour.' });
    }

    // Check name uniqueness if name_fr is changing
    if (updates.name_fr) {
      const { data: existing } = await supabase
        .from('services')
        .select('id')
        .eq('name_fr', updates.name_fr)
        .neq('id', id)
        .maybeSingle();
      if (existing) {
        return res.status(409).json({ error: 'Un service avec ce nom existe déjà.' });
      }
    }

    const { data: dept, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[President] UpdateDept error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }

    return res.status(200).json({ department: dept, success: true });
  } catch (err) {
    console.error('[President] UpdateDept error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── DELETE /api/president/departments/:id ──────────── */
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    /* Block deletion if active (non-resolved) declarations exist */
    const { data: activeDecls } = await supabase
      .from('declarations')
      .select('id')
      .eq('department_id', id)
      .is('deleted_at', null)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .not('status', 'in', '(resolue,cloturee,refusee_chef,refusee_agent)')
      .limit(1)
      .maybeSingle();

    if (activeDecls)
      return res.status(409).json({
        error: 'Impossible de supprimer ce service : des déclarations actives lui sont encore assignées.',
      });

    /* Detach agents and chefs from this department before deleting */
    await supabase
      .from('users')
      .update({ department_id: null })
      .eq('department_id', id);

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[President] DeleteDept error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }

    console.log(`[President] Department ${id} deleted.`);
    return res.status(200).json({ success: true, message: 'Service supprimé.' });
  } catch (err) {
    console.error('[President] DeleteDept error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/president/propositions/:id/confirmer ──────────── */
exports.confirmProposition = async (req, res) => {
  try {
    const { id } = req.params;
    const { president_note } = req.body;
    const { data, error } = await supabase.from('propositions')
      .update({
        status: 'active',
        president_response: president_note ? `[CONFIRMÉ] ${president_note}` : '[CONFIRMÉ]',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id).select('*').single();
    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[President] confirmProposition error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/president/propositions/:id/retenu ──────────── */
exports.retainProposition = async (req, res) => {
  try {
    const { id } = req.params;
    const { president_note } = req.body;
    const { data, error } = await supabase.from('propositions')
      .update({
        status: 'closed',
        president_response: president_note ? `[RETENU] ${president_note}` : '[RETENU]',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id).select('*').single();
    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[President] retainProposition error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/president/declarations/:id/comments ──────────── */
exports.listComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { channel } = req.query; // 'president_chef' | 'chef_agent' | 'agent_citizen'

    // Verify declaration exists
    const { data: decl } = await supabase
      .from('declarations')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)

      .single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });

    let query = supabase
      .from('internal_comments')
      .select('*')
      .eq('declaration_id', id)
      .order('created_at', { ascending: true });

    if (channel) query = query.eq('channel', channel);

    let { data, error } = await query;
    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    // Enrich with user info
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(d => d.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users').select('id, first_name, last_name, role').in('id', userIds);
        const userMap = {};
        if (usersData) usersData.forEach(u => userMap[u.id] = u);
        data = data.map(d => ({ ...d, user: userMap[d.user_id] || null }));
      }
    }

    return res.status(200).json({ comments: data || [] });
  } catch (err) {
    console.error('[President] listComments error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/president/declarations/:id/comments ──────────── */
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, channel = 'president_chef' } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Contenu requis.' });
    }

    // Only president can write to president_chef channel
    const allowedChannels = ['president_chef'];
    if (!allowedChannels.includes(channel)) {
      return res.status(403).json({ error: 'Canal non autorisé pour ce rôle.' });
    }

    const { data: decl } = await supabase
      .from('declarations')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)

      .single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });

    const { data: comment, error } = await supabase
      .from('internal_comments')
      .insert({
        declaration_id: id,
        user_id: req.user.id,
        content: content.trim(),
        channel: channel
      })
      .select('*')
      .single();

    if (error) {
      // If 'channel' column doesn't exist yet, insert without it
      if (error.code === '42703') {
        const { data: c2, error: e2 } = await supabase
          .from('internal_comments')
          .insert({ declaration_id: id, user_id: req.user.id, content: content.trim() })
          .select('*').single();
        if (e2) return res.status(500).json({ error: 'Erreur serveur.' });
        return res.status(201).json({ comment: { ...c2, channel: 'president_chef' } });
      }
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    return res.status(201).json({ comment });
  } catch (err) {
    console.error('[President] addComment error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PATCH /api/president/propositions/:id/respond ──────────── */
exports.respondToProposition = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, president_response } = req.body;
    const validDecisions = ['a_discuter', 'confirme', 'retenu', 'refuse'];
    if (!validDecisions.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide.' });
    }
    const dbStatus = (status === 'a_discuter' || status === 'confirme') ? 'active' : 'closed';
    const { data, error } = await supabase
      .from('propositions')
      .update({
        status: dbStatus,
        president_response: president_response
          ? `[${status.toUpperCase()}] ${president_response}`
          : `[${status.toUpperCase()}]`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id).select('*').single();
    if (error) throw error;
    return res.status(200).json({ success: true, decision: status, proposition: data });
  } catch (err) {
    console.error('[President] respondToProposition error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/president/propositions/:id/summary ──────────── */
exports.getPropositionSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.rpc('get_proposition_summary', { p_proposition_id: id });
    if (error) throw error;
    return res.status(200).json({ success: true, summary: data[0] || null });
  } catch (err) {
    console.error('[President] getPropositionSummary error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── DELETE /api/president/declarations/:id ──────────── */
exports.deleteDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    // 1. Nettoyage des commentaires internes
    await supabase.from('internal_comments').delete().eq('declaration_id', id);
    // 2. Suppression de la déclaration
    const { error } = await supabase.from('declarations').delete().eq('id', id);
    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Signalement supprimé.' });
  } catch (err) {
    console.error('[President] deleteDeclaration error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/president/declarations/bulk-delete ──────────── */
exports.bulkDeleteDeclarations = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'Liste d\'identifiants requise.' });
    await supabase.from('internal_comments').delete().in('declaration_id', ids);
    const { error } = await supabase.from('declarations').delete().in('id', ids);
    if (error) throw error;
    return res.status(200).json({ success: true, message: `${ids.length} signalements supprimés.` });
  } catch (err) {
    console.error('[President] bulkDelete error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }

};

/* ──────────── POST /api/president/declarations/:id/recalculate-priority ──────────── */
exports.recalculateDeclarationPriority = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the declaration
    const { data: decl, error: declErr } = await supabase
      .from('declarations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (declErr || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    }

    // Import the priority computation service
    const { computePriorityScore } = require('../services/priority.service');

    // Compute new priority
    const priority = await computePriorityScore(decl);

    // Update the declaration with new priority values
    const { error: updateErr } = await supabase
      .from('declarations')
      .update({
        priority_score:  priority.score,
        priority_label:  priority.level,
        priority_method: priority.source,
        priority_meta:   {
          factors: priority.factors,
          ai_description: priority.ai_description,
          ai_danger_level: priority.ai_danger_level,
        },
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    return res.status(200).json({
      success: true,
      data: {
        priority_score:  priority.score,
        priority_label:  priority.level,
        priority_method: priority.source,
        priority_meta: {
          factors: priority.factors,
          ai_description: priority.ai_description,
          ai_danger_level: priority.ai_danger_level,
        },
      },
    });
  } catch (err) {
    console.error('[President] recalculateDeclarationPriority error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};