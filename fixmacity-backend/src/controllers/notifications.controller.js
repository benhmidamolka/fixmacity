'use strict';

const supabase = require('../config/db');

/* ──────────── GET /api/notifications ──────────── */
exports.listNotifications = async (req, res) => {
  try {
    const { unreadOnly, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let q = supabase.from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (unreadOnly === 'true') {
      q = q.eq('is_read', false);
    }

    const { data: notifications, count, error } = await q;

    if (error) return res.status(500).json({ error: 'Erreur lors du chargement des notifications.' });

    // Also get unread count
    const { count: unreadCount, error: unreadError } = await supabase.from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (unreadError) console.error('[Notifications] Unread count error:', unreadError);
    
    return res.status(200).json({ 
      notifications, 
      total: count, 
      unreadCount: unreadCount || 0,
      page: +page, 
      limit: +limit 
    });
  } catch (err) {
    console.error('[Notifications] List error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PUT /api/notifications/:id/read ──────────── */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: notification, error } = await supabase.from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', req.user.id) // security check ensuring user owns it
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: 'Erreur lors de la mise à jour de la notification.' });
    if (!notification) return res.status(404).json({ error: 'Notification introuvable.' });

    return res.status(200).json({ notification });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PUT /api/notifications/read-all ──────────── */
exports.markAllAsRead = async (req, res) => {
  try {
    const { error } = await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });

    return res.status(200).json({ message: 'Toutes les notifications marquées comme lues.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
/* ──────────── GET /api/notifications/unread-count ──────────── */
exports.getUnreadCount = async (req, res) => {
  try {
    const { count, error } = await supabase.from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) {
      console.error('[Notifications] Count error:', error);
      return res.status(500).json({ error: 'Erreur lors du comptage.' });
    }

    return res.status(200).json({ count: count || 0 });
  } catch (err) {
    console.error('[Notifications] Unread count exception:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
