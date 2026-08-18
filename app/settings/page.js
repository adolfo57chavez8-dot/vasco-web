'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

const IDIOMAS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [idioma, setIdioma] = useState('es');
  const [colorTema, setColorTema] = useState('#f5a524');
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
    setIdioma(data?.idioma || 'es');
    setColorTema(data?.color_tema || '#f5a524');
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
      .update({
        username,
        avatar_url: avatarUrl,
        idioma,
        color_tema: colorTema,
        updated_at: new Date().toISOString(),
      })
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
        <div className="state-title">Inicia sesión para ver tus ajustes</div>
        <p><a href="/login">Ir a iniciar sesión</a></p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <span className="page-eyebrow">Cuenta</span>
        <h1>Ajustes</h1>
        <p className="page-subtitle">Edita tu perfil y accede a tus opciones.</p>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
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
          <div className="field">
            <label className="label">Idioma</label>
            <select className="input" value={idioma} onChange={(e) => setIdioma(e.target.value)}>
              {IDIOMAS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">Color del tema</label>
            <input
              type="color"
              className="input"
              value={colorTema}
              onChange={(e) => setColorTema(e.target.value)}
              style={{ height: 44, padding: 4 }}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {profile.username && (
        <div className="card share-box" style={{ marginBottom: '1.25rem' }}>
          <label className="label">Tu link público para compartir</label>
          <div className="share-row">
            <input className="input" readOnly value={publicLink} onClick={(e) => e.target.select()} />
            <button type="button" className="btn btn-ghost" onClick={handleCopy}>
              Copiar
            </button>
          </div>
          <p className="copy-feedback">{copied ? '¡Copiado!' : ''}</p>
          <p className="hint-text">
            Solo tú puedes ver este link aquí. Quien vea tu perfil público no lo verá.
          </p>
        </div>
      )}

      <div className="card settings-links">
        <Link href="/settings/secure-folder" className="menu-item">🔒 Carpeta segura</Link>
        <Link href="/settings/privacy" className="menu-item">Privacidad y datos</Link>
        <Link href="/settings/security" className="menu-item">Seguridad</Link>
        <Link href="/settings/about" className="menu-item">Acerca de</Link>
      </div>
    </div>
  );
}
