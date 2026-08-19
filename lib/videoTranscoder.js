// Vasco Web no usa FFmpeg en el navegador.
// Esta función mantiene el archivo original y evita Workers/CDN externos.
// La reproducción se delega al reproductor HTML5 del dispositivo.
export async function prepareVideoForUpload(file) {
  return file;
}
