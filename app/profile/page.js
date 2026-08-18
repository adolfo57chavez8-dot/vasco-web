'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    loadProfile();
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    setProfile(data);
    setUsername(data?.username || '');
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setError('No has iniciado sesión.');
      setSaving(false);
      return;
    }

    let avatarUrl = profile?.avatar_url;

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const filePath = `${userData.user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      avatarUrl = publicUrlData.publicUrl;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', userData.user.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      loadProfile();
    }
  };

  const publicLink = profile?.username ? `${origin}/u/${profile.username}` : '';

  const handleCopy = async () => {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
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
        <div className="state-title">Inicia sesión para ver tu perfil</div>
        <p><a href="/login">Ir a iniciar sesión</a></p>
      </div>
    );
  }

  return (
    <div>
      <div className="card profile-hero">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="avatar" className="avatar" />
        ) : (
          <div className="avatar-placeholder">
            {(profile.username || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="profile-username">@{profile.username || 'sin-nombre'}</div>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <span className="page-eyebrow">Editar</span>
          <h2 style={{ margin: 0 }}>Mi perfil</h2>
        </div>

        <form onSubmit={handleSave} className="form">
          <div className="field">
            <label className="label">Nombre de usuario</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="label">Cambiar avatar</label>
            <input
              className="file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setAvatarFile(e.target.files[0])}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {profile.username && (
        <div className="card share-box">
          <label className="label">Tu link público para compartir</label>
          <div className="share-row">
            <input className="input" readOnly value={publicLink} onClick={(e) => e.target.select()} />
            <button type="button" className="btn btn-ghost" onClick={handleCopy}>
              Copiar
            </button>
          </div>
          <p className="copy-feedback">{copied ? '¡Copiado!' : ''}</p>
          <p className="hint-text">
            Cualquiera puede abrir este link para ver tus publicaciones, reaccionar y comentar. Necesitan crear una cuenta para participar.
          </p>
        </div>
      )}
    </div>
  );
}
