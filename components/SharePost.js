'use client';

import { useState } from 'react';

export default function SharePost({ postId, title = 'Mira esta publicación en Vasco Web' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const getUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/post/${encodeURIComponent(postId)}`;
  };

  const copyLink = async () => {
    const url = getUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copia este enlace:', url);
    }
  };

  const nativeShare = async () => {
    const url = getUrl();
    if (!navigator.share) {
      setOpen(true);
      return;
    }
    try {
      await navigator.share({ title, text: title, url });
    } catch {
      // Cancelar el diálogo nativo no es un error que deba mostrarse.
    }
  };

  const url = typeof window !== 'undefined' ? getUrl() : '';
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { label: 'Telegram', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
  ];

  return (
    <div className="share-post">
      <button type="button" className="reaction-btn share-trigger" onClick={() => setOpen((v) => !v)}>
        <span>↗</span> Compartir
      </button>

      {open && (
        <div className="share-panel">
          <div className="share-panel-title">Compartir publicación</div>
          <button type="button" className="share-option share-native" onClick={nativeShare}>
            📱 Más aplicaciones / compartir del dispositivo
          </button>
          {links.map((item) => (
            <a
              key={item.label}
              className="share-option"
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <button type="button" className="share-option share-copy" onClick={copyLink}>
            {copied ? '✓ Enlace copiado' : '🔗 Copiar enlace'}
          </button>
        </div>
      )}
    </div>
  );
}
