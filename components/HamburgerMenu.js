'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

const MENU_ITEMS = [
  { href: '/settings/notifications', label: 'Notificaciones' },
  { href: '/profile?tab=coleccion', label: 'Favoritos' },
  { href: '/settings', label: 'Ajustes' },
  { href: '/settings/privacy', label: 'Privacidad y datos' },
  { href: '/settings/security', label: 'Seguridad' },
  { href: '/settings/about', label: 'Acerca de' },
];

export default function HamburgerMenu({ open, onClose }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onClose();
    router.push('/login');
  };

  if (!open) return null;

  return (
    <div className="menu-overlay" onClick={onClose}>
      <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
        <button className="menu-close" onClick={onClose} aria-label="Cerrar">✕</button>
        <div className="menu-list">
          {MENU_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="menu-item" onClick={onClose}>
              {item.label}
            </Link>
          ))}
        </div>
        <button className="menu-item menu-signout" onClick={handleSignOut}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
