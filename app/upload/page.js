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
    const contentType = getMediaContentType(file);
    const ext = getSafeFileExtension(file, contentType);
    const baseName = sanitizeFileBaseName(customName || file.name);
    const filePath = `${userData.user.id}/${Date.now()}-${crypto.randomUUID()}-${baseName}.${ext}`;

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
      setError(insertError.message);
    } else {
      router.push('/');
    }
  };

  if (!sessionChecked) {
    return <div className="state-block"><div className="state-title">Comprobando sesión...</div></div>;
  }

  if (!session) {
    return (
      <div>
        <div className="page-header">
          <span className="page-eyebrow">Publicar</span>
          <h1>Inicia sesión</h1>
          <p className="page-subtitle">Solo los usuarios registrados pueden subir publicaciones.</p>
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
    <div>
      <div className="page-header">
        <span className="page-eyebrow">Nueva</span>
        <h1>Publicar</h1>
        <p className="page-subtitle">Comparte una foto o video con la comunidad.</p>
      </div>

      <div className="card upload-card">
        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label className="label">Foto o video</label>
            <MediaPicker
              file={file}
              onChange={setFile}
              accept="image/*,video/*"
            />
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
              <p className="hint-text">Puedes dejarlo vacío y Vasco Web conservará un nombre seguro basado en el archivo original.</p>
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="description">Descripción (opcional)</label>
            <textarea
              id="description"
              className="textarea"
              placeholder="¿Qué estás compartiendo?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {file && isVideoFile(file) && (
            <div className="upload-info-box">
              <strong>Video seleccionado</strong>
              <span>Se conservará el formato original. La reproducción final depende de los códecs compatibles con el dispositivo y navegador.</span>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </form>
      </div>
    </div>
  );
}








