const supabase = require('../config/db');
const { validationResult } = require('express-validator');

// GET /api/tasks?declaration_id=...
exports.list = async (req, res) => {
  try {
    const { declaration_id } = req.query;
    let query = supabase.from('tasks').select('*, assigned_user:users(id, first_name, last_name), declaration:declarations(id, title, ref_citoyen, category)');
    
    if (declaration_id) query = query.eq('declaration_id', declaration_id);
    
    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;
    
    return res.json(data);
  } catch (err) {
    console.error('[Tasks] List error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// POST /api/tasks
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { declaration_id, title, description, assigned_to, due_date } = req.body;
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        declaration_id,
        title,
        description,
        assigned_to,
        due_date,
        status: 'todo'
      })
      .select()
      .single();
      
    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    console.error('[Tasks] Create error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// PATCH /api/tasks/:id
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, description, status, assigned_to, due_date } = req.body;
    
    const { data, error } = await supabase
      .from('tasks')
      .update({
        title,
        description,
        status,
        assigned_to,
        due_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[Tasks] Update error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// DELETE /api/tasks/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    return res.status(204).send();
  } catch (err) {
    console.error('[Tasks] Delete error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
