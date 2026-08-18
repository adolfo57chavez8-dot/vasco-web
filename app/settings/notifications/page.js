'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'vasco_notifications_enabled';

export default function NotificationsPage() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored !== null) setEnabled(stored === 'true');
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, String(next));
  };

  return (
    <div>
      <div className="page-header">
        <span className="page-eyebrow">Cuenta</span>
        <h1>Notificaciones</h1>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <div className="settings-row">
          <div>
            <div className="settings-row-title">Avisos en este dispositivo</div>
            <p className="hint-text">Preferencia guardada solo en este navegador.</p>
          </div>
          <button className="btn btn-ghost" onClick={toggle}>
            {enabled ? 'Activadas' : 'Desactivadas'}
          </button>
        </div>
      </div>
    </div>
  );
}
