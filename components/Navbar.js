'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import HamburgerMenu from './HamburgerMenu';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push('/login');
  };

  const isActive = (href) => pathname === href ? 'nav-link active' : 'nav-link';

  return (
    <>
      <nav className="navbar">
        <div className="nav-inner nav-inner-vsco">
          <button
            type="button"
            className="nav-menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          <Link href="/" className="nav-logo" aria-label="Vasco Web inicio">
            VASCO<span>WEB</span>
          </Link>

          <div className="nav-links">
            <Link href="/" className={isActive('/')}>Feed</Link>
            <Link href="/upload" className={isActive('/upload')}>Publicar</Link>
            <Link href="/profile" className={isActive('/profile')}>Mi perfil</Link>
          </div>

          <div className="nav-account">
            {session ? (
              <button type="button" onClick={handleSignOut} className="nav-signout">Salir</button>
            ) : (
              <Link href="/login" className={isActive('/login')}>Login</Link>
            )}
          </div>
        </div>
      </nav>
      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} session={session} />
    </>
  );
}

