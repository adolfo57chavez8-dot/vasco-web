'use client';

import { useRef } from 'react';

export default function MediaPicker({ file, onChange, accept, label }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  return (
    <div className="media-picker">
      <input
        ref={fileInputRef}
        className="file-input-hidden"
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files[0])}
        style={{ display: 'none' }}
      />
      <input
        ref={cameraInputRef}
        className="file-input-hidden"
        type="file"
        accept={accept}
        capture="environment"
        onChange={(e) => onChange(e.target.files[0])}
        style={{ display: 'none' }}
      />
      <div className="media-picker-buttons">
        <button type="button" className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
          Elegir archivo
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => cameraInputRef.current?.click()}>
          📷 Usar cámara
        </button>
      </div>
      {file && <p className="hint-text media-picker-filename">{label || 'Seleccionado'}: {file.name}</p>}
    </div>
  );
}
