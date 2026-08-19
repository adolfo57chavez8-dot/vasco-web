'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import MediaPicker from '../../components/MediaPicker';
import { getMediaContentType, getSafeFileExtension, isVideoFile } from '../../lib/media';
import { transcodeVideoToMp4 } from '../../lib/videoTranscoder';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoProgress, setVideoProgress] = useState(0);

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

    let uploadFile = file;
    let isVideo = isVideoFile(file);

    try {
      if (isVideo) {
        uploadFile = await transcodeVideoToMp4(file, (progress) => setVideoProgress(Math.round(progress * 100)));
        setVideoProgress(100);
      }
    } catch (transcodeError) {
      setError(transcodeError?.message || 'No se pudo preparar el video para reproducción web.');
      setLoading(false);
      return;
    }

    const contentType = getMediaContentType(uploadFile);
    const ext = getSafeFileExtension(uploadFile, contentType);
    const filePath = `${userData.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('posts-media')
      .upload(filePath, uploadFile, {
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
      content_type: isVideo ? 'video' : 'foto',
      file_url: publicUrlData.publicUrl,
      description,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
    } else {
      router.push('/');
    }
  };

  return (
    <div>
      <div className="page-header">
        <span className="page-eyebrow">Nueva</span>
        <h1>Publicar</h1>
        <p className="page-subtitle">Comparte una foto o video con la comunidad.</p>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label className="label">Foto o video</label>
            <MediaPicker
              file={file}
              onChange={setFile}
              accept="image/*,video/*"
            />
          </div>
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
          {loading && isVideoFile(file) && (
            <p className="hint-text">Preparando video compatible: {videoProgress}%</p>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? (isVideoFile(file) ? 'Convirtiendo y subiendo...' : 'Subiendo...') : 'Publicar'}
          </button>
        </form>
      </div>
    </div>
  );
}







