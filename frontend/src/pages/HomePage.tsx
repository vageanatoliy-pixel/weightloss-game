import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type Game = { id: string; name: string };
type Round = { id: string; title: string; endAt: string; status: string };
type IFToday = { status: string; todayProgressHours: number; targetHours: number; streak: number };
type CaloriesDay = { day: { totalKcal: number; goalKcal: number; isTracked: boolean } | null };

export const HomePage = () => {
  const [game, setGame] = useState<Game | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [ifToday, setIfToday] = useState<IFToday | null>(null);
  const [cal, setCal] = useState<CaloriesDay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const games = await api<Game[]>('/games');
      const first = games[0];
      setGame(first ?? null);
      if (!first) {
        setLoading(false);
        return;
      }

      const rounds = await api<Round[]>(`/games/${first.id}/rounds`);
      const active = rounds.find((r) => r.status === 'ACTIVE') ?? rounds[rounds.length - 1] ?? null;
      setRound(active);

      const ifData = await api<IFToday>(`/games/${first.id}/if/today`);
      setIfToday(ifData);

      const today = new Date().toISOString().slice(0, 10);
      const calories = await api<CaloriesDay>(`/calories/day/${today}`);
      setCal(calories);
      setLoading(false);
    };

    load().catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const ifProgress = useMemo(() => {
    if (!ifToday?.targetHours) return 0;
    return Math.min(100, Math.round((ifToday.todayProgressHours / ifToday.targetHours) * 100));
  }, [ifToday]);

  const calProgress = useMemo(() => {
    const goal = cal?.day?.goalKcal ?? 0;
    if (!goal) return 0;
    return Math.min(100, Math.round(((cal?.day?.totalKcal ?? 0) / goal) * 100));
  }, [cal]);

  if (loading) {
    return (
      <div className="grid">
        <section className="card pulse-card">Loading dashboard...</section>
      </div>
    );
  }

  return (
    <div className="grid home-grid">
      <section className="card hero-card">
        <h2 data-testid="home-title">Раунд зараз</h2>
        <p className="main-value">{round?.title ?? 'Немає активного раунду'}</p>
        <p className="muted">Гра: {game?.name ?? '-'}</p>
        <p className="muted">Дедлайн: {round ? new Date(round.endAt).toLocaleString() : '-'}</p>
        {game && round && (
          <Link className="btn-link" to="/weighin">
            Додати weigh-in
          </Link>
        )}
      </section>

      <section className="card metric-card">
        <h2>IF таймер</h2>
        <p className="main-value">{ifToday?.status ?? '-'}</p>
        <p>{ifToday?.todayProgressHours ?? 0} / {ifToday?.targetHours ?? 0}h</p>
        <div className="progress-wrap" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ifProgress}>
          <span style={{ width: `${ifProgress}%` }} />
        </div>
        <p className="muted">Streak: {ifToday?.streak ?? 0} днів</p>
      </section>

      <section className="card metric-card">
        <h2>Калорії</h2>
        <p className="main-value">{cal?.day?.totalKcal ?? 0} / {cal?.day?.goalKcal ?? 0}</p>
        <div className="progress-wrap" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={calProgress}>
          <span style={{ width: `${calProgress}%` }} />
        </div>
        <p className="muted">Tracked: {cal?.day?.isTracked ? '✅' : '❌'}</p>
      </section>
    </div>
  );
};
