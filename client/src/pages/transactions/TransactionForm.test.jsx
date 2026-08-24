import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TransactionForm from './TransactionForm';
import { api } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

vi.mock('../../services/apiClient', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
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

const warehouses = [{ id: 'w1', name: 'Main Warehouse' }];
const inventoryRows = [
  { id: 'wi1', currentStock: 20, product: { id: 'p1', name: 'Wireless Mouse', sku: 'WM-001' } },
];

function mockGetForAdmin() {
  api.get.mockImplementation((url) => {
    if (url === '/warehouses?all=true') return Promise.resolve(envelope(warehouses));
    if (url === '/warehouse-inventory?warehouseId=w1&all=true') {
      return Promise.resolve(envelope(inventoryRows));
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

function mockGetForStaff() {
  api.get.mockImplementation((url) => {
    if (url === '/warehouse-inventory?all=true') return Promise.resolve(envelope(inventoryRows));
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

async function selectWarehouseAndProductAsAdmin() {
  await screen.findByText('Record Stock Movement');
  await userEvent.selectOptions(screen.getByLabelText('Warehouse'), 'w1');
  await screen.findByText('Wireless Mouse (WM-001) — 20 in stock');
  await userEvent.selectOptions(screen.getByLabelText('Product'), 'wi1');
}

describe('TransactionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { role: 'admin' } });
  });

  describe('as Admin', () => {
    it('renders a Warehouse picker and never calls /warehouse-inventory until one is chosen', async () => {
      mockGetForAdmin();

      render(
        <MemoryRouter>
          <TransactionForm />
        </MemoryRouter>,
      );

      await screen.findByText('Record Stock Movement');
      expect(screen.getByLabelText('Warehouse')).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith('/warehouses?all=true');
      expect(api.get).not.toHaveBeenCalledWith(expect.stringContaining('/warehouse-inventory'));
    });

    it('disables the Product select until a warehouse is chosen', async () => {
      mockGetForAdmin();

      render(
        <MemoryRouter>
          <TransactionForm />
        </MemoryRouter>,
      );

      await screen.findByText('Record Stock Movement');
      expect(screen.getByLabelText('Product')).toBeDisabled();
    });

    it('loads inventory scoped to the selected warehouse and populates Product', async () => {
      mockGetForAdmin();

      render(
        <MemoryRouter>
          <TransactionForm />
        </MemoryRouter>,
      );

      await screen.findByText('Record Stock Movement');
      await userEvent.selectOptions(screen.getByLabelText('Warehouse'), 'w1');

      expect(await screen.findByText('Wireless Mouse (WM-001) — 20 in stock')).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith('/warehouse-inventory?warehouseId=w1&all=true');
    });

    it('resets the product selection when the warehouse changes', async () => {
      mockGetForAdmin();

      render(
        <MemoryRouter>
          <TransactionForm />
        </MemoryRouter>,
      );

      await selectWarehouseAndProductAsAdmin();
      expect(screen.getByLabelText('Product')).toHaveValue('wi1');

      await userEvent.selectOptions(screen.getByLabelText('Warehouse'), '');
      expect(screen.getByLabelText('Product')).toHaveValue('');
    });

    it('requires a warehouse to be selected before submitting', async () => {
      mockGetForAdmin();

      render(
        <MemoryRouter>
          <TransactionForm />
        </MemoryRouter>,
      );

      await screen.findByText('Record Stock Movement');
      await userEvent.click(screen.getByText('Record Movement'));

      expect(await screen.findByText(/please select a warehouse/i)).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('submits the correct payload once warehouse and product are both selected', async () => {
      mockGetForAdmin();
      api.post.mockResolvedValue({});

      render(
        <MemoryRouter>
          <TransactionForm />
        </MemoryRouter>,
      );

      await selectWarehouseAndProductAsAdmin();
      await userEvent.selectOptions(screen.getByLabelText('Reason'), 'purchase');
      await userEvent.type(screen.getByLabelText('Quantity'), '15');
      await userEvent.click(screen.getByText('Record Movement'));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith('/transactions', {
          warehouseInventoryId: 'wi1',
          quantity: 15,
          type: 'stock_in',
          reason: 'purchase',
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/transactions');
    });
  });

  describe('as Staff', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ user: { role: 'staff' } });
    });

    it('never renders a Warehouse picker at all', async () => {
      mockGetForStaff();

      render(
        <MemoryRouter>
          <TransactionForm />
        </MemoryRouter>,
      );

      await screen.findByText('Record Stock Movement');
      expect(screen.queryByLabelText('Warehouse')).not.toBeInTheDocument();
    });

    it('calls /warehouse-inventory?all=true directly on mount, with no warehouseId param', async () => {
      mockGetForStaff();

      render(
        <MemoryRouter>
          <TransactionForm />
        </MemoryRouter>,
      );

      await waitFor(() => expect(api.get).toHaveBeenCalledWith('/warehouse-inventory?all=true'));
      expect(api.get).not.toHaveBeenCalledWith('/warehouses?all=true');
    });

    it('Product select is enabled immediately, not gated on a warehouse selection', async () => {
      mockGetForStaff();

      render(
        <MemoryRouter>
          <TransactionForm />
        </MemoryRouter>,
      );

      await screen.findByText('Wireless Mouse (WM-001) — 20 in stock');
      expect(screen.getByLabelText('Product')).not.toBeDisabled();
    });

    it('does not require a warehouse selection to submit', async () => {
      mockGetForStaff();
      api.post.mockResolvedValue({});

      render(
        <MemoryRouter>
          <TransactionForm />
        </MemoryRouter>,
      );

      await screen.findByText('Wireless Mouse (WM-001) — 20 in stock');
      await userEvent.selectOptions(screen.getByLabelText('Product'), 'wi1');
      await userEvent.type(screen.getByLabelText('Quantity'), '5');
      await userEvent.click(screen.getByText('Record Movement'));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith('/transactions', {
          warehouseInventoryId: 'wi1',
          quantity: 5,
          type: 'stock_in',
          reason: 'purchase',
        }),
      );
    });
  });

  it('switches the active type when Stock Out is clicked', async () => {
    mockGetForAdmin();

    render(
      <MemoryRouter>
        <TransactionForm />
      </MemoryRouter>,
    );

    await screen.findByText('Record Stock Movement');
    await userEvent.click(screen.getByRole('radio', { name: 'Stock Out' }));

    expect(screen.getByRole('radio', { name: 'Stock Out' })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows validation errors when required fields are missing', async () => {
    mockGetForAdmin();

    render(
      <MemoryRouter>
        <TransactionForm />
      </MemoryRouter>,
    );

    await screen.findByText('Record Stock Movement');
    await userEvent.click(screen.getByText('Record Movement'));

    expect(await screen.findByText(/please select a product/i)).toBeInTheDocument();
    expect(screen.getByText(/quantity must be a whole number/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('rejects a zero or negative quantity', async () => {
    mockGetForAdmin();

    render(
      <MemoryRouter>
        <TransactionForm />
      </MemoryRouter>,
    );

    await selectWarehouseAndProductAsAdmin();
    await userEvent.type(screen.getByLabelText('Quantity'), '0');
    await userEvent.click(screen.getByText('Record Movement'));

    expect(await screen.findByText(/quantity must be a whole number/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('rejects a stock-out quantity greater than current stock (client-side pre-check)', async () => {
    mockGetForAdmin();

    render(
      <MemoryRouter>
        <TransactionForm />
      </MemoryRouter>,
    );

    await selectWarehouseAndProductAsAdmin();
    await userEvent.click(screen.getByRole('radio', { name: 'Stock Out' }));
    await userEvent.type(screen.getByLabelText('Quantity'), '999');
    await userEvent.click(screen.getByText('Record Movement'));

    expect(await screen.findByText(/only 20 in stock/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('allows a stock-in quantity that exceeds current stock (no ceiling on stock in)', async () => {
    mockGetForAdmin();
    api.post.mockResolvedValue({});

    render(
      <MemoryRouter>
        <TransactionForm />
      </MemoryRouter>,
    );

    await selectWarehouseAndProductAsAdmin();
    await userEvent.type(screen.getByLabelText('Quantity'), '999');
    await userEvent.click(screen.getByText('Record Movement'));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
  });

  it('submits the correct payload for a stock-out transaction', async () => {
    mockGetForAdmin();
    api.post.mockResolvedValue({});

    render(
      <MemoryRouter>
        <TransactionForm />
      </MemoryRouter>,
    );

    await selectWarehouseAndProductAsAdmin();
    await userEvent.click(screen.getByRole('radio', { name: 'Stock Out' }));
    await userEvent.selectOptions(screen.getByLabelText('Reason'), 'sale');
    await userEvent.type(screen.getByLabelText('Quantity'), '5');
    await userEvent.click(screen.getByText('Record Movement'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/transactions', {
        warehouseInventoryId: 'wi1',
        quantity: 5,
        type: 'stock_out',
        reason: 'sale',
      }),
    );
    expect(toast.success).toHaveBeenCalledWith('Stock out recorded.');
  });

  it('shows the real backend message on a 400 (e.g. insufficient stock caught server-side)', async () => {
    mockGetForAdmin();
    api.post.mockRejectedValue({
      message: 'Insufficient stock. Current stock is 5, requested stock out is 10.',
    });

    render(
      <MemoryRouter>
        <TransactionForm />
      </MemoryRouter>,
    );

    await selectWarehouseAndProductAsAdmin();
    await userEvent.type(screen.getByLabelText('Quantity'), '10');
    await userEvent.click(screen.getByText('Record Movement'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Insufficient stock. Current stock is 5, requested stock out is 10.',
      ),
    );
    expect(mockNavigate).not.toHaveBeenCalledWith('/transactions');
  });

  it('shows the current stock hint once a product is selected', async () => {
    mockGetForAdmin();

    render(
      <MemoryRouter>
        <TransactionForm />
      </MemoryRouter>,
    );

    await selectWarehouseAndProductAsAdmin();
    expect(screen.getByText('Current stock: 20')).toBeInTheDocument();
  });
});
