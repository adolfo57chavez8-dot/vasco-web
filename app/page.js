'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import PostCard from '../components/PostCard';
import { getFileNameFromUrl } from '../lib/media';

export default function FeedPage() {
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').trim().toLowerCase();
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

    const enriched = data.map((p) => ({ ...p, author: profileMap[p.user_id] || null }));
    setPosts(enriched);
    setLoading(false);
  };

  const filteredPosts = useMemo(() => {
    if (!query) return posts;
    return posts.filter((post) => {
      const haystack = [
        post.description,
        post.author?.username,
        getFileNameFromUrl(post.file_url),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [posts, query]);

  return (
    <div>
      <div className="page-header feed-header">
        <span className="page-eyebrow">En vivo</span>
        <h1>{query ? 'Buscar' : 'Feed'}</h1>
        <p className="page-subtitle">
          {query ? `Resultados para “${query}”.` : 'Lo último de la comunidad, minuto a minuto.'}
        </p>
      </div>

      {loading && (
        <div className="state-block">
          <div className="state-title">Cargando...</div>
        </div>
      )}

      {!loading && filteredPosts.length === 0 && (
        <div className="state-block">
          <div className="state-title">{query ? 'No encontramos resultados' : 'Todavía no hay publicaciones'}</div>
          <p>{query ? 'Prueba con otro nombre de archivo, usuario o palabra.' : <>Sé el primero en compartir algo en <a href="/upload">Publicar</a>.</>}</p>
        </div>
      )}

      {filteredPosts.map((post) => (
        <PostCard key={post.id} post={post} onPostChanged={loadPosts} />
      ))}
    </div>
  );
}




