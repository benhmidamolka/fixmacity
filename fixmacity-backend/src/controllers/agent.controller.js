'use strict';

const supabase = require('../config/db');
const path = require('path');
const fs = require('fs');
const { validationResult } = require('express-validator');
const { logStatusChange } = require('../services/statusHistory.service');
const { notifyStatusChange } = require('../services/notification.service');

// Where photos are saved on disk
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ──────────── GET /api/agent/declarations ──────────── */
exports.listDeclarations = async (req, res) => {
  try {
    const deptId = req.user.department_id;
    if (!deptId) return res.status(400).json({ error: 'Aucun département associé.' });

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let q = supabase.from('declarations')
      .select('*', { count: 'exact' })
      .eq('department_id', deptId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) q = q.eq('status', status);

    const { data, error, count } = await q;
    if (error) return res.status(500).json({ error: 'Erreur serveur.' });
    return res.status(200).json({ declarations: data, total: count, page: +page, limit: +limit });
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/agent/declarations/:id/accept ──────────── */
exports.acceptDeclaration = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: decl } = await supabase.from('declarations')
      .select('id, status, department_id')
      .eq('id', id).is('deleted_at', null).single();

    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id)
      return res.status(403).json({ error: 'Hors département.' });
    if (decl.status !== 'assignee_agent')
      return res.status(400).json({ error: 'Statut invalide pour acceptation agent.' });

    const { data: updated, error } = await supabase.from('declarations')
      .update({ status: 'en_cours', agent_id: req.user.id, started_at: new Date().toISOString() })
      .eq('id', id).select('*').single();

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    await logStatusChange(id, 'assignee_agent', 'en_cours', req.user.id);
    await notifyStatusChange(req.app, updated, updated.user_id, 'en_cours').catch(() => { });

    return res.status(200).json({ declaration: updated });
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/agent/declarations/:id/refuse ──────────── */
exports.refuseDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim())
      return res.status(400).json({ error: 'Le motif de refus est obligatoire.' });

    const { data: decl } = await supabase.from('declarations')
      .select('id, status, department_id')
      .eq('id', id).is('deleted_at', null).single();

    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id)
      return res.status(403).json({ error: 'Hors département.' });
    if (decl.status !== 'assignee_agent')
      return res.status(400).json({ error: 'Statut invalide pour refus agent.' });

    const { data: updated, error } = await supabase.from('declarations')
      .update({ status: 'refusee_agent' }).eq('id', id).select('*').single();

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    await logStatusChange(id, 'assignee_agent', 'refusee_agent', req.user.id, reason.trim());
    await notifyStatusChange(req.app, updated, updated.user_id, 'refusee_agent').catch(() => { });

    return res.status(200).json({ declaration: updated });
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/agent/declarations/:id/photo ──────────── */
exports.uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;

    // ── Validate declaration ──────────────────────────────────
    const { data: decl } = await supabase.from('declarations')
      .select('id, department_id, status')
      .eq('id', id).is('deleted_at', null).single();

    if (!decl)
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id)
      return res.status(403).json({ error: 'Hors département.' });
    if (decl.status !== 'en_cours')
      return res.status(400).json({
        error: 'Les photos ne peuvent être téléversées que lorsque la déclaration est en cours.',
      });

    // ── Check file was received ───────────────────────────────
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier envoyé.' });
    }

    // ── Write buffer to disk ──────────────────────────────────
    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // ── AI Verification ─────────────────────────────────────────
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const imagePart = {
        inlineData: {
          data: req.file.buffer.toString('base64'),
          mimeType: req.file.mimetype || 'image/jpeg'
        }
      };
      const result = await model.generateContent(["Respond with a single word: 'YES' if the urban issue (e.g., pothole, trash, broken light) appears fully repaired or cleared, and 'NO' otherwise.", imagePart]);
      if (!result.response.text().toUpperCase().includes('YES')) {
        return res.status(400).json({ error: "L'IA a rejeté la photo : le problème ne semble pas être résolu (Réponse: NO)." });
      }
    } catch (aiErr) {
      console.error('[Gemini Verification Error]', aiErr.message);
      return res.status(500).json({ error: 'Erreur lors de la vérification IA de la photo.' });
    }

    fs.writeFileSync(filepath, req.file.buffer);

    const baseUrl = (process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');
    const url = `${baseUrl}/uploads/${filename}`;
    const public_id = `local/${filename}`;

    // ── Save to DB ────────────────────────────────────────────
    const { error: dbErr } = await supabase.from('declaration_photos').insert({
      declaration_id: id,
      url,
      public_id,
      uploaded_by: req.user.id,
    });

    if (dbErr) {
      // Clean up saved file if DB insert fails
      try { fs.unlinkSync(filepath); } catch (_) { }
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    return res.status(201).json({
      message: 'Photo téléversée.',
      photo: { url, public_id },
    });
  } catch (e) {
    console.error('[UploadPhoto]', e.message);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/agent/declarations/:id/resolve ──────────── */
exports.resolveDeclaration = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: decl } = await supabase.from('declarations')
      .select('id, status, department_id')
      .eq('id', id).is('deleted_at', null).single();

    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id)
      return res.status(403).json({ error: 'Hors département.' });
    if (decl.status !== 'en_cours')
      return res.status(400).json({ error: 'Statut invalide pour résolution.' });

    const { count: photoCount } = await supabase.from('declaration_photos')
      .select('id', { count: 'exact', head: true })
      .eq('declaration_id', id);

    if (!photoCount || photoCount === 0)
      return res.status(403).json({
        error: "Impossible de résoudre : aucune photo preuve n'a été téléversée.",
      });

    const { data: updated, error } = await supabase.from('declarations')
      .update({ status: 'resolue', resolved_at: new Date().toISOString() })
      .eq('id', id).select('*').single();

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    await logStatusChange(id, 'en_cours', 'resolue', req.user.id);
    await notifyStatusChange(req.app, updated, updated.user_id, 'resolue').catch(() => { });

    return res.status(200).json({ declaration: updated });
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/agent/declarations/:id/comments ──────────── */
exports.listComments = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: decl } = await supabase.from('declarations')
      .select('department_id').eq('id', id).is('deleted_at', null).single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id)
      return res.status(403).json({ error: 'Hors département.' });

    const { data: comments, error } = await supabase.from('internal_comments')
      .select('*')
      .eq('declaration_id', id)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    if (comments && comments.length > 0) {
      const userIds = [...new Set(comments.map(c => c.user_id))];
      const { data: users } = await supabase.from('users')
        .select('id, first_name, last_name, role').in('id', userIds);
      const userMap = {};
      (users || []).forEach(u => { userMap[u.id] = u; });
      comments.forEach(c => { c.users = userMap[c.user_id] || null; });
    }

    return res.status(200).json({ comments: comments || [] });
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/agent/declarations/:id/comments ──────────── */
exports.addComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { content } = req.body;

    const { data: decl } = await supabase.from('declarations')
      .select('department_id').eq('id', id).is('deleted_at', null).single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id)
      return res.status(403).json({ error: 'Hors département.' });

    const { data: comment, error } = await supabase.from('internal_comments')
      .insert({ declaration_id: id, user_id: req.user.id, content: content.trim() })
      .select('*').single();

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });
    return res.status(201).json({ comment });
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};