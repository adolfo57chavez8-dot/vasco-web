'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isActive = (href) => (pathname === href ? 'nav-link active' : 'nav-link');

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          VASCO<span>WEB</span>
        </Link>
        <div className="nav-links">
          <Link href="/" className={isActive('/')}>Feed</Link>
          <Link href="/upload" className={isActive('/upload')}>Publicar</Link>
          <Link href="/profile" className={isActive('/profile')}>Mi perfil</Link>
          {session ? (
            <button onClick={handleSignOut} className="nav-link signout">Salir</button>
          ) : (
            <Link href="/login" className={isActive('/login')}>Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
