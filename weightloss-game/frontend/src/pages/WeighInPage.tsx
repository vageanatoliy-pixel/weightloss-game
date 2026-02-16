import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';

type Game = { id: string };
type Round = { id: string; title: string; status: string };

export const WeighInPage = () => {
  const [gameId, setGameId] = useState('');
  const [roundId, setRoundId] = useState('');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [weightKg, setWeightKg] = useState('');
  const [morning, setMorning] = useState(true);
  const [afterToilet, setAfterToilet] = useState(true);
  const [noClothes, setNoClothes] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const games = await api<Game[]>('/games');
      if (!games[0]) return;
      setGameId(games[0].id);
      const rs = await api<Round[]>(`/games/${games[0].id}/rounds`);
      setRounds(rs.filter((r) => r.status !== 'CLOSED'));
      if (rs[0]) setRoundId(rs[0].id);
    };
    load().catch(console.error);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const data = await api<{ warning?: string }>(`/games/${gameId}/weighins`, {
        method: 'POST',
        body: JSON.stringify({
          roundId,
          weightKg: Number(weightKg),
          conditions: { morning, afterToilet, noClothes },
        }),
      });
      setMessage(data.warning ?? 'Saved');
    } catch (err) {
      setMessage(String(err));
    }
  };

  const incomplete = !(morning && afterToilet && noClothes);

  return (
    <div className="card">
      <h2>Weigh-in (приватно)</h2>
      <form onSubmit={submit}>
        <select value={roundId} onChange={(e) => setRoundId(e.target.value)}>
          {rounds.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
        <input type="number" step="0.1" placeholder="weight kg" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
        <label><input type="checkbox" checked={morning} onChange={(e) => setMorning(e.target.checked)} /> Morning</label>
        <label><input type="checkbox" checked={afterToilet} onChange={(e) => setAfterToilet(e.target.checked)} /> After toilet</label>
        <label><input type="checkbox" checked={noClothes} onChange={(e) => setNoClothes(e.target.checked)} /> No clothes</label>
        {incomplete && <p className="warn">Попередження: неповні умови зважування</p>}
        <button type="submit">Save</button>
      </form>
      <p>{message}</p>
    </div>
  );
};
