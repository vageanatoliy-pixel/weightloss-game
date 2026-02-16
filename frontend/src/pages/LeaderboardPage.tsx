import { useEffect, useState } from 'react';
import { api } from '../api/client';

type Row = {
  rank: number;
  nickname: string;
  totalPoints: number;
  totalPercentCapped: number;
  roundPercentCapped: number;
  ifTodayProgress: string;
  ifStreak: number;
  calorieTracked: boolean | null;
};

type Game = { id: string };

const rankBadge = (rank: number): string => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

export const LeaderboardPage = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const games = await api<Game[]>('/games');
      if (!games[0]) {
        setRows([]);
        setLoading(false);
        return;
      }
      const data = await api<Row[]>(`/games/${games[0].id}/leaderboard`);
      setRows(data);
      setLoading(false);
    };
    load().catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  return (
    <div className="card">
      <h2>Leaderboard</h2>
      <p className="muted">Публічно: місце, бали, % прогрес, IF, статус трекінгу калорій.</p>

      {loading && <p className="muted">Loading leaderboard...</p>}
      {!loading && rows.length === 0 && <p className="muted">Немає даних для відображення.</p>}

      <div className="leaderboard-mobile" data-testid="leaderboard-mobile">
        {rows.map((r) => (
          <article className="leader-card" key={`m-${r.rank}-${r.nickname}`}>
            <div className="leader-card-head">
              <strong>{rankBadge(r.rank)} {r.nickname}</strong>
              <span className="points-chip">{r.totalPoints} pts</span>
            </div>
            <div className="leader-card-grid">
              <span>Round: {r.roundPercentCapped.toFixed(2)}%</span>
              <span>Total: {r.totalPercentCapped.toFixed(2)}%</span>
              <span>IF: {r.ifTodayProgress}</span>
              <span>Streak: {r.ifStreak}</span>
              <span>Calories: {r.calorieTracked === null ? '-' : r.calorieTracked ? '✅' : '❌'}</span>
            </div>
          </article>
        ))}
      </div>

      <table className="leaderboard-desktop">
        <thead>
          <tr>
            <th>#</th>
            <th>User</th>
            <th>Points</th>
            <th>% Round</th>
            <th>% Total</th>
            <th>IF today</th>
            <th>Streak</th>
            <th>Calories</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.rank}-${r.nickname}`}>
              <td>{rankBadge(r.rank)}</td>
              <td>{r.nickname}</td>
              <td>{r.totalPoints}</td>
              <td>{r.roundPercentCapped.toFixed(2)}</td>
              <td>{r.totalPercentCapped.toFixed(2)}</td>
              <td>{r.ifTodayProgress}</td>
              <td>{r.ifStreak}</td>
              <td>{r.calorieTracked === null ? '-' : r.calorieTracked ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
