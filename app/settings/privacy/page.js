'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function PrivacyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    setLoading(false);
  };

  const togglePrivate = async () => {
    if (!profile) return;
    setSaving(true);
    const newValue = !profile.is_private;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_private: newValue })
      .eq('id', profile.id);

    if (!updateError) setProfile({ ...profile, is_private: newValue });
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;
    setDeleting(true);
    setError('');

    // Borra publicaciones, comentarios, reacciones y guardados propios.
    // El registro de auth.users solo se puede eliminar desde el servidor
    // (Edge Function con service role) — aquí cerramos la cuenta a nivel app.
    await supabase.from('posts').update({ deleted: true, deleted_at: new Date().toISOString() }).eq('user_id', profile.id);
    await supabase.from('saved_posts').delete().eq('user_id', profile.id);
    await supabase.from('profiles').update({ username: null, avatar_url: null }).eq('id', profile.id);

    await supabase.auth.signOut();
    setDeleting(false);
    router.push('/login');
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
        <div className="state-title">Inicia sesión</div>
        <p><a href="/login">Ir a iniciar sesión</a></p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <span className="page-eyebrow">Cuenta</span>
        <h1>Privacidad y datos</h1>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="settings-row">
          <div>
            <div className="settings-row-title">Cuenta privada</div>
            <p className="hint-text">Solo tú podrás ver tus publicaciones desde tu link público.</p>
          </div>
          <button className="btn btn-ghost" onClick={togglePrivate} disabled={saving}>
            {profile.is_private ? 'Activada' : 'Desactivada'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem', borderColor: 'var(--danger)' }}>
        <div className="settings-row-title" style={{ color: 'var(--danger)' }}>Eliminar mi cuenta</div>
        <p className="hint-text">
          Esto borra tus publicaciones y datos de la app. Para pedir borrado total de tu cuenta de acceso, contáctanos.
        </p>
        {error && <p className="error-text">{error}</p>}
        {!confirmDelete ? (
          <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setConfirmDelete(true)}>
            Eliminar mi cuenta
          </button>
        ) : (
          <div className="form" style={{ marginTop: '0.6rem' }}>
            <p className="hint-text">¿Seguro? Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" style={{ background: 'var(--danger)' }} onClick={handleDeleteAccount} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
