import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { RoundsPage } from './pages/RoundsPage';
import { WeighInPage } from './pages/WeighInPage';
import { IFPage } from './pages/IFPage';
import { CaloriesPage } from './pages/CaloriesPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const { token } = useAuth();

  if (!token) return <AuthPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/rounds" element={<RoundsPage />} />
        <Route path="/weighin" element={<WeighInPage />} />
        <Route path="/if" element={<IFPage />} />
        <Route path="/calories" element={<CaloriesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
