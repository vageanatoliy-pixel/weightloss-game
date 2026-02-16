import { useEffect, useRef, useState, type MutableRefObject } from 'react';
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
      // Local browser notification for the PWA context.
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
    setMessage(result === 'granted' ? 'Нагадування ввімкнено.' : 'Доступ до нагадувань не надано.');
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

  return (
    <div className="card">
      <h2>IF Screen</h2>
      <select value={targetHours} onChange={(e) => setTargetHours(Number(e.target.value))}>
        <option value={16}>16/8</option>
        <option value={18}>18/6</option>
        <option value={20}>20/4</option>
        <option value={23}>OMAD</option>
        <option value={14}>Custom 14h</option>
      </select>
      <p data-testid="if-status">Status: {today?.status}</p>
      <p>Progress: {today?.todayProgressHours}/{today?.targetHours}h</p>
      <p>Last: {(today?.lastDurationMinutes ?? 0) / 60}h</p>
      <p>Streak: {today?.streak}</p>
      <p>Notifications: {notifStatus}</p>
      <div className="row">
        <button data-testid="if-start" type="button" onClick={startFast}>Start</button>
        <button data-testid="if-finish" type="button" onClick={finishFast}>Finish</button>
      </div>
      <button data-testid="if-enable-notif" type="button" onClick={requestNotif}>Enable notifications</button>
      <p className="muted">Локальне нагадування планується автоматично за 1 годину до завершення fast.</p>
      {message && <p className="muted">{message}</p>}
    </div>
  );
};
