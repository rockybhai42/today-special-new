import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function LoginPage() {
  const { login, isAuthenticated, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated) {
    const redirectTo = location.state?.from?.pathname || '/';
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    const ok = await login(email, password);
    setIsSubmitting(false);
    if (ok) navigate('/', { replace: true });
  }

  return (
    <div className="login-shell">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>Manager Dashboard</h1>
        {error && <div className="banner banner-error">{error}</div>}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit" className="btn" disabled={isSubmitting} style={{ width: '100%' }}>
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
