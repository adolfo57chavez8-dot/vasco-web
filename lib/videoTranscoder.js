const FFMPEG_VERSION = '0.12.10';
const FFMPEG_SCRIPT_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${FFMPEG_VERSION}/dist/umd/ffmpeg.js`;
const FFMPEG_CORE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_VERSION}/dist/umd`;

let ffmpegPromise = null;

function loadScript() {
  if (typeof window === 'undefined') {
    throw new Error('La conversión de video solo puede ejecutarse en el navegador.');
  }

  if (window.FFmpegWASM?.FFmpeg) {
    return Promise.resolve(window.FFmpegWASM.FFmpeg);
  }

  if (window.__vascoFfmpegScriptPromise) {
    return window.__vascoFfmpegScriptPromise;
  }

  window.__vascoFfmpegScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = FFMPEG_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const FFmpegClass = window.FFmpegWASM?.FFmpeg;
      if (!FFmpegClass) {
        reject(new Error('No se pudo cargar el motor de video.'));
        return;
      }
      resolve(FFmpegClass);
    };
    script.onerror = () => reject(new Error('No se pudo descargar el motor de conversión de video.'));
    document.head.appendChild(script);
  });

  return window.__vascoFfmpegScriptPromise;
}

async function toBlobURL(url, mimeType) {
  const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${url} (${response.status}).`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(new Blob([blob], { type: mimeType }));
}

async function createFFmpeg(onProgress) {
  const FFmpegClass = await loadScript();
  const ffmpeg = new FFmpegClass();

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      if (Number.isFinite(progress)) onProgress(Math.max(0, Math.min(1, progress)));
    });
  }

  const coreURL = await toBlobURL(`${FFMPEG_CORE_URL}/ffmpeg-core.js`, 'text/javascript');
  const wasmURL = await toBlobURL(`${FFMPEG_CORE_URL}/ffmpeg-core.wasm`, 'application/wasm');

  await ffmpeg.load({ coreURL, wasmURL });

  URL.revokeObjectURL(coreURL);
  URL.revokeObjectURL(wasmURL);

  return ffmpeg;
}

function safeInputName(file) {
  const original = file?.name || 'video';
  const extension = original.includes('.') ? original.split('.').pop() : 'bin';
  return `input.${String(extension).replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin'}`;
}

export async function transcodeVideoToMp4(file, onProgress) {
  if (!(file instanceof File)) {
    throw new Error('El archivo de video no es válido.');
  }

  if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|m4v|webm|mov|mpeg|mpg|avi|mkv|ogv|ogg|ts|m2ts|mts|3gp|3g2|flv|wmv)$/i)) {
    throw new Error('El archivo seleccionado no parece ser un video.');
  }

  if (ffmpegPromise) {
    throw new Error('Ya hay otra conversión de video en curso.');
  }

  ffmpegPromise = (async () => {
    const ffmpeg = await createFFmpeg(onProgress);
    const inputName = safeInputName(file);
    const outputName = 'output.mp4';

    try {
      const inputData = new Uint8Array(await file.arrayBuffer());
      await ffmpeg.writeFile(inputName, inputData);

      await ffmpeg.exec([
        '-i', inputName,
        '-map', '0:v:0',
        '-map', '0:a:0?',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputName,
      ]);

      const outputData = await ffmpeg.readFile(outputName);
      const outputBlob = new Blob([outputData], { type: 'video/mp4' });
      const outputNameForUser = `${(file.name || 'video').replace(/\.[^.]+$/, '') || 'video'}.mp4`;

      return new File([outputBlob], outputNameForUser, {
        type: 'video/mp4',
        lastModified: Date.now(),
      });
    } finally {
      try { await ffmpeg.deleteFile(inputName); } catch {}
      try { await ffmpeg.deleteFile(outputName); } catch {}
      ffmpeg.terminate();
    }
  })();

  try {
    return await ffmpegPromise;
  } finally {
    ffmpegPromise = null;
  }
}
