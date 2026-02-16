import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';

type Day = { day: { goalKcal: number; totalKcal: number; isTracked: boolean } | null; entries: { name: string; kcal: number }[] };

export const CaloriesPage = () => {
  const date = new Date().toISOString().slice(0, 10);
  const [goal, setGoal] = useState(2000);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState(0);
  const [data, setData] = useState<Day | null>(null);

  const reload = () => api<Day>(`/calories/day/${date}`).then(setData);

  useEffect(() => {
    reload().catch(console.error);
  }, []);

  const saveDay = async () => {
    await api('/calories/day', {
      method: 'POST',
      body: JSON.stringify({ date, goalKcal: goal, totalKcal: data?.day?.totalKcal ?? 0, isTracked: true }),
    });
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
    await reload();
  };

  return (
    <div className="card">
      <h2>Calories (приватно)</h2>
      <p>Today: {data?.day?.totalKcal ?? 0}/{data?.day?.goalKcal ?? goal}</p>
      <div className="row">
        <input type="number" value={goal} onChange={(e) => setGoal(Number(e.target.value))} />
        <button type="button" onClick={saveDay}>Save goal</button>
      </div>
      <form onSubmit={addEntry}>
        <input placeholder="Food" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="number" placeholder="kcal" value={kcal} onChange={(e) => setKcal(Number(e.target.value))} />
        <button type="submit">Add</button>
      </form>
      <ul>
        {data?.entries.map((e, i) => <li key={i}>{e.name}: {e.kcal} kcal</li>)}
      </ul>
    </div>
  );
};
