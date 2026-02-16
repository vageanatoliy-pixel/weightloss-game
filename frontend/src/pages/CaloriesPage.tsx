import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

type Day = {
  day: { goalKcal: number; totalKcal: number; isTracked: boolean } | null;
  entries: { name: string; kcal: number }[];
};

export const CaloriesPage = () => {
  const date = new Date().toISOString().slice(0, 10);
  const [goal, setGoal] = useState(2000);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState(0);
  const [data, setData] = useState<Day | null>(null);
  const [message, setMessage] = useState('');

  const reload = () => api<Day>(`/calories/day/${date}`).then(setData);

  useEffect(() => {
    reload().catch(console.error);
  }, []);

  const saveDay = async () => {
    await api('/calories/day', {
      method: 'POST',
      body: JSON.stringify({
        date,
        goalKcal: goal,
        totalKcal: data?.day?.totalKcal ?? 0,
        isTracked: true,
      }),
    });

    setMessage('Goal updated');
    await reload();
  };

  const addEntry = async (e: FormEvent) => {
    e.preventDefault();
    await api('/calories/entry', {
      method: 'POST',
      body: JSON.stringify({ date, name, kcal }),
    });
    setName('');
    setKcal(0);
    setMessage('Meal added');
    await reload();
  };

  const progress = useMemo(() => {
    const total = data?.day?.totalKcal ?? 0;
    const currentGoal = data?.day?.goalKcal ?? goal;
    if (!currentGoal) return 0;
    return Math.min(100, Math.round((total / currentGoal) * 100));
  }, [data, goal]);

  return (
    <div className="card">
      <h2>Calories (приватно)</h2>
      <p className="main-value">{data?.day?.totalKcal ?? 0}/{data?.day?.goalKcal ?? goal} kcal</p>
      <div className="progress-wrap" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <label className="field-label" htmlFor="goal">Денна ціль (kcal)</label>
      <div className="row">
        <input id="goal" type="number" value={goal} onChange={(e) => setGoal(Number(e.target.value))} />
        <button type="button" onClick={saveDay}>Save goal</button>
      </div>

      <form onSubmit={addEntry}>
        <label className="field-label" htmlFor="food-name">Їжа</label>
        <input id="food-name" placeholder="Напр. Greek yogurt" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="field-label" htmlFor="food-kcal">Калорії</label>
        <input id="food-kcal" type="number" placeholder="kcal" value={kcal} onChange={(e) => setKcal(Number(e.target.value))} />
        <button type="submit">Add meal</button>
      </form>

      {message && <p className="muted">{message}</p>}

      <div className="stack-list">
        {data?.entries.map((entry, i) => (
          <article className="result-row" key={`${entry.name}-${i}`}>
            <strong>{entry.name}</strong>
            <span>{entry.kcal} kcal</span>
          </article>
        ))}
      </div>
    </div>
  );
};
