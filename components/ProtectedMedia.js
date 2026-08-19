'use client';

import { useEffect, useState } from 'react';

export default function ProtectedMedia({ type, src, alt, username }) {
  const [away, setAway] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    const handleVisibility = () => setAway(document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const blockContextMenu = (e) => e.preventDefault();
  const blockDrag = (e) => e.preventDefault();

  return (
    <div
      className={`protected-media${away ? ' away' : ''}`}
      onContextMenu={blockContextMenu}
    >
      {type === 'video' ? (
        <video
          key={src}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          disablePictureInPicture
          onContextMenu={blockContextMenu}
          onDragStart={blockDrag}
          onError={() => setMediaError(true)}
          onLoadedData={() => setMediaError(false)}
        >
          <source src={src} type="video/mp4" />
        </video>
      ) : (
        <img
          src={src}
          alt={alt || ''}
          draggable={false}
          onDragStart={blockDrag}
        />
      )}

      {mediaError && type === 'video' && (
        <p className="hint-text media-error-text">
          No se pudo reproducir este video. Intenta nuevamente o revisa la conexión.
        </p>
      )}

      {username && (
        <span className="watermark-tag">
          <span className="dot" />@{username}
        </span>
      )}

      {away && <div className="away-notice">Contenido oculto</div>}
    </div>
  );
}



