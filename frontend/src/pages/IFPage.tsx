import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { api } from '../api/client';

type IFToday = {
  status: string;
  todayProgressHours: number;
  targetHours: number;
  streak: number;
  lastDurationMinutes: number;
  activeStartedAt: string | null;
};

type Game = { id: string };
type IFSession = { startedAt: string; targetHours: number };

const REMINDER_KEY = 'if-reminder-at';

const clearReminder = (timerRef: MutableRefObject<number | null>) => {
  if (timerRef.current) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
  localStorage.removeItem(REMINDER_KEY);
};

export const IFPage = () => {
  const [gameId, setGameId] = useState('');
  const [targetHours, setTargetHours] = useState(16);
  const [today, setToday] = useState<IFToday | null>(null);
  const [notifStatus, setNotifStatus] = useState(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [message, setMessage] = useState('');
  const reminderTimerRef = useRef<number | null>(null);

  const scheduleReminder = (startedAtIso: string, hours: number) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    clearReminder(reminderTimerRef);
    const start = new Date(startedAtIso).getTime();
    const remindAt = start + Math.max(0, hours - 1) * 60 * 60 * 1000;
    const delay = remindAt - Date.now();

    if (delay <= 0) return;

    localStorage.setItem(REMINDER_KEY, String(remindAt));
    reminderTimerRef.current = window.setTimeout(() => {
      new Notification('WeightLoss Game IF', {
        body: 'Залишилась приблизно 1 година до завершення fasting-сесії.',
      });
      localStorage.removeItem(REMINDER_KEY);
    }, delay);
  };

  const reload = async (id: string) => {
    const d = await api<IFToday>(`/games/${id}/if/today`);
    setToday(d);

    if (d.status === 'FASTING' && d.activeStartedAt) {
      scheduleReminder(d.activeStartedAt, d.targetHours);
    }

    if (d.status !== 'FASTING') {
      clearReminder(reminderTimerRef);
    }
  };

  useEffect(() => {
    const load = async () => {
      const games = await api<Game[]>('/games');
      if (!games[0]) return;
      setGameId(games[0].id);
      await reload(games[0].id);
    };

    load().catch(console.error);
    return () => clearReminder(reminderTimerRef);
  }, []);

  const requestNotif = async () => {
    if (!('Notification' in window)) {
      setMessage('Цей браузер не підтримує local notifications.');
      return;
    }

    const result = await Notification.requestPermission();
    setNotifStatus(result);
    setMessage(result === 'granted' ? 'Нагадування увімкнено.' : 'Доступ до нагадувань не надано.');
  };

  const startFast = async () => {
    const session = await api<IFSession>(`/games/${gameId}/if/start`, {
      method: 'POST',
      body: JSON.stringify({ targetHours }),
    });

    scheduleReminder(session.startedAt, session.targetHours);
    await reload(gameId);
  };

  const finishFast = async () => {
    await api(`/games/${gameId}/if/finish`, { method: 'POST' });
    clearReminder(reminderTimerRef);
    await reload(gameId);
  };

  const progressPercent = useMemo(() => {
    if (!today?.targetHours) return 0;
    return Math.min(100, Math.round((today.todayProgressHours / today.targetHours) * 100));
  }, [today]);

  return (
    <div className="card">
      <h2>IF Control</h2>
      <p className="muted">Публічно видно лише прогрес, streak і статус fasting/eating.</p>

      <label className="field-label" htmlFor="if-mode">Режим</label>
      <select id="if-mode" value={targetHours} onChange={(e) => setTargetHours(Number(e.target.value))}>
        <option value={16}>16/8</option>
        <option value={18}>18/6</option>
        <option value={20}>20/4</option>
        <option value={23}>OMAD</option>
        <option value={14}>Custom 14h</option>
      </select>

      <p data-testid="if-status" className="main-value">{today?.status ?? '-'}</p>
      <p>{today?.todayProgressHours ?? 0} / {today?.targetHours ?? 0}h</p>
      <div className="progress-wrap" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
        <span style={{ width: `${progressPercent}%` }} />
      </div>
      <p className="muted">Last session: {((today?.lastDurationMinutes ?? 0) / 60).toFixed(1)}h</p>
      <p className="muted">Streak: {today?.streak ?? 0} днів</p>
      <p className="muted">Notifications: {notifStatus}</p>

      <div className="row">
        <button data-testid="if-start" type="button" onClick={startFast}>Start fasting</button>
        <button data-testid="if-finish" className="btn-ghost" type="button" onClick={finishFast}>Finish</button>
      </div>

      <button data-testid="if-enable-notif" className="btn-ghost" type="button" onClick={requestNotif}>Enable notifications</button>

      <p className="muted">Автоматичне нагадування ставиться за 1 годину до кінця активного fast.</p>
      {message && <p className="muted">{message}</p>}
    </div>
  );
};
