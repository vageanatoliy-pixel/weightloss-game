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

export const LeaderboardPage = () => {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const load = async () => {
      const games = await api<Game[]>('/games');
      if (!games[0]) return;
      const data = await api<Row[]>(`/games/${games[0].id}/leaderboard`);
      setRows(data);
    };
    load().catch(console.error);
  }, []);

  return (
    <div className="card">
      <h2>Leaderboard</h2>
      <div className="leaderboard-mobile" data-testid="leaderboard-mobile">
        {rows.map((r) => (
          <article className="leader-card" key={`m-${r.rank}-${r.nickname}`}>
            <div className="leader-card-head">
              <strong>#{r.rank} {r.nickname}</strong>
              <span>{r.totalPoints} pts</span>
            </div>
            <div className="leader-card-grid">
              <span>Round: {r.roundPercentCapped.toFixed(2)}%</span>
              <span>Total: {r.totalPercentCapped.toFixed(2)}%</span>
              <span>IF: {r.ifTodayProgress}</span>
              <span>Streak: {r.ifStreak}</span>
              <span>Cal: {r.calorieTracked === null ? '-' : r.calorieTracked ? '✅' : '❌'}</span>
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
            <th>% round</th>
            <th>% total</th>
            <th>IF today</th>
            <th>Streak</th>
            <th>Cal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rank + r.nickname}>
              <td>{r.rank}</td>
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
