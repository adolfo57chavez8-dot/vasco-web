import './globals.css';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'Vasco Web',
  description: 'Comunidad de aficionados — comparte, reacciona y comenta.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}