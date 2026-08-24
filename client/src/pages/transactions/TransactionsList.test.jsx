import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TransactionsList from './TransactionsList';
import { api } from '../../services/apiClient';
import toast from 'react-hot-toast';

vi.mock('../../services/apiClient', () => ({
  api: { get: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function envelope(data, overrides = {}) {
  return { data, page: 1, limit: 10, total: data.length, totalPages: 1, ...overrides };
}

const sampleTransactions = [
  {
    id: 't1',
    warehouseInventoryId: 'wi1',
    quantity: 10,
    type: 'stock_in',
    reason: 'purchase',
    userId: 'u1',
    createdAt: '2026-08-21T14:56:56.000Z',
    warehouseInventory: {
      id: 'wi1',
      currentStock: 110,
      warehouse: { id: 'w1', name: 'Main Warehouse' },
      product: { id: 'p1', name: 'Wireless Mouse', sku: 'WM-001' },
    },
    user: { id: 'u1', name: 'John Doe', email: 'john@example.com' },
  },
];

describe('TransactionsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads rows from response.data and renders the nested product/warehouse/user fields', async () => {
    api.get.mockResolvedValue(envelope(sampleTransactions));

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Wireless Mouse (WM-001)')).toBeInTheDocument());
    expect(screen.getByText('Main Warehouse')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders human-readable labels for type and reason, not raw enum values', async () => {
    api.get.mockResolvedValue(envelope(sampleTransactions));

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Stock In')).toBeInTheDocument());
    expect(screen.getByText('Purchase')).toBeInTheDocument();
    expect(screen.queryByText('stock_in')).not.toBeInTheDocument();
  });

  it('never renders any edit or delete action — immutable audit log', async () => {
    api.get.mockResolvedValue(envelope(sampleTransactions));

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Wireless Mouse (WM-001)')).toBeInTheDocument());
    expect(screen.queryByLabelText(/^Edit /)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Delete /)).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument();
  });

  it('requests page and limit query params on initial load', async () => {
    api.get.mockResolvedValue(envelope(sampleTransactions));

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/transactions?page=1&limit=10'));
  });

  it('debounces search input before calling the API with a search param', async () => {
    vi.useFakeTimers();
    api.get.mockResolvedValue(envelope(sampleTransactions));

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await vi.waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    const user = userEvent.setup({ delay: null });
    await user.type(screen.getByPlaceholderText('Search by product name or SKU…'), 'WM-001');

    expect(api.get).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(400);

    expect(api.get).toHaveBeenLastCalledWith('/transactions?page=1&limit=10&search=WM-001');
    vi.useRealTimers();
  });

  it('selecting a type filter sends the type param immediately', async () => {
    api.get.mockResolvedValue(envelope(sampleTransactions));

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText('Filter by type')).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByLabelText('Filter by type'), 'stock_out');

    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/transactions?page=1&limit=10&type=stock_out'),
    );
  });

  it('selecting a reason filter sends the reason param immediately', async () => {
    api.get.mockResolvedValue(envelope(sampleTransactions));

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText('Filter by reason')).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByLabelText('Filter by reason'), 'damage');

    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/transactions?page=1&limit=10&reason=damage'),
    );
  });

  it('shows the empty state with a record-first CTA when there are no transactions at all', async () => {
    api.get.mockResolvedValue(envelope([], { totalPages: 0 }));

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('No transactions yet.')).toBeInTheDocument());
    expect(screen.getByText('Record your first stock movement')).toBeInTheDocument();
  });

  it('navigates to the create form when Record Stock Movement is clicked', async () => {
    api.get.mockResolvedValue(envelope(sampleTransactions));

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Wireless Mouse (WM-001)')).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText('Record Stock Movement'));

    expect(mockNavigate).toHaveBeenCalledWith('/transactions/new');
  });

  it('shows a toast with the real backend message if loading fails', async () => {
    api.get.mockRejectedValue({ message: 'Something went wrong.' });

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong.'));
  });
});