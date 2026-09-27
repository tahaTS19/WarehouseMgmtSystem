import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InventoryValueReport from './InventoryValueReport';
import { api } from '../../services/apiClient';
import toast from 'react-hot-toast';

vi.mock('../../services/apiClient', () => ({
  api: { get: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const sampleResponse = {
  totals: {
    totalValuation: 125000.5,
    totalStockUnits: 3400,
    totalUniqueProducts: 85,
  },
  breakdownByWarehouse: [
    { warehouseId: 'wh1', warehouseName: 'Main Warehouse', valuation: 75000.25, totalUnits: 2000 },
    { warehouseId: 'wh2', warehouseName: 'Secondary Branch', valuation: 50000.25, totalUnits: 1400 },
  ],
};

describe('InventoryValueReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the three total StatCards from response.totals', async () => {
    api.get.mockResolvedValue(sampleResponse);

    render(<InventoryValueReport />);

    await waitFor(() => expect(screen.getByText('125000.50')).toBeInTheDocument());
    expect(screen.getByText('Total Valuation')).toBeInTheDocument();
    expect(screen.getByText('3400')).toBeInTheDocument();
    expect(screen.getByText('Total Stock Units')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('Unique Products')).toBeInTheDocument();
  });

  it('renders the per-warehouse breakdown table', async () => {
    api.get.mockResolvedValue(sampleResponse);

    render(<InventoryValueReport />);

    await waitFor(() => expect(screen.getByText('Main Warehouse')).toBeInTheDocument());
    expect(screen.getByText('75000.25')).toBeInTheDocument();
    expect(screen.getByText('Secondary Branch')).toBeInTheDocument();
    expect(screen.getByText('50000.25')).toBeInTheDocument();
  });

  it('does not render a breakdown table when breakdownByWarehouse is empty', async () => {
    api.get.mockResolvedValue({ totals: sampleResponse.totals, breakdownByWarehouse: [] });

    render(<InventoryValueReport />);

    await waitFor(() => expect(screen.getByText('Total Valuation')).toBeInTheDocument());
    expect(screen.queryByText('By Warehouse')).not.toBeInTheDocument();
  });

  it('shows a toast with the real backend message on failure', async () => {
    api.get.mockRejectedValue({ message: 'Something went wrong.' });

    render(<InventoryValueReport />);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong.'));
  });
});
