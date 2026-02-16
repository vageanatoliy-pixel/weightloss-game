import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Layout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header>
        <strong>WeightLoss Game</strong>
        <div>{user?.nickname}</div>
      </header>
      <main>
        <Outlet />
      </main>
      <nav>
        <Link data-testid="nav-home" to="/">Home</Link>
        <Link data-testid="nav-leaders" to="/leaderboard">Leaders</Link>
        <Link to="/rounds">Rounds</Link>
        <Link data-testid="nav-if" to="/if">IF</Link>
        <Link to="/calories">Calories</Link>
        <Link to="/settings">Settings</Link>
        <button type="button" onClick={logout}>Exit</button>
      </nav>
    </div>
  );
};
