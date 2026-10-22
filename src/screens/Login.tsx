import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Icons';
import { Spinner } from '../components/Bits';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      const msg = error.message.toLowerCase();
      setError(
        msg.includes('invalid login credentials')
          ? 'That email and password don’t match.'
          : msg.includes('api key') || msg.includes('apikey')
            ? 'The app isn’t connected to the database correctly (Supabase key). Check VITE_SUPABASE_ANON_KEY on Vercel.'
            : msg.includes('not confirmed')
              ? 'This account isn’t confirmed yet. Confirm the user in Supabase → Authentication → Users.'
              : msg.includes('fetch') || msg.includes('network')
                ? 'Couldn’t reach the server. Check the internet connection and VITE_SUPABASE_URL on Vercel.'
                : `Couldn’t sign in: ${error.message}`,
      );
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="row-gap center">
          <Logo size={52} />
          <span className="brand">FaLaQ</span>
        </div>
        <h1>Assalamu alaykum</h1>
        <p className="muted">Sign in once on each device. The app remembers you.</p>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <div className="error-text" role="alert">
            {error}
          </div>
        )}
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? <Spinner size={22} /> : null}
          Sign in
        </button>
      </form>
    </div>
  );
}
