import './globals.css';

export const metadata = {
  title: 'Vasco Web',
  description: 'Red social - Vasco Web',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <nav style={{ padding: '1rem', borderBottom: '1px solid #333', display: 'flex', gap: '1rem' }}>
          <a href="/">Feed</a>
          <a href="/upload">Publicar</a>
          <a href="/profile">Mi perfil</a>
          <a href="/login">Login</a>
        </nav>
        <main style={{ padding: '1rem', maxWidth: 640, margin: '0 auto' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
