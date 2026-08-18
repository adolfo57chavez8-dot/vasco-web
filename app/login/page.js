'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push('/');
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          username,
          email,
        });
        if (profileError) {
          setError(profileError.message);
        } else {
          router.push('/');
        }
      }
    }

    setLoading(false);
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="tabs">
          <button
            type="button"
            className={mode === 'login' ? 'tab active' : 'tab'}
            onClick={() => setMode('login')}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'tab active' : 'tab'}
            onClick={() => setMode('register')}
          >
            Crear cuenta
          </button>
        </div>

        <h1 style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>
          {mode === 'login' ? 'Bienvenido de vuelta' : 'Únete a la comunidad'}
        </h1>
        <p className="page-subtitle" style={{ marginBottom: '1.2rem' }}>
          {mode === 'login' ? 'Ingresa tus datos para continuar.' : 'Crea tu cuenta para publicar y reaccionar.'}
        </p>

        <form onSubmit={handleSubmit} className="form">
          {mode === 'register' && (
            <div className="field">
              <label className="label">Nombre de usuario</label>
              <input
                className="input"
                placeholder="ej. jose_10"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}
          <div className="field">
            <label className="label">Correo electrónico</label>
            <input
              className="input"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="label">Contraseña</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Registrarme'}
          </button>
        </form>

        <button
          className="switch-link"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? (
            <>¿No tienes cuenta? <b>Regístrate</b></>
          ) : (
            <>¿Ya tienes cuenta? <b>Inicia sesión</b></>
          )}
        </button>
      </div>
    </div>
  );
}

