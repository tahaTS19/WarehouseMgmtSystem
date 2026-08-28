import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from './AdminLayout';

vi.mock('../components/common/LogoutButton', () => ({
  default: () => <button>Log out</button>,
}));

function renderAdminLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<div>Dashboard Content</div>} />
          <Route path="/products" element={<div>Products Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminLayout', () => {
  it('renders the full admin navigation and the nested route content', () => {
    renderAdminLayout();

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    expect(screen.getByText('Warehouses')).toBeInTheDocument();
    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Suppliers')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Log out')).toBeInTheDocument();
  });

  it('starts with the mobile menu closed (aria-expanded=false)', () => {
    renderAdminLayout();

    expect(screen.getByLabelText(/toggle navigation menu/i)).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('opens the menu panel when the toggle button is clicked', async () => {
    renderAdminLayout();
    const toggle = screen.getByLabelText(/toggle navigation menu/i);

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes the menu again on a second click', async () => {
    renderAdminLayout();
    const toggle = screen.getByLabelText(/toggle navigation menu/i);

    await userEvent.click(toggle);
    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the menu automatically after a nav link is clicked', async () => {
    renderAdminLayout();
    const toggle = screen.getByLabelText(/toggle navigation menu/i);

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(screen.getByText('Products'));

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Products Content')).toBeInTheDocument();
  });
});

