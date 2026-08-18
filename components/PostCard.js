'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const REACTIONS = ['like', 'love', 'haha', 'wow', 'sad'];

export default function PostCard({ post }) {
  const [reactionCounts, setReactionCounts] = useState({});
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);

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

  const react = async (type) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    await supabase.from('reactions').insert({
      post_id: post.id,
      user_id: userData.user.id,
      reaction_type: type,
    });
    loadReactions();
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    await supabase.from('comments').insert({
      post_id: post.id,
      user_id: userData.user.id,
      content: newComment,
    });
    setNewComment('');
    loadComments();
  };

  return (
    <div style={{ border: '1px solid #334155', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
      {post.description && <p>{post.description}</p>}

      {post.content_type === 'foto' && post.file_url && (
        <img src={post.file_url} alt="" style={{ width: '100%', borderRadius: 6 }} />
      )}
      {post.content_type === 'video' && post.file_url && (
        <video src={post.file_url} controls style={{ width: '100%', borderRadius: 6 }} />
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        {REACTIONS.map((type) => (
          <button key={type} onClick={() => react(type)}>
            {type} {reactionCounts[type] ? `(${reactionCounts[type]})` : ''}
          </button>
        ))}
      </div>

      <button onClick={toggleComments} style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: '#38bdf8' }}>
        {showComments ? 'Ocultar comentarios' : 'Ver comentarios'}
      </button>

      {showComments && (
        <div style={{ marginTop: '0.5rem' }}>
          {comments.map((c) => (
            <p key={c.id} style={{ borderTop: '1px solid #334155', paddingTop: '0.4rem' }}>
              {c.content}
            </p>
          ))}
          <form onSubmit={submitComment} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              placeholder="Escribe un comentario..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit">Enviar</button>
          </form>
        </div>
      )}
    </div>
  );
}
