import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/apiClient';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../services/apiClient', () => ({
  api: { get: vi.fn() },
}));

const adminSummary = {
  totalWarehouses: 3,
  totalProducts: 42,
  totalCategories: 5,
  totalSuppliers: 7,
  lowStockCount: 2,
  transactionsToday: 10,
  stockInVsOut: { stockIn: 50, stockOut: 20 },
  productsByCategory: [{ category: 'Footwear', count: 12 }],
  recentTransactions: [],
};

const staffSummary = {
  totalProducts: 15,
  transactionsToday: 4,
  recentActivity: [],
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state before the summary arrives', () => {
    useAuth.mockReturnValue({ user: { role: 'admin' } });
    api.get.mockReturnValue(new Promise(() => {})); // never resolves in this test

    render(<Dashboard />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches from /dashboard/summary on mount', () => {
    useAuth.mockReturnValue({ user: { role: 'admin' } });
    api.get.mockReturnValue(new Promise(() => {}));

    render(<Dashboard />);

    expect(api.get).toHaveBeenCalledWith('/dashboard/summary');
  });

  it('renders the full admin stat set when role is admin', async () => {
    useAuth.mockReturnValue({ user: { role: 'admin' } });
    api.get.mockResolvedValue(adminSummary);

    render(<Dashboard />);

    await waitFor(() => expect(screen.getByText('Warehouses')).toBeInTheDocument());
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Suppliers')).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
  });

  it('renders the charts for admin', async () => {
    useAuth.mockReturnValue({ user: { role: 'admin' } });
    api.get.mockResolvedValue(adminSummary);

    render(<Dashboard />);

    await waitFor(() => expect(screen.getByText('Stock In vs Out')).toBeInTheDocument());
    expect(screen.getByText('Products by Category')).toBeInTheDocument();
  });

  it('renders only the staff-relevant stat cards when role is staff', async () => {
    useAuth.mockReturnValue({ user: { role: 'staff' } });
    api.get.mockResolvedValue(staffSummary);

    render(<Dashboard />);

    await waitFor(() => expect(screen.getByText('Products')).toBeInTheDocument());
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.queryByText('Warehouses')).not.toBeInTheDocument();
    expect(screen.queryByText('Suppliers')).not.toBeInTheDocument();
    expect(screen.queryByText('Low Stock')).not.toBeInTheDocument();
  });

  it('does not render charts for staff, since their response has no chart data', async () => {
    useAuth.mockReturnValue({ user: { role: 'staff' } });
    api.get.mockResolvedValue(staffSummary);

    render(<Dashboard />);

    await waitFor(() => expect(screen.getByText('Products')).toBeInTheDocument());
    expect(screen.queryByText('Stock In vs Out')).not.toBeInTheDocument();
    expect(screen.queryByText('Products by Category')).not.toBeInTheDocument();
  });

  it('shows an error message if the summary request fails', async () => {
    useAuth.mockReturnValue({ user: { role: 'admin' } });
    api.get.mockRejectedValue(new Error('Network error'));

    render(<Dashboard />);

    await waitFor(() =>
      expect(screen.getByText(/could not load dashboard data/i)).toBeInTheDocument(),
    );
  });

  it('shows an empty state when there is no recent activity', async () => {
    useAuth.mockReturnValue({ user: { role: 'staff' } });
    api.get.mockResolvedValue(staffSummary);

    render(<Dashboard />);

    await waitFor(() => expect(screen.getByText(/no recent activity yet/i)).toBeInTheDocument());
  });

  it('renders recent transaction rows for admin when present', async () => {
    useAuth.mockReturnValue({ user: { role: 'admin' } });
    api.get.mockResolvedValue({
      ...adminSummary,
      recentTransactions: [
        { id: 't1', type: 'stock_in', reason: 'purchase', quantity: 50, createdAt: '2026-06-01T09:00:00Z' },
      ],
    });

    render(<Dashboard />);

    await waitFor(() => expect(screen.getByText('stock_in')).toBeInTheDocument());
    expect(screen.getByText('purchase')).toBeInTheDocument();
  });
});
