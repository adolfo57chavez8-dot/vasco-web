'use client';

import { useRef } from 'react';

export default function MediaPicker({ file, onChange, accept = 'image/*,video/*', label }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const pick = (event) => {
    const selected = event.target.files?.[0] || null;
    onChange(selected);
    event.target.value = '';
  };

  return (
    <div className="media-picker">
      <input
        ref={fileInputRef}
        className="file-input-hidden"
        type="file"
        accept={accept}
        onChange={pick}
        style={{ display: 'none' }}
      />

      <input
        ref={cameraInputRef}
        className="file-input-hidden"
        type="file"
        accept="image/*,video/*"
        capture="environment"
        onChange={pick}
        style={{ display: 'none' }}
      />

      <div className="media-picker-buttons">
        <button
          type="button"
          className="media-source-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="media-source-icon">□</span>
          <span>Archivos</span>
          <small>Elegir desde el dispositivo</small>
        </button>

        <button
          type="button"
          className="media-source-btn"
          onClick={() => cameraInputRef.current?.click()}
        >
          <span className="media-source-icon">◉</span>
          <span>Cámara</span>
          <small>Usar la cámara del dispositivo</small>
        </button>
      </div>

      {file && (
        <div className="media-selected-file">
          <span className="media-file-mark">✓</span>
          <div>
            <strong>{label || 'Archivo seleccionado'}</strong>
            <span>{file.name}</span>
            <small>{Math.max(1, Math.round(file.size / 1024 / 1024 * 10) / 10)} MB</small>
          </div>
        </div>
      )}
    </div>
  );
}

