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
    <div className="auth-card">
      <h1 data-testid="auth-title">{isLogin ? 'Login' : 'Register'}</h1>
      <form onSubmit={submit}>
        <input data-testid="email-input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input data-testid="password-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {!isLogin && <input placeholder="Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} />}
        <button data-testid="auth-submit" type="submit">{isLogin ? 'Login' : 'Create account'}</button>
      </form>
      <button type="button" onClick={() => setLogin((v) => !v)}>
        {isLogin ? 'No account? Register' : 'Have account? Login'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
};
