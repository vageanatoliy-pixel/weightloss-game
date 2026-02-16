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
      const openRounds = rs.filter((r) => r.status !== 'CLOSED');
      setRounds(openRounds);
      if (openRounds[0]) setRoundId(openRounds[0].id);
    };
    load().catch(console.error);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      const data = await api<{ warning?: string }>(`/games/${gameId}/weighins`, {
        method: 'POST',
        body: JSON.stringify({
          roundId,
          weightKg: Number(weightKg),
          conditions: { morning, afterToilet, noClothes },
        }),
      });
      setMessage(data.warning ?? 'Збережено');
    } catch (err) {
      setMessage(String(err));
    }
  };

  const incomplete = !(morning && afterToilet && noClothes);

  return (
    <div className="card">
      <h2>Weigh-in (приватно)</h2>
      <p className="muted">Вага видима лише вам. Для чесності позначте умови зважування.</p>

      <form onSubmit={submit}>
        <label className="field-label" htmlFor="round">Раунд</label>
        <select id="round" value={roundId} onChange={(e) => setRoundId(e.target.value)}>
          {rounds.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>

        <label className="field-label" htmlFor="weight">Вага (kg)</label>
        <input id="weight" type="number" step="0.1" placeholder="Напр. 82.4" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />

        <div className="checks-card">
          <label className="check-item"><input type="checkbox" checked={morning} onChange={(e) => setMorning(e.target.checked)} /> Ранок</label>
          <label className="check-item"><input type="checkbox" checked={afterToilet} onChange={(e) => setAfterToilet(e.target.checked)} /> Після туалету</label>
          <label className="check-item"><input type="checkbox" checked={noClothes} onChange={(e) => setNoClothes(e.target.checked)} /> Без одягу</label>
        </div>

        {incomplete && <p className="warn">Попередження: неповні умови зважування, запис буде позначено як suspicious.</p>}

        <button type="submit">Зберегти weigh-in</button>
      </form>

      {message && <p className="muted">{message}</p>}
    </div>
  );
};
