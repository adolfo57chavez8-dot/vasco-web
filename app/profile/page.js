'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import PostGrid from '../../components/PostGrid';
import PostCard from '../../components/PostCard';
import HamburgerMenu from '../../components/HamburgerMenu';
import CreatePostModal from '../../components/CreatePostModal';

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="state-block"><div className="state-title">Cargando...</div></div>}>
      <ProfilePageInner />
    </Suspense>
  );
}

function ProfilePageInner() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'coleccion' ? 'coleccion' : 'galeria';

  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [trashPosts, setTrashPosts] = useState([]);
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [trashWorkingId, setTrashWorkingId] = useState(null);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setLoading(false);
      return;
    }
    setUserId(userData.user.id);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();
    setProfile(data);

    await loadGallery(userData.user.id, data);
    await loadSaved(userData.user.id);
    await loadTrash(userData.user.id);
    setLoading(false);
  };

  const loadGallery = async (uid, profileData) => {
    // El dueño ve también sus publicaciones ocultas (con una insignia),
    // pero nunca las que están en la Papelera.
    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', uid)
      .eq('deleted', false)
      .order('created_at', { ascending: false });
    const enriched = (postsData || []).map((p) => ({ ...p, author: profileData }));
    setPosts(enriched);
  };

  const loadSaved = async (uid) => {
    const { data: savedRows } = await supabase
      .from('saved_posts')
      .select('post_id, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    const postIds = (savedRows || []).map((r) => r.post_id);
    if (postIds.length === 0) {
      setSavedPosts([]);
      return;
    }

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .in('id', postIds)
      .eq('deleted', false)
      .eq('hidden', false);

    const authorIds = [...new Set((postsData || []).map((p) => p.user_id))];
    const { data: authors } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', authorIds);
    const authorMap = Object.fromEntries((authors || []).map((a) => [a.id, a]));

    const order = Object.fromEntries(postIds.map((id, i) => [id, i]));
    const enriched = (postsData || [])
      .map((p) => ({ ...p, author: authorMap[p.user_id] || null }))
      .sort((a, b) => order[a.id] - order[b.id]);

    setSavedPosts(enriched);
  };

  const loadTrash = async (uid) => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', uid)
      .eq('deleted', true)
      .order('deleted_at', { ascending: false });
    setTrashPosts(data || []);
  };

  const refreshAll = async () => {
    if (!userId) return;
    await loadGallery(userId, profile);
    await loadSaved(userId);
    await loadTrash(userId);
  };

  const handlePostChanged = async (postId) => {
    if (selectedPost?.id === postId) setSelectedPost(null);
    await refreshAll();
  };

  const handleRestore = async (post) => {
    setTrashWorkingId(post.id);
    await supabase.from('posts').update({ deleted: false, deleted_at: null }).eq('id', post.id);
    setTrashWorkingId(null);
    refreshAll();
  };

  const handlePermanentDelete = async (post) => {
    setTrashWorkingId(post.id);
    await supabase.from('posts').delete().eq('id', post.id);
    try {
      const cleanUrl = (post.file_url || '').split('?')[0];
      const path = decodeURIComponent(cleanUrl.split('/posts-media/')[1] || '');
      if (path) await supabase.storage.from('posts-media').remove([path]);
    } catch (_) {
      // no bloquea si falla
    }
    setTrashWorkingId(null);
    refreshAll();
  };

  if (loading) {
    return (
      <div className="state-block">
        <div className="state-title">Cargando...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="state-block">
        <div className="state-title">Inicia sesión para ver tu perfil y para poder ver las publicaciones de este usuario</div>
        <p><a href="/login">Ir a iniciar sesión</a></p>
      </div>
    );
  }

  const gridPosts = tab === 'galeria' ? posts : tab === 'coleccion' ? savedPosts : [];

  return (
    <div>
      <div className="card profile-hero">
        <button className="hamburger-btn" onClick={() => setMenuOpen(true)} aria-label="Menú">☰</button>

        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="avatar" className="avatar" />
        ) : (
          <div className="avatar-placeholder">
            {(profile.username || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="profile-username">@{profile.username || 'sin-nombre'}</div>
        <p className="page-subtitle" style={{ marginTop: '0.3rem' }}>
          {posts.length} publicación{posts.length === 1 ? '' : 'es'}
        </p>
      </div>

      <div className="profile-tabs">
        <button
          className={`profile-tab${tab === 'galeria' ? ' active' : ''}`}
          onClick={() => setTab('galeria')}
        >
          Galería
        </button>
        <button
          className={`profile-tab${tab === 'coleccion' ? ' active' : ''}`}
          onClick={() => setTab('coleccion')}
        >
          Colección
        </button>
        <button
          className={`profile-tab${tab === 'papelera' ? ' active' : ''}`}
          onClick={() => setTab('papelera')}
        >
          Papelera{trashPosts.length > 0 ? ` (${trashPosts.length})` : ''}
        </button>
        <button
          type="button"
          className="profile-tab-create"
          onClick={() => setCreateOpen(true)}
          aria-label="Crear publicación"
          title="Crear publicación"
        >
          +
        </button>
      </div>

      {tab === 'papelera' ? (
        trashPosts.length === 0 ? (
          <div className="state-block">
            <div className="state-title">Tu papelera está vacía</div>
          </div>
        ) : (
          <div className="post-grid">
            {trashPosts.map((item) => (
              <div key={item.id} className="grid-thumb trash-thumb">
                {item.content_type === 'video' ? (
                  <video src={item.file_url} muted playsInline />
                ) : (
                  <img src={item.file_url} alt={item.description || ''} />
                )}
                <div className="trash-thumb-actions">
                  <button
                    type="button"
                    onClick={() => handleRestore(item)}
                    disabled={trashWorkingId === item.id}
                  >
                    Restaurar
                  </button>
                  <button
                    type="button"
                    className="post-menu-danger"
                    onClick={() => handlePermanentDelete(item)}
                    disabled={trashWorkingId === item.id}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <PostGrid
          posts={gridPosts}
          onSelect={setSelectedPost}
          emptyText={tab === 'galeria' ? 'Sin publicaciones todavía' : 'No has guardado nada en tu Colección'}
        />
      )}

      {selectedPost && (
        <div className="post-modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="post-modal" onClick={(e) => e.stopPropagation()}>
            <button className="post-modal-close" onClick={() => setSelectedPost(null)}>✕</button>
            <PostCard
              post={selectedPost}
              currentUserId={userId}
              onSaveChange={() => loadSaved(userId)}
              onPostChanged={handlePostChanged}
            />
          </div>
        </div>
      )}

      {createOpen && (
        <CreatePostModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setTab('galeria');
            refreshAll();
          }}
        />
      )}

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}


