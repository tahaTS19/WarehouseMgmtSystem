import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LowStockReport from './LowStockReport';
import { api } from '../../services/apiClient';
import toast from 'react-hot-toast';

vi.mock('../../services/apiClient', () => ({
  api: { get: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const sampleRow = {
  id: 'wi1',
  currentStock: 3,
  minimumStock: 10,
  product: { id: 'p1', name: 'Wireless Mouse', sku: 'WM-001' },
  warehouse: { id: 'w1', name: 'Main Warehouse' },
};

describe('LowStockReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders rows when the response is a raw array', async () => {
    api.get.mockResolvedValue([sampleRow]);

    render(<LowStockReport />);

    await waitFor(() => expect(screen.getByText('Wireless Mouse (WM-001)')).toBeInTheDocument());
    expect(screen.getByText('Main Warehouse')).toBeInTheDocument();
  });

  it('renders rows when the response is wrapped in a { data: [...] } envelope', async () => {
    api.get.mockResolvedValue({ data: [sampleRow] });

    render(<LowStockReport />);

    await waitFor(() => expect(screen.getByText('Wireless Mouse (WM-001)')).toBeInTheDocument());
  });

  it('shows the empty state when nothing is below minimum stock', async () => {
    api.get.mockResolvedValue([]);

    render(<LowStockReport />);

    await waitFor(() =>
      expect(
        screen.getByText('Nothing is below its minimum stock level right now.'),
      ).toBeInTheDocument(),
    );
  });

  it('shows a toast with the real backend message on failure', async () => {
    api.get.mockRejectedValue({ message: 'Something went wrong.' });

    render(<LowStockReport />);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong.'));
  });
});
