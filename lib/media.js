export function getFileExtension(file) {
  const name = file?.name || '';
  const raw = name.split('.').pop()?.toLowerCase() || '';
  return raw.replace(/[^a-z0-9]/g, '');
}

export function getMediaContentType(file) {
  const browserType = file?.type || '';
  if (browserType.startsWith('video/') || browserType.startsWith('image/')) {
    return browserType;
  }

  const ext = getFileExtension(file);
  const types = {
    mp4: 'video/mp4',
    m4v: 'video/x-m4v',
    webm: 'video/webm',
    mov: 'video/quicktime',
    mpeg: 'video/mpeg',
    mpg: 'video/mpeg',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    ogv: 'video/ogg',
    ogg: 'video/ogg',
    ts: 'video/mp2t',
    m2ts: 'video/mp2t',
    mts: 'video/mp2t',
    '3gp': 'video/3gpp',
    '3g2': 'video/3gpp2',
    flv: 'video/x-flv',
    wmv: 'video/x-ms-wmv',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    avif: 'image/avif',
  };

  return types[ext] || 'application/octet-stream';
}

export function getSafeFileExtension(file, contentType) {
  const ext = getFileExtension(file);
  if (ext) return ext;

  const fallback = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/mpeg': 'mpeg',
    'video/ogg': 'ogv',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  };

  return fallback[contentType] || 'bin';
}

const VIDEO_EXTENSIONS = new Set([
  'mp4', 'm4v', 'webm', 'mov', 'mpeg', 'mpg', 'avi', 'mkv', 'ogv', 'ogg',
  'ts', 'm2ts', 'mts', '3gp', '3g2', 'flv', 'wmv'
]);

export function isVideoFile(file) {
  return Boolean(
    file &&
      (file.type?.startsWith('video/') || VIDEO_EXTENSIONS.has(getFileExtension(file)))
  );
}

export function isSupportedUpload(file) {
  return Boolean(
    file &&
      (file.type?.startsWith('image/') || isVideoFile(file))
  );
}
