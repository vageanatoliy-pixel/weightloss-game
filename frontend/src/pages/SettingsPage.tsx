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
    setMessage('Налаштування збережено');
  };

  return (
    <div className="card">
      <h2>Settings</h2>
      <p className="muted">Керуйте профілем, приватністю калорій і параметрами гри.</p>

      <form onSubmit={save}>
        <label className="field-label" htmlFor="nickname">Nickname</label>
        <input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Nickname" />

        <label className="field-label" htmlFor="privacy">Calories visibility</label>
        <select id="privacy" value={privacy} onChange={(e) => setPrivacy(e.target.value as 'PRIVATE' | 'PUBLIC_CHECKMARK')}>
          <option value="PRIVATE">Private (тільки для мене)</option>
          <option value="PUBLIC_CHECKMARK">Public only ✅/❌</option>
        </select>

        <button type="submit">Save</button>
      </form>

      {message && <p className="muted">{message}</p>}

      {user?.role === 'ADMIN' && (
        <div className="admin-tip">
          <strong>Admin</strong>
          <p className="muted">Керування `percentCap` і `pointsScheme` доступне через API `PATCH /games/:id/settings`.</p>
        </div>
      )}
    </div>
  );
};
