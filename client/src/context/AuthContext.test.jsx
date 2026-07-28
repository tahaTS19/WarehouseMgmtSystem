import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { api } from '../services/apiClient';

vi.mock('../services/apiClient', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// A tiny consumer component that exposes AuthContext's state/actions as
// clickable buttons + visible text, so tests can interact with it the same
// way a real user would — through the rendered output, not internal state.
function TestConsumer() {
  const { user, isLoading, register, login, logout } = useAuth();

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user">{user ? user.role : 'none'}</span>
      <button onClick={() => register({ companyName: 'Nike', adminName: 'Ali', email: 'a@nike.com', password: 'x' })}>
        register
      </button>
      <button onClick={() => login({ email: 'a@nike.com', password: 'x' })}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls GET /auth/me on mount to restore the session from the httpOnly cookie', async () => {
    api.get.mockResolvedValue({ user: { userId: 'u1', role: 'admin', companyId: 'c1' } });

    renderWithProvider();

    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('admin');
    expect(api.get).toHaveBeenCalledWith('/auth/me');
  });

  it('sets user to null (not an error) when /auth/me returns 401 — not logged in is a normal state', async () => {
    api.get.mockRejectedValue(new Error('Request failed'));

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('sets the user after a successful register() call', async () => {
    api.get.mockRejectedValue(new Error('not logged in'));
    api.post.mockResolvedValue({ user: { userId: 'u2', role: 'admin', companyId: 'c2' } });

    const user = (await import('@testing-library/user-event')).default.setup();
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByText('register'));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('admin'));
    expect(api.post).toHaveBeenCalledWith('/auth/register', expect.any(Object));
  });

  it('sets the user after a successful login() call', async () => {
    api.get.mockRejectedValue(new Error('not logged in'));
    api.post.mockResolvedValue({ user: { userId: 'u3', role: 'staff', warehouseId: 'w1' } });

    const user = (await import('@testing-library/user-event')).default.setup();
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('staff'));
  });

  it('clears the user after logout() — which calls the backend, since JS cannot clear an httpOnly cookie itself', async () => {
    api.get.mockResolvedValue({ user: { userId: 'u1', role: 'admin', companyId: 'c1' } });
    api.post.mockResolvedValue({ success: true });

    const user = (await import('@testing-library/user-event')).default.setup();
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('admin'));

    await user.click(screen.getByText('logout'));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'));
    expect(api.post).toHaveBeenCalledWith('/auth/logout');
  });
});
