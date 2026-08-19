'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import PostGrid from '../../../components/PostGrid';
import PostCard from '../../../components/PostCard';

export default function PublicProfilePage() {
  const params = useParams();
  const username = decodeURIComponent(params.username);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    loadPublicProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const loadPublicProfile = async () => {
    setLoading(true);
    setNotFound(false);

    const { data: userData } = await supabase.auth.getUser();
    const viewerId = userData?.user?.id || null;
    setCurrentUserId(viewerId);

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

    const isOwner = viewerId && viewerId === profileData.id;

    if (profileData.is_private && !isOwner) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', profileData.id)
      .eq('deleted', false)
      .eq('hidden', false)
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
        <div className="state-title">este usuario no sera visible hasta que inicies sección No encontramos a @ {username}</div>
        <p>Revisa que el link esté escrito correctamente.</p>
      </div>
    );
  }

  const isOwner = currentUserId && currentUserId === profile.id;
  const isPrivateBlocked = profile.is_private && !isOwner;

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
        {!isPrivateBlocked && (
          <p className="page-subtitle" style={{ marginTop: '0.4rem' }}>
            {posts.length} publicación{posts.length === 1 ? '' : 'es'}
          </p>
        )}
      </div>

      {isPrivateBlocked ? (
        <div className="state-block">
          <div className="state-title">Esta cuenta es privada</div>
          <p>Solo el dueño del perfil puede ver sus publicaciones.</p>
        </div>
      ) : (
        <>
          <div className="profile-tabs">
            <button className="profile-tab active">Galería</button>
          </div>
          <PostGrid posts={posts} onSelect={setSelectedPost} emptyText="Sin publicaciones todavía" />
        </>
      )}

      {selectedPost && (
        <div className="post-modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="post-modal" onClick={(e) => e.stopPropagation()}>
            <button className="post-modal-close" onClick={() => setSelectedPost(null)}>✕</button>
            <PostCard post={selectedPost} currentUserId={currentUserId} onPostChanged={loadPublicProfile} />
          </div>
        </div>
      )}
    </div>
  );
}



