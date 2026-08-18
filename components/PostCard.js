'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import ProtectedMedia from './ProtectedMedia';

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

export default function PostCard({ post }) {
  const router = useRouter();
  const [reactionCounts, setReactionCounts] = useState({});
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    loadReactions();
  }, []);

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
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    setComments(data || []);
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
    loadReactions();
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const user = await requireSession();
    if (!user) return;

    await supabase.from('comments').insert({
      post_id: post.id,
      user_id: user.id,
      content: newComment,
    });
    setNewComment('');
    loadComments();
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
      </div>

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
      </div>

      {notice && <p className="login-prompt">{notice} <a href="/login">Iniciar sesión</a></p>}

      <button className="comment-toggle" onClick={toggleComments}>
        {showComments ? '— Ocultar comentarios' : `Ver comentarios (${comments.length || ''})`}
      </button>

      {showComments && (
        <div className="comments-section">
          {comments.length === 0 && <p className="hint-text">Sé el primero en comentar.</p>}
          {comments.map((c) => (
            <p key={c.id} className="comment-item">{c.content}</p>
          ))}
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
