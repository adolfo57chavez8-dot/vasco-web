'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import MediaPicker from '../../components/MediaPicker';
import { getMediaContentType, getSafeFileExtension, isVideoFile, sanitizeFileBaseName } from '../../lib/media';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [customName, setCustomName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionChecked, setSessionChecked] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionChecked(true);
    });
  }, []);

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

    try {
      const contentType = getMediaContentType(file);
      const ext = getSafeFileExtension(file, contentType);
      const baseName = sanitizeFileBaseName(customName || file.name);
      const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const filePath = `${userData.user.id}/${Date.now()}-${uuid}-${baseName}.${ext}`;

      // Subida directa a Supabase: no usamos FFmpeg, Workers ni CDNs externos.
      // Esto evita el error de Worker/CORS que bloqueaba la publicación de videos.
      const { error: uploadError } = await supabase.storage
        .from('posts-media')
        .upload(filePath, file, {
          contentType,
          cacheControl: '31536000',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('posts-media')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('posts').insert({
        user_id: userData.user.id,
        content_type: isVideoFile(file) ? 'video' : 'foto',
        file_url: publicUrlData.publicUrl,
        description: description.trim(),
      });

      if (insertError) {
        await supabase.storage.from('posts-media').remove([filePath]);
        throw insertError;
      }

      router.push('/');
    } catch (err) {
      setError(err?.message || 'No se pudo publicar el archivo.');
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return <div className="state-block"><div className="state-title">Comprobando sesión...</div></div>;
  }

  if (!session) {
    return (
      <div className="upload-page">
        <div className="page-header">
          <span className="page-eyebrow">Publicar</span>
          <h1>Inicia sesión</h1>
          <p className="page-subtitle">Solo los usuarios registrados pueden compartir contenido.</p>
        </div>
        <div className="card login-required-card">
          <div className="state-title">Tu cuenta es necesaria</div>
          <p className="hint-text">Inicia sesión o crea una cuenta para compartir fotos y videos.</p>
          <a href="/login" className="btn btn-primary btn-block">Iniciar sesión</a>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-page">
      <div className="page-header">
        <span className="page-eyebrow">Nueva publicación</span>
        <h1>Publicar</h1>
        <p className="page-subtitle">Comparte una imagen o video con la comunidad.</p>
      </div>

      <div className="card upload-card">
        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label className="label">Medio</label>
            <MediaPicker file={file} onChange={setFile} accept="image/*,video/*" />
          </div>

          {file && (
            <div className="field">
              <label className="label" htmlFor="custom-file-name">Nombre del archivo (opcional)</label>
              <input
                id="custom-file-name"
                className="input"
                placeholder="Ej. Mi viaje a la playa"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                maxLength={80}
              />
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="description">Descripción</label>
            <textarea
              id="description"
              className="textarea"
              placeholder="Cuéntale algo a la comunidad..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {file && isVideoFile(file) && (
            <div className="upload-info-box">
              <strong>Video listo para subir</strong>
              <span>Vasco Web lo envía directamente a Supabase sin depender de FFmpeg ni de un CDN externo.</span>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block upload-submit" disabled={loading}>
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </form>
      </div>
    </div>
  );
}









