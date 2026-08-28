import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RoleLayout from './RoleLayout';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../components/common/LogoutButton', () => ({
  default: () => <button>Log out</button>,
}));

function renderAt(role) {
  useAuth.mockReturnValue({ user: { role } });
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<RoleLayout />}>
          <Route path="/dashboard" element={<div>Dashboard Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RoleLayout', () => {
  it('renders AdminLayout (full nav) when role is admin', () => {
    renderAt('admin');

    expect(screen.getByText('Warehouses')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('renders StaffLayout (narrower nav) when role is staff', () => {
    renderAt('staff');

    expect(screen.queryByText('Warehouses')).not.toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });
});
