import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

function renderWithAuthState(authState) {
  useAuth.mockReturnValue(authState);
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('renders nothing while auth state is still loading', () => {
    renderWithAuthState({ isAuthenticated: false, isLoading: true });

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    renderWithAuthState({ isAuthenticated: false, isLoading: false });

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders the protected route content when authenticated', () => {
    renderWithAuthState({ isAuthenticated: true, isLoading: false });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
