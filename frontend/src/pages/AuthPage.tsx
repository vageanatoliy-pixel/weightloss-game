import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const AuthPage = () => {
  const [isLogin, setLogin] = useState(true);
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('password123');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const { setAuth } = useAuth();
  const nav = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const data = await api<{ token: string; user: { id: string; nickname: string; email: string; role: 'USER' | 'ADMIN' } }>(
        isLogin ? '/auth/login' : '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(isLogin ? { email, password } : { email, password, nickname }),
        },
      );
      setAuth(data.token, data.user);
      nav('/');
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <p className="eyebrow">MVP v1.2</p>
        <h1>WeightLoss Game</h1>
        <p>Змагання без шеймінгу: публічний прогрес у %, IF і бали. Вага та калорії під контролем приватності.</p>
      </section>

      <section className="auth-card">
        <h2 data-testid="auth-title">{isLogin ? 'Login' : 'Register'}</h2>

        <form onSubmit={submit}>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            data-testid="email-input"
            id="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="field-label" htmlFor="password">Password</label>
          <input
            data-testid="password-input"
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {!isLogin && (
            <>
              <label className="field-label" htmlFor="nickname">Nickname</label>
              <input id="nickname" placeholder="Your nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </>
          )}

          <button data-testid="auth-submit" type="submit">{isLogin ? 'Login' : 'Create account'}</button>
        </form>

        <button className="btn-ghost" type="button" onClick={() => setLogin((v) => !v)}>
          {isLogin ? 'No account yet? Create one' : 'Already have an account? Login'}
        </button>

        {error && <p className="error">{error}</p>}
      </section>
    </div>
  );
};
