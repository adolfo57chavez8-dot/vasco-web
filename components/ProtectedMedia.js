'use client';

import { useEffect, useRef, useState } from 'react';

export default function ProtectedMedia({ type, src, alt, username }) {
  const [away, setAway] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const handleVisibility = () => setAway(document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const blockContextMenu = (e) => e.preventDefault();
  const blockDrag = (e) => e.preventDefault();

  return (
    <div className={`protected-media${away ? ' away' : ''}`} onContextMenu={blockContextMenu}>
      {type === 'video' ? (
        <>
          {!videoError ? (
            <video
              ref={videoRef}
              src={src}
              controls
              playsInline
              preload="metadata"
              controlsList="nodownload"
              disablePictureInPicture={false}
              onError={() => setVideoError(true)}
              onContextMenu={blockContextMenu}
              onDragStart={blockDrag}
            />
          ) : (
            <div className="video-error-state">
              <strong>Este navegador no puede reproducir este formato.</strong>
              <a href={src} target="_blank" rel="noreferrer">Abrir video</a>
            </div>
          )}
        </>
      ) : (
        <img
          src={src}
          alt={alt || ''}
          draggable={false}
          onDragStart={blockDrag}
        />
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



