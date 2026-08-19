'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

const MENU_ITEMS = [
  { href: '/profile', label: 'Perfil', icon: '◯' },
  { href: '/profile?tab=coleccion', label: 'Colección', icon: '▢' },
  { href: '/settings/notifications', label: 'Notificaciones', icon: '◌' },
  { href: '/settings', label: 'Ajustes', icon: '⚙' },
  { href: '/settings/privacy', label: 'Privacidad y datos', icon: '◈' },
  { href: '/settings/security', label: 'Seguridad', icon: '◇' },
  { href: '/settings/about', label: 'Acerca de Vasco Web', icon: 'i' },
];

export default function HamburgerMenu({ open, onClose, session }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onClose();
    router.push('/login');
  };

  if (!open) return null;

  return (
    <div className="menu-overlay" onClick={onClose}>
      <aside className="menu-panel" onClick={(e) => e.stopPropagation()} aria-label="Menú principal">
        <div className="menu-top">
          <span className="menu-brand">VASCO<span>WEB</span></span>
          <button className="menu-close" onClick={onClose} aria-label="Cerrar menú">×</button>
        </div>

        <div className="menu-list">
          {MENU_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="menu-item" onClick={onClose}>
              <span className="menu-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="menu-footer">
          {session ? (
            <button className="menu-item menu-signout" onClick={handleSignOut}>
              <span className="menu-item-icon">↪</span>
              <span>Cerrar sesión</span>
            </button>
          ) : (
            <Link href="/login" className="menu-item" onClick={onClose}>
              <span className="menu-item-icon">→</span>
              <span>Iniciar sesión</span>
            </Link>
          )}
          <p>VASCO WEB · Comunidad visual</p>
        </div>
      </aside>
    </div>
  );
}

