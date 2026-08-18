'use client';

import { useEffect, useState } from 'react';

export default function ProtectedMedia({ type, src, alt, username }) {
  const [away, setAway] = useState(false);

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
          src={src}
          controls
          controlsList="nodownload"
          onContextMenu={blockContextMenu}
          onDragStart={blockDrag}
        />
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
