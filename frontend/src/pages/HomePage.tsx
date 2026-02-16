import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const load = async () => {
      const games = await api<Game[]>('/games');
      const first = games[0];
      setGame(first ?? null);
      if (!first) return;

      const rounds = await api<Round[]>(`/games/${first.id}/rounds`);
      const active = rounds.find((r) => r.status === 'ACTIVE') ?? rounds[rounds.length - 1] ?? null;
      setRound(active);

      const ifData = await api<IFToday>(`/games/${first.id}/if/today`);
      setIfToday(ifData);

      const today = new Date().toISOString().slice(0, 10);
      const calories = await api<CaloriesDay>(`/calories/day/${today}`);
      setCal(calories);
    };
    load().catch(console.error);
  }, []);

  return (
    <div className="grid">
      <section className="card">
        <h2 data-testid="home-title">Раунд зараз</h2>
        <p>{round?.title ?? 'Немає раунду'}</p>
        <p>Дедлайн: {round ? new Date(round.endAt).toLocaleString() : '-'}</p>
        {game && round && <Link to="/weighin">Додати weigh-in</Link>}
      </section>

      <section className="card">
        <h2>IF таймер</h2>
        <p>Status: {ifToday?.status ?? '-'}</p>
        <p>Progress: {ifToday?.todayProgressHours ?? 0} / {ifToday?.targetHours ?? 0}h</p>
        <p>Streak: {ifToday?.streak ?? 0}</p>
      </section>

      <section className="card">
        <h2>Калорії</h2>
        <p>Today: {cal?.day?.totalKcal ?? 0} / {cal?.day?.goalKcal ?? 0}</p>
        <p>Tracked: {cal?.day?.isTracked ? '✅' : '❌'}</p>
      </section>
    </div>
  );
};
