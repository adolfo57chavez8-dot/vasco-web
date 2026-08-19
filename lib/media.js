const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'webm', 'mov', 'mpeg', 'mpg', 'avi', 'mkv', 'ogv', 'ogg', 'ts', 'm2ts', 'mts', '3gp', '3g2', 'flv', 'wmv'];

export function isVideoFile(file) {
  if (!file) return false;
  return String(file.type || '').startsWith('video/') || VIDEO_EXTENSIONS.includes(getExtension(file.name));
}

export function getExtension(name = '') {
  const clean = String(name).split(/[?#]/)[0];
  const match = clean.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
}

export function sanitizeFileBaseName(name = 'archivo') {
  const withoutExt = String(name).replace(/\.[^.]+$/, '');
  const clean = withoutExt
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return clean.slice(0, 80) || 'archivo';
}

export function getMediaContentType(file) {
  if (file?.type) return file.type;
  if (isVideoFile(file)) return 'video/mp4';
  const ext = getExtension(file?.name);
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

export function getSafeFileExtension(file, contentType) {
  if (contentType === 'video/mp4') return 'mp4';
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/gif') return 'gif';
  const ext = getExtension(file?.name);
  return ext || 'bin';
}

export function getFileNameFromUrl(url = '') {
  try {
    const path = new URL(url).pathname;
    const encoded = path.split('/').pop() || '';
    return decodeURIComponent(encoded).replace(/^\d+-[0-9a-f-]{36}-/i, '');
  } catch {
    return '';
  }
}


