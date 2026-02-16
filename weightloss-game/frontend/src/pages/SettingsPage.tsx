import { FormEvent, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const SettingsPage = () => {
  const { user } = useAuth();
  const [privacy, setPrivacy] = useState<'PRIVATE' | 'PUBLIC_CHECKMARK'>('PRIVATE');
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [message, setMessage] = useState('');

  const save = async (e: FormEvent) => {
    e.preventDefault();
    await api('/me/settings', {
      method: 'PATCH',
      body: JSON.stringify({ nickname, privacyCaloriesMode: privacy }),
    });
    setMessage('Saved');
  };

  return (
    <div className="card">
      <h2>Settings</h2>
      <form onSubmit={save}>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Nickname" />
        <select value={privacy} onChange={(e) => setPrivacy(e.target.value as 'PRIVATE' | 'PUBLIC_CHECKMARK')}>
          <option value="PRIVATE">Calories private</option>
          <option value="PUBLIC_CHECKMARK">Public only ✅/❌</option>
        </select>
        <button type="submit">Save</button>
      </form>
      <p>{message}</p>
      {user?.role === 'ADMIN' && (
        <p className="muted">Admin controls (`percentCap`, `pointsScheme`) доступні через API: `POST /games`, `POST /games/:id/rounds`, `PATCH /rounds/:id/close`.</p>
      )}
    </div>
  );
};
