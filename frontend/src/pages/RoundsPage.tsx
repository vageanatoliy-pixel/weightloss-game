import { useEffect, useState } from 'react';
import { api } from '../api/client';

type Game = { id: string };
type Round = { id: string; title: string; status: string };
type RoundResult = {
  results: { nickname: string; rank: number; points: number; percentCapped: number; percentReal: number | null; suspicious: boolean }[];
  notSubmitted: { nickname: string }[];
};

export const RoundsPage = () => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [result, setResult] = useState<RoundResult | null>(null);

  useEffect(() => {
    const load = async () => {
      const games = await api<Game[]>('/games');
      if (!games[0]) return;
      const rs = await api<Round[]>(`/games/${games[0].id}/rounds`);
      setRounds(rs);
      if (rs[0]) setSelected(rs[0].id);
    };
    load().catch(console.error);
  }, []);

  useEffect(() => {
    if (!selected) return;
    api<RoundResult>(`/rounds/${selected}/results`).then(setResult).catch(console.error);
  }, [selected]);

  return (
    <div className="card">
      <h2>Round details</h2>
      <select value={selected} onChange={(e) => setSelected(e.target.value)}>
        {rounds.map((r) => (
          <option key={r.id} value={r.id}>{r.title} ({r.status})</option>
        ))}
      </select>

      <ul>
        {result?.results.map((r) => (
          <li key={`${r.nickname}-${r.rank}`}>
            {r.rank}. {r.nickname} | {r.points} pts | {r.percentCapped.toFixed(2)}% {r.percentReal !== null ? `(real ${r.percentReal.toFixed(2)}%)` : ''} {r.suspicious ? '⚠' : ''}
          </li>
        ))}
      </ul>

      <h3>Не здали</h3>
      <ul>
        {result?.notSubmitted.map((u) => <li key={u.nickname}>{u.nickname}</li>)}
      </ul>
    </div>
  );
};
