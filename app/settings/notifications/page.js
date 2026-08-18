'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const STORAGE_KEY = 'vasco_notifications_enabled';

const REACTION_EMOJI = { like: '👍', love: '❤️', haha: '😂', wow: '😮', sad: '😢' };

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export default function NotificationsPage() {
  const [enabled, setEnabled] = useState(true);
  const [userId, setUserId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyOpenId, setReplyOpenId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored !== null) setEnabled(stored === 'true');
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, String(next));
  };

  const loadNotifications = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setUserId(null);
      setLoading(false);
      return;
    }
    setUserId(userData.user.id);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      setItems([]);
      setLoading(false);
      return;
    }

    const actorIds = [...new Set(data.map((n) => n.actor_id).filter(Boolean))];
    const postIds = [...new Set(data.map((n) => n.post_id).filter(Boolean))];

    const [{ data: actors }, { data: posts }] = await Promise.all([
      actorIds.length
        ? supabase.from('profiles').select('id, username, avatar_url').in('id', actorIds)
        : Promise.resolve({ data: [] }),
      postIds.length
        ? supabase.from('posts').select('id, file_url, content_type, description').in('id', postIds)
        : Promise.resolve({ data: [] }),
    ]);

    const actorMap = Object.fromEntries((actors || []).map((a) => [a.id, a]));
    const postMap = Object.fromEntries((posts || []).map((p) => [p.id, p]));

    const enriched = data.map((n) => ({
      ...n,
      actor: actorMap[n.actor_id] || null,
      post: postMap[n.post_id] || null,
    }));

    setItems(enriched);
    setLoading(false);

    const unreadIds = data.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    }
  };

  const submitReply = async (n) => {
    if (!replyText.trim() || !userId) return;
    setSending(true);

    // Responder desde una notificación de comentario/respuesta continúa
    // ese mismo hilo (parent_comment_id apunta al comentario original).
    const parentCommentId = n.comment_id || null;

    const { error } = await supabase.from('comments').insert({
      post_id: n.post_id,
      user_id: userId,
      content: replyText,
      parent_comment_id: parentCommentId,
    });

    if (!error && n.actor_id && n.actor_id !== userId) {
      await supabase.from('notifications').insert({
        recipient_id: n.actor_id,
        actor_id: userId,
        post_id: n.post_id,
        comment_id: parentCommentId,
        type: 'reply',
        content: replyText,
      });
    }

    setSending(false);
    setReplyText('');
    setReplyOpenId(null);
  };

  const describe = (n) => {
    const name = n.actor?.username || 'alguien';
    if (n.type === 'reaction') {
      return `@${name} reaccionó ${REACTION_EMOJI[n.reaction_type] || '👍'} a tu publicación`;
    }
    if (n.type === 'reply') {
      return `@${name} respondió tu comentario: "${n.content || ''}"`;
    }
    return `@${name} comentó: "${n.content || ''}"`;
  };

  if (loading) {
    return (
      <div className="state-block">
        <div className="state-title">Cargando...</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="state-block">
        <div className="state-title">Inicia sesión para ver tus notificaciones</div>
        <p><a href="/login">Ir a iniciar sesión</a></p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <span className="page-eyebrow">Cuenta</span>
        <h1>Notificaciones</h1>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="settings-row">
          <div>
            <div className="settings-row-title">Avisos en este dispositivo</div>
            <p className="hint-text">Preferencia guardada solo en este navegador.</p>
          </div>
          <button className="btn btn-ghost" onClick={toggle}>
            {enabled ? 'Activadas' : 'Desactivadas'}
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <div className="state-block">
          <div className="state-title">Todavía no tienes notificaciones</div>
          <p>Cuando alguien reaccione, comente o responda tus publicaciones, aparecerá aquí.</p>
        </div>
      )}

      <div className="notif-list">
        {items.map((n) => (
          <div key={n.id} className={`card notif-item${n.read ? '' : ' unread'}`}>
            <div className="notif-row">
              {n.actor?.avatar_url ? (
                <img src={n.actor.avatar_url} alt={n.actor.username || ''} className="notif-avatar" />
              ) : (
                <div className="notif-avatar notif-avatar-placeholder">
                  {(n.actor?.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="notif-body">
                <p className="notif-text">{describe(n)}</p>
                <span className="post-author-time">{timeAgo(n.created_at)}</span>
              </div>
              {n.post?.file_url && (
                n.post.content_type === 'video' ? (
                  <video src={n.post.file_url} className="notif-thumb" muted />
                ) : (
                  <img src={n.post.file_url} alt="" className="notif-thumb" />
                )
              )}
            </div>

            {(n.type === 'comment' || n.type === 'reply') && (
              <div className="notif-actions">
                <button
                  type="button"
                  className="comment-reply-toggle"
                  onClick={() => setReplyOpenId(replyOpenId === n.id ? null : n.id)}
                >
                  Responder
                </button>
                {replyOpenId === n.id && (
                  <div className="comment-form" style={{ marginTop: '0.4rem' }}>
                    <input
                      className="input"
                      placeholder={`Responder a @${n.actor?.username || 'usuario'}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={sending}
                      onClick={() => submitReply(n)}
                    >
                      Enviar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

