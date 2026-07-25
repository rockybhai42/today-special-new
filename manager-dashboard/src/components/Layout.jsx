import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-title">
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            Today's Special
          </Link>
        </div>
        <div className="topbar-actions">
          <Link to="/preview">Preview Playlist</Link>
          <span>{user?.username}</span>
          <button type="button" className="btn btn-secondary btn-icon" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
