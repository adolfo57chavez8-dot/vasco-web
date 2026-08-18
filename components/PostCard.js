'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import ProtectedMedia from './ProtectedMedia';
import PostOptionsMenu from './PostOptionsMenu';

const REACTIONS = [
  { type: 'like', emoji: '👍' },
  { type: 'love', emoji: '❤️' },
  { type: 'haha', emoji: '😂' },
  { type: 'wow', emoji: '😮' },
  { type: 'sad', emoji: '😢' },
];

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

// Organiza comentarios planos en árbol: comentarios de primer nivel + sus respuestas
function buildCommentTree(flatComments) {
  const byId = {};
  flatComments.forEach((c) => { byId[c.id] = { ...c, replies: [] }; });
  const roots = [];
  flatComments.forEach((c) => {
    if (c.parent_comment_id && byId[c.parent_comment_id]) {
      byId[c.parent_comment_id].replies.push(byId[c.id]);
    } else {
      roots.push(byId[c.id]);
    }
  });
  return roots;
}

export default function PostCard({ post, currentUserId, onSaveChange, onPostChanged }) {
  const router = useRouter();
  const [reactionCounts, setReactionCounts] = useState({});
  const [totalReactions, setTotalReactions] = useState(0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [notice, setNotice] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [authorMap, setAuthorMap] = useState({});
  const [saved, setSaved] = useState(false);
  const [viewerId, setViewerId] = useState(currentUserId || null);

  useEffect(() => {
    loadReactions();
    resolveViewer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveViewer = async () => {
    if (currentUserId) {
      setViewerId(currentUserId);
      checkSaved(currentUserId);
      return;
    }
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id || null;
    setViewerId(uid);
    if (uid) checkSaved(uid);
  };

  const loadReactions = async () => {
    const { data } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('post_id', post.id);

    const counts = {};
    (data || []).forEach((r) => {
      counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
    });
    setReactionCounts(counts);
    setTotalReactions((data || []).length);
  };

  const checkSaved = async (uid) => {
    const { data } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', uid)
      .maybeSingle();
    setSaved(!!data);
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id, parent_comment_id')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    const list = data || [];
    const userIds = [...new Set(list.map((c) => c.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      setAuthorMap(Object.fromEntries((profiles || []).map((p) => [p.id, p])));
    }
    setComments(list);
  };

  const toggleComments = () => {
    setShowComments(!showComments);
    if (!showComments) loadComments();
  };

  const requireSession = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setNotice('Inicia sesión para participar.');
      return null;
    }
    setNotice('');
    return userData.user;
  };

  const react = async (type) => {
    const user = await requireSession();
    if (!user) return;

    await supabase.from('reactions').insert({
      post_id: post.id,
      user_id: user.id,
      reaction_type: type,
    });

    if (post.user_id && post.user_id !== user.id) {
      await supabase.from('notifications').insert({
        recipient_id: post.user_id,
        actor_id: user.id,
        post_id: post.id,
        type: 'reaction',
        reaction_type: type,
      });
    }

    loadReactions();
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const user = await requireSession();
    if (!user) return;

    const { data: inserted, error } = await supabase
      .from('comments')
      .insert({ post_id: post.id, user_id: user.id, content: newComment })
      .select()
      .single();

    if (!error && inserted && post.user_id && post.user_id !== user.id) {
      await supabase.from('notifications').insert({
        recipient_id: post.user_id,
        actor_id: user.id,
        post_id: post.id,
        comment_id: inserted.id,
        type: 'comment',
        content: newComment,
      });
    }

    setNewComment('');
    loadComments();
  };

  const submitReply = async (parentId) => {
    if (!replyText.trim()) return;
    const user = await requireSession();
    if (!user) return;

    const { error } = await supabase
      .from('comments')
      .insert({ post_id: post.id, user_id: user.id, content: replyText, parent_comment_id: parentId });

    if (!error) {
      const parentAuthorId = comments.find((c) => c.id === parentId)?.user_id;
      if (parentAuthorId && parentAuthorId !== user.id) {
        await supabase.from('notifications').insert({
          recipient_id: parentAuthorId,
          actor_id: user.id,
          post_id: post.id,
          comment_id: parentId,
          type: 'reply',
          content: replyText,
        });
      }
    }

    setReplyText('');
    setReplyTo(null);
    loadComments();
  };

  const toggleSave = async () => {
    const user = await requireSession();
    if (!user) return;

    if (saved) {
      await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', user.id);
      setSaved(false);
    } else {
      await supabase.from('saved_posts').insert({ post_id: post.id, user_id: user.id });
      setSaved(true);
    }
    if (onSaveChange) onSaveChange();
  };

  const commentTree = buildCommentTree(comments);

  const renderComment = (c, depth = 0) => {
    const author = authorMap[c.user_id];
    const name = author?.username || 'usuario';
    return (
      <div key={c.id} style={{ marginLeft: depth ? 18 : 0 }}>
        <div className="comment-item">
          <span className="comment-author">@{name}</span> {c.content}
        </div>
        <button
          type="button"
          className="comment-reply-toggle"
          onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
        >
          Responder
        </button>
        {replyTo === c.id && (
          <div className="comment-form" style={{ marginTop: '0.4rem', marginBottom: '0.4rem' }}>
            <input
              className="input"
              placeholder={`Responder a @${name}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <button type="button" className="btn btn-primary" onClick={() => submitReply(c.id)}>
              Enviar
            </button>
          </div>
        )}
        {c.replies?.map((r) => renderComment(r, depth + 1))}
      </div>
    );
  };

  const authorName = post.author?.username || 'usuario';

  return (
    <div className="card post-card">
      <div className="post-author">
        {post.author?.avatar_url ? (
          <img
            src={post.author.avatar_url}
            alt={authorName}
            style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--text-muted)',
            }}
          >
            {authorName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div className="post-author-name">@{authorName}</div>
          <div className="post-author-time">{timeAgo(post.created_at)}</div>
        </div>

        {viewerId && post.user_id === viewerId && (
          <PostOptionsMenu
            post={post}
            onChanged={() => onPostChanged && onPostChanged(post.id)}
          />
        )}
      </div>

      {post.hidden && (
        <p className="hint-text post-hidden-note">🙈 Solo tú ves esta publicación (está oculta).</p>
      )}

      {post.description && <p className="post-description">{post.description}</p>}

      {(post.content_type === 'foto' || post.content_type === 'video') && post.file_url && (
        <ProtectedMedia
          type={post.content_type === 'video' ? 'video' : 'image'}
          src={post.file_url}
          alt={post.description}
          username={authorName}
        />
      )}

      <div className="reaction-bar">
        {REACTIONS.map(({ type, emoji }) => (
          <button key={type} className="reaction-btn" onClick={() => react(type)}>
            <span>{emoji}</span>
            {reactionCounts[type] ? <span className="reaction-count">{reactionCounts[type]}</span> : null}
          </button>
        ))}
        <button
          className={`reaction-btn save-btn${saved ? ' saved' : ''}`}
          onClick={toggleSave}
          title={saved ? 'Quitar de Colección' : 'Guardar en Colección'}
        >
          <span>{saved ? '🔖' : '📑'}</span>
        </button>
      </div>

      {totalReactions > 0 && (
        <p className="reaction-total">{totalReactions} reacción{totalReactions === 1 ? '' : 'es'} en total</p>
      )}

      {notice && <p className="login-prompt">{notice} <a href="/login">Iniciar sesión</a></p>}

      <button className="comment-toggle" onClick={toggleComments}>
        {showComments ? '— Ocultar comentarios' : `Ver comentarios (${comments.length || ''})`}
      </button>

      {showComments && (
        <div className="comments-section">
          {comments.length === 0 && <p className="hint-text">Sé el primero en comentar.</p>}
          {commentTree.map((c) => renderComment(c))}
          <form onSubmit={submitComment} className="comment-form">
            <input
              className="input"
              placeholder="Escribe un comentario..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">Enviar</button>
          </form>
        </div>
      )}
    </div>
  );
}
