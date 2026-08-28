import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import WarehouseForm from './WarehouseForm';
import { api } from '../../services/apiClient';
import toast from 'react-hot-toast';

vi.mock('../../services/apiClient', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockNavigate = vi.fn();
let mockParams = {};
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

describe('WarehouseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
  });

  it('renders in create mode with the right title and submit label', () => {
    render(
      <MemoryRouter>
        <WarehouseForm />
      </MemoryRouter>,
    );

    expect(screen.getByText('Add Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Create Warehouse')).toBeInTheDocument();
  });

  it('shows a validation error and does not submit if name is empty', async () => {
    render(
      <MemoryRouter>
        <WarehouseForm />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByText('Create Warehouse'));

    expect(await screen.findByText(/warehouse name is required/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('calls POST /warehouses with the entered values on valid create submit', async () => {
    api.post.mockResolvedValue({ id: 'new-id' });

    render(
      <MemoryRouter>
        <WarehouseForm />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Name'), 'Karachi');
    await userEvent.type(screen.getByLabelText('Location'), 'Karachi, PK');
    await userEvent.click(screen.getByText('Create Warehouse'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/warehouses', {
        name: 'Karachi',
        location: 'Karachi, PK',
      }),
    );
    expect(toast.success).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/warehouses');
  });

  it('loads existing data and switches to edit mode when an id param is present', async () => {
    mockParams = { id: 'w1' };
    api.get.mockResolvedValue({ id: 'w1', name: 'Lahore', location: 'Lahore, PK' });

    render(
      <MemoryRouter>
        <WarehouseForm />
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('Lahore')).toBeInTheDocument();
    expect(screen.getByText('Edit Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('calls PATCH /warehouses/:id on valid edit submit', async () => {
    mockParams = { id: 'w1' };
    api.get.mockResolvedValue({ id: 'w1', name: 'Lahore', location: 'Lahore, PK' });
    api.patch.mockResolvedValue({});

    render(
      <MemoryRouter>
        <WarehouseForm />
      </MemoryRouter>,
    );

    await screen.findByDisplayValue('Lahore');
    await userEvent.click(screen.getByText('Save Changes'));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/warehouses/w1', {
        name: 'Lahore',
        location: 'Lahore, PK',
      }),
    );
  });

  it('shows a toast with the real error message if submit fails', async () => {
    api.post.mockRejectedValue({ message: 'Something went wrong.' });

    render(
      <MemoryRouter>
        <WarehouseForm />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Name'), 'Karachi');
    await userEvent.click(screen.getByText('Create Warehouse'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong.'));
  });
});
