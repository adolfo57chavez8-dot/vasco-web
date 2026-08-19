'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import MediaPicker from './MediaPicker';
import { getMediaContentType, getSafeFileExtension, isVideoFile, sanitizeFileBaseName } from '../lib/media';

export default function CreatePostModal({ onClose, onCreated }) {
  const [type, setType] = useState(null);
  const [file, setFile] = useState(null);
  const [customName, setCustomName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const accept = type === 'video' ? 'video/*' : 'image/*';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setError('Debes iniciar sesión para publicar.');
      return;
    }
    if (!file) {
      setError('Selecciona una foto o video.');
      return;
    }

    setLoading(true);
    const contentType = getMediaContentType(file);
    const ext = getSafeFileExtension(file, contentType);
    const baseName = sanitizeFileBaseName(customName || file.name);
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const filePath = `${userData.user.id}/${Date.now()}-${uuid}-${baseName}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('posts-media')
      .upload(filePath, file, {
        contentType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      setError(uploadError.message);
      setLoading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('posts-media')
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase.from('posts').insert({
      user_id: userData.user.id,
      content_type: isVideoFile(file) ? 'video' : 'foto',
      file_url: publicUrlData.publicUrl,
      description: description.trim(),
    });

    setLoading(false);

    if (insertError) {
      await supabase.storage.from('posts-media').remove([filePath]);
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setFile(null);
    setCustomName('');
    setDescription('');
    setType(null);
    if (onCreated) onCreated();
    if (onClose) onClose();
  };

  return (
    <div className="post-modal-overlay" onClick={onClose}>
      <div className="post-modal create-post-modal" onClick={(e) => e.stopPropagation()}>
        <button className="post-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>

        <div className="card create-post-card">
          <span className="page-eyebrow">Nueva publicación</span>
          <h2 className="create-post-title">Crear publicación</h2>

          {!type ? (
            <div className="create-type-choice">
              <button type="button" className="btn btn-ghost" onClick={() => setType('foto')}>
                ▣ Imagen
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setType('video')}>
                ▶ Video
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="form">
              <div className="field">
                <label className="label">{type === 'video' ? 'Video' : 'Imagen'}</label>
                <MediaPicker file={file} onChange={setFile} accept={accept} />
              </div>

              {file && (
                <div className="field">
                  <label className="label" htmlFor="modal-file-name">Nombre del archivo (opcional)</label>
                  <input
                    id="modal-file-name"
                    className="input"
                    placeholder="Ponle un nombre"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    maxLength={80}
                  />
                </div>
              )}

              <div className="field">
                <label className="label">Descripción (opcional)</label>
                <textarea
                  className="textarea"
                  placeholder="¿Qué estás compartiendo?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {error && <p className="error-text">{error}</p>}
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? 'Publicando...' : 'Publicar'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setType(null)} disabled={loading}>
                  Cambiar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}




