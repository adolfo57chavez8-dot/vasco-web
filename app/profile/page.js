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

  useEffect(() => {
    loadProfile();
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

  if (loading) return <p>Cargando...</p>;
  if (!profile) return <p>Inicia sesión para ver tu perfil.</p>;

  return (
    <div>
      <h1>Mi perfil</h1>
      {profile.avatar_url && (
        <img
          src={profile.avatar_url}
          alt="avatar"
          style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem' }}
        />
      )}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 320 }}>
        <label>
          Nombre de usuario
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Cambiar avatar
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setAvatarFile(e.target.files[0])}
          />
        </label>
        {error && <p style={{ color: '#f87171' }}>{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
