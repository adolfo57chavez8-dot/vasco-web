'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import MediaPicker from '../../../components/MediaPicker';

export default function SecureFolderPage() {
  const [userId, setUserId] = useState(null);
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setLoading(false);
      return;
    }
    setUserId(userData.user.id);

    const { data, error: fetchError } = await supabase
      .from('Secure_Files')
      .select('id, user_id, Content_type, file_url, description, created_at')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (!fetchError) setFiles(data || []);
    setLoading(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');

    if (!userId) {
      setError('Debes iniciar sesión.');
      return;
    }
    if (!file) {
      setError('Selecciona una foto o video.');
      return;
    }

    setUploading(true);

    const isVideo = file.type.startsWith('video/');
    const ext = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('Secure_folder')
      .upload(filePath, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    // Bucket privado: generamos una URL firmada de larga duración para guardarla.
    const { data: signedData, error: signedError } = await supabase.storage
      .from('Secure_folder')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    if (signedError) {
      setError(signedError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from('Secure_Files').insert({
      user_id: userId,
      Content_type: isVideo ? 'video' : 'foto',
      file_url: signedData.signedUrl,
      description,
    });

    setUploading(false);

    if (insertError) {
      setError(insertError.message);
    } else {
      setFile(null);
      setDescription('');
      loadFiles();
    }
  };

  const handleDelete = async (item) => {
    await supabase.from('Secure_Files').delete().eq('id', item.id);
    loadFiles();
  };

  if (loading) {
    return (
      <div className="state-block">
        <div className="state-title">Cargando...</div>
      </div>
    );
  }

  if (!userId) {
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
        <span className="page-eyebrow">🔒 Privado</span>
        <h1>Carpeta segura</h1>
        <p className="page-subtitle">Solo tú puedes ver lo que guardes aquí. Nadie más tiene acceso.</p>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <form onSubmit={handleUpload} className="form">
          <div className="field">
            <label className="label">Foto o video</label>
            <MediaPicker
              file={file}
              onChange={setFile}
              accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
            />
          </div>
          <div className="field">
            <label className="label">Nota (opcional)</label>
            <textarea
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={uploading}>
            {uploading ? 'Guardando...' : 'Guardar en Carpeta segura'}
          </button>
        </form>
      </div>

      <div className="post-grid">
        {files.map((item) => (
          <div key={item.id} className="grid-thumb secure-thumb">
            {item.Content_type === 'video' ? (
              <video src={item.file_url} muted playsInline controls />
            ) : (
              <img src={item.file_url} alt={item.description || ''} />
            )}
            <button className="secure-thumb-delete" onClick={() => handleDelete(item)}>Borrar</button>
          </div>
        ))}
        {files.length === 0 && (
          <p className="hint-text">Todavía no has guardado nada aquí.</p>
        )}
      </div>
    </div>
  );
}
