import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ReportsPage from './ReportsPage';
import { api } from '../../services/apiClient';

vi.mock('../../services/apiClient', () => ({
  api: { get: vi.fn(() => new Promise(() => {})) }, // never resolves — just testing tab switching
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ReportsPage />
    </MemoryRouter>,
  );
}

describe('ReportsPage', () => {
  it('shows Low Stock as the active tab by default', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: 'Low Stock' })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches the active tab when another is clicked', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: 'Inventory Value' }));

    expect(screen.getByRole('tab', { name: 'Inventory Value' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Low Stock' })).toHaveAttribute('aria-selected', 'false');
  });

  it('renders all four tabs', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: 'Low Stock' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Inventory Value' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Product Movement' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Recent Transactions' })).toBeInTheDocument();
  });
});
