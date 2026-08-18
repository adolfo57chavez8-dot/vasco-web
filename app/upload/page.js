'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    const isVideo = file.type.startsWith('video/');
    const ext = file.name.split('.').pop();
    const filePath = `${userData.user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('posts-media')
      .upload(filePath, file);

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
      <h1>Nueva publicación</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 400 }}>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
          onChange={(e) => setFile(e.target.files[0])}
          required
        />
        <textarea
          placeholder="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        {error && <p style={{ color: '#f87171' }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Subiendo...' : 'Publicar'}
        </button>
      </form>
    </div>
  );
}
