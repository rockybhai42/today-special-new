import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getToken, setToken, clearToken, apiErrorMessage } from '../services/api.js';
import * as authService from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Starts true so ProtectedRoute doesn't flash a redirect to /login while
  // an existing token is still being validated against GET /api/auth/me.
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    authService
      .getMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const { token, user: loggedInUser } = await authService.login(email, password);
      setToken(token);
      setUser(loggedInUser);
      return true;
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed'));
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: Boolean(user), isLoading, error, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
