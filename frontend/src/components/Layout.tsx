import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type NavItem = {
  to: string;
  label: string;
  testId?: string;
};

const navItems: NavItem[] = [
  { to: '/', label: 'Home', testId: 'nav-home' },
  { to: '/leaderboard', label: 'Leaders', testId: 'nav-leaders' },
  { to: '/rounds', label: 'Rounds' },
  { to: '/if', label: 'IF', testId: 'nav-if' },
  { to: '/calories', label: 'Calories' },
  { to: '/settings', label: 'Settings' },
];

export const Layout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WeightLoss League</p>
          <strong className="brand">WeightLoss Game</strong>
        </div>
        <div className="user-chip">
          <span>{user?.nickname}</span>
          <small>{user?.role}</small>
        </div>
      </header>

      <main className="page-content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            data-testid={item.testId}
            className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
        <button className="nav-pill nav-exit" type="button" onClick={logout}>Exit</button>
      </nav>
    </div>
  );
};
