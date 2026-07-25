import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import { getToken, setToken, clearToken } from '../services/api.js';
import * as authService from '../services/authService.js';

vi.mock('../services/api.js', () => ({
  getToken: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  apiErrorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));

vi.mock('../services/authService.js', () => ({
  login: vi.fn(),
  getMe: vi.fn(),
}));

function TestConsumer() {
  const { user, isAuthenticated, isLoading, error, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="authed">{String(isAuthenticated)}</div>
      <div data-testid="user">{user ? user.username : 'none'}</div>
      <div data-testid="error">{error || 'none'}</div>
      <button onClick={() => login('admin@example.com', 'Password123')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

describe('AuthContext — initial load', () => {
  it('finishes loading unauthenticated when there is no stored token', async () => {
    getToken.mockReturnValue(null);

    renderAuth();

    expect(await screen.findByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('authed')).toHaveTextContent('false');
    expect(authService.getMe).not.toHaveBeenCalled();
  });

  it('validates an existing token against /auth/me and becomes authenticated', async () => {
    getToken.mockReturnValue('existing-token');
    authService.getMe.mockResolvedValue({ id: '1', username: 'admin', email: 'admin@example.com' });

    renderAuth();

    expect(await screen.findByTestId('authed')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent('admin');
  });

  it('clears an invalid/expired stored token and stays unauthenticated', async () => {
    getToken.mockReturnValue('stale-token');
    authService.getMe.mockRejectedValue(new Error('401'));

    renderAuth();

    expect(await screen.findByTestId('authed')).toHaveTextContent('false');
    expect(clearToken).toHaveBeenCalled();
  });
});

describe('AuthContext — login', () => {
  beforeEach(() => {
    getToken.mockReturnValue(null);
  });

  it('stores the token and becomes authenticated on success', async () => {
    authService.login.mockResolvedValue({
      token: 'new-token',
      user: { id: '1', username: 'admin', email: 'admin@example.com' },
    });

    renderAuth();
    await screen.findByTestId('loading'); // wait past initial load

    await act(async () => {
      screen.getByText('login').click();
    });

    expect(setToken).toHaveBeenCalledWith('new-token');
    expect(screen.getByTestId('authed')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent('admin');
  });

  it('surfaces an error message and stays unauthenticated on failure', async () => {
    authService.login.mockRejectedValue({ response: { data: { message: 'Invalid email or password' } } });

    renderAuth();
    await screen.findByTestId('loading');

    await act(async () => {
      screen.getByText('login').click();
    });

    expect(screen.getByTestId('authed')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('Invalid email or password');
    expect(setToken).not.toHaveBeenCalled();
  });
});

describe('AuthContext — logout', () => {
  it('clears the token and user', async () => {
    getToken.mockReturnValue('existing-token');
    authService.getMe.mockResolvedValue({ id: '1', username: 'admin', email: 'admin@example.com' });

    renderAuth();
    expect(await screen.findByTestId('authed')).toHaveTextContent('true');

    await act(async () => {
      screen.getByText('logout').click();
    });

    expect(clearToken).toHaveBeenCalled();
    expect(screen.getByTestId('authed')).toHaveTextContent('false');
  });
});
