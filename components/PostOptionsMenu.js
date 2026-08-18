'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function PostOptionsMenu({ post, onChanged }) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const close = () => setOpen(false);

  const runAction = async (fn) => {
    setWorking(true);
    setError('');
    try {
      await fn();
      close();
      if (onChanged) onChanged();
    } catch (err) {
      setError(err.message || 'Ocurrió un error, intenta de nuevo.');
    } finally {
      setWorking(false);
    }
  };

  // "Borrar": no elimina de una vez, manda la publicación a la Papelera.
  const handleDelete = () =>
    runAction(async () => {
      const { error: deleteError } = await supabase
        .from('posts')
        .update({ deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', post.id);
      if (deleteError) throw deleteError;
    });

  // "Ocultar" / "Mostrar": la publicación sigue en tu galería pero desaparece
  // del feed y del perfil público mientras esté oculta.
  const handleToggleHidden = () =>
    runAction(async () => {
      const { error: hideError } = await supabase
        .from('posts')
        .update({ hidden: !post.hidden })
        .eq('id', post.id);
      if (hideError) throw hideError;
    });

  // "Enviar a carpeta segura": mueve el archivo y el registro a Secure_Files /
  // Secure_folder (privado) y quita la publicación de la galería pública.
  const handleMoveToSecure = () =>
    runAction(async () => {
      const res = await fetch(post.file_url);
      if (!res.ok) throw new Error('No se pudo leer el archivo original.');
      const blob = await res.blob();

      const cleanUrl = post.file_url.split('?')[0];
      const ext = cleanUrl.split('.').pop() || 'dat';
      const filePath = `${post.user_id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('Secure_folder')
        .upload(filePath, blob, { contentType: blob.type || undefined });
      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from('Secure_folder')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
      if (signedError) throw signedError;

      const { error: insertError } = await supabase.from('Secure_Files').insert({
        user_id: post.user_id,
        Content_type: post.content_type === 'video' ? 'video' : 'foto',
        file_url: signedData.signedUrl,
        description: post.description || null,
      });
      if (insertError) throw insertError;

      const { error: deletePostError } = await supabase.from('posts').delete().eq('id', post.id);
      if (deletePostError) throw deletePostError;

      // Best-effort: intenta borrar el archivo original del bucket público.
      try {
        const path = decodeURIComponent(cleanUrl.split('/posts-media/')[1] || '');
        if (path) await supabase.storage.from('posts-media').remove([path]);
      } catch (_) {
        // no bloquea el flujo si esto falla
      }
    });

  return (
    <div className="post-menu">
      <button
        type="button"
        className="post-menu-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-label="Opciones de la publicación"
        disabled={working}
      >
        ⋮
      </button>

      {open && (
        <>
          <div className="post-menu-backdrop" onClick={close} />
          <div className="post-menu-dropdown">
            <button type="button" onClick={handleToggleHidden} disabled={working}>
              {post.hidden ? '👁️ Mostrar' : '🙈 Ocultar'}
            </button>
            <button type="button" onClick={handleMoveToSecure} disabled={working}>
              🔒 Enviar a carpeta segura
            </button>
            <button type="button" className="post-menu-danger" onClick={handleDelete} disabled={working}>
              🗑️ Borrar
            </button>
          </div>
        </>
      )}

      {error && <p className="error-text post-menu-error">{error}</p>}
    </div>
  );
}
