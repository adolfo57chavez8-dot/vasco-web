'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import PostCard from '../../../components/PostCard';

export default function PublicProfilePage() {
  const params = useParams();
  const username = decodeURIComponent(params.username);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadPublicProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const loadPublicProfile = async () => {
    setLoading(true);
    setNotFound(false);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (profileError || !profileData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setProfile(profileData);

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', profileData.id)
      .eq('deleted', false)
      .order('created_at', { ascending: false });

    const enriched = (postsData || []).map((p) => ({ ...p, author: profileData }));
    setPosts(enriched);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="state-block">
        <div className="state-title">Cargando...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="state-block">
        <div className="state-title">No encontramos a @{username}</div>
        <p>Revisa que el link esté escrito correctamente.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card profile-hero">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.username} className="avatar" />
        ) : (
          <div className="avatar-placeholder">
            {(profile.username || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="profile-username">@{profile.username}</div>
        <p className="page-subtitle" style={{ marginTop: '0.4rem' }}>
          {posts.length} publicación{posts.length === 1 ? '' : 'es'}
        </p>
      </div>

      {posts.length === 0 && (
        <div className="state-block">
          <div className="state-title">Sin publicaciones todavía</div>
        </div>
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
