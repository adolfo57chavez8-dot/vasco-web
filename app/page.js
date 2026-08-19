'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import PostCard from '../components/PostCard';

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('deleted', false)
      .eq('hidden', false)
      .order('created_at', { ascending: false });

    if (error || !data) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(data.map((p) => p.user_id).filter(Boolean))];
    let profileMap = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    }

    setPosts(data.map((p) => ({ ...p, author: profileMap[p.user_id] || null })));
    setLoading(false);
  };

  return (
    <div className="feed-page">
      <div className="page-header feed-header">
        <span className="page-eyebrow">En vivo</span>
        <h1>Feed</h1>
        <p className="page-subtitle">Lo último de la comunidad, minuto a minuto.</p>
      </div>

      {loading && (
        <div className="state-block"><div className="state-title">Cargando...</div></div>
      )}

      {!loading && posts.length === 0 && (
        <div className="state-block">
          <div className="state-title">Todavía no hay publicaciones</div>
          <p>Sé el primero en compartir algo en <a href="/upload">Publicar</a>.</p>
        </div>
      )}

      <div className="feed-list">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onPostChanged={loadPosts} />
        ))}
      </div>
    </div>
  );
}





