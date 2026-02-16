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
      <p className="muted">Результати раунду, хто здав та хто пропустив дедлайн.</p>

      <label className="field-label" htmlFor="round-picker">Раунд</label>
      <select id="round-picker" value={selected} onChange={(e) => setSelected(e.target.value)}>
        {rounds.map((r) => (
          <option key={r.id} value={r.id}>{r.title} ({r.status})</option>
        ))}
      </select>

      <div className="stack-list">
        {result?.results.map((r) => (
          <article className="result-row" key={`${r.nickname}-${r.rank}`}>
            <div>
              <strong>{r.rank}. {r.nickname}</strong>
              <p className="muted">{r.points} pts · capped {r.percentCapped.toFixed(2)}%</p>
            </div>
            <div className="result-meta">
              {r.percentReal !== null && <span>real {r.percentReal.toFixed(2)}%</span>}
              {r.suspicious && <span className="warn">⚠ suspicious</span>}
            </div>
          </article>
        ))}
      </div>

      <h3>Не здали</h3>
      <div className="chips-wrap">
        {result?.notSubmitted.map((u) => <span className="chip" key={u.nickname}>{u.nickname}</span>)}
      </div>
    </div>
  );
};
