import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function renderWithRoute({ allowedRoles } = {}) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/dashboard" element={<div>Protected Dashboard Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('shows a loading state while auth is still resolving, without redirecting yet', () => {
    useAuth.mockReturnValue({ user: null, isLoading: true });

    renderWithRoute();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when there is no authenticated user', () => {
    useAuth.mockReturnValue({ user: null, isLoading: false });

    renderWithRoute();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });

  it('renders the nested route content via Outlet when a user is authenticated', () => {
    useAuth.mockReturnValue({ user: { userId: 'u1', role: 'admin' }, isLoading: false });

    renderWithRoute();

    expect(screen.getByText('Protected Dashboard Content')).toBeInTheDocument();
  });

  it('redirects to /login when the user role is not in allowedRoles', () => {
    useAuth.mockReturnValue({ user: { userId: 'u2', role: 'staff' }, isLoading: false });

    renderWithRoute({ allowedRoles: ['admin'] });

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });

  it('renders content when the user role IS included in allowedRoles', () => {
    useAuth.mockReturnValue({ user: { userId: 'u3', role: 'admin' }, isLoading: false });

    renderWithRoute({ allowedRoles: ['admin'] });

    expect(screen.getByText('Protected Dashboard Content')).toBeInTheDocument();
  });
});
