import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import StaffForm from './StaffForm';
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

const sampleWarehouses = [
  { id: 'w1', name: 'Lahore' },
  { id: 'w2', name: 'Karachi' },
];

function mockEditGet(userOverrides = {}) {
  api.get.mockImplementation((path) =>
    path === '/warehouses'
      ? Promise.resolve(sampleWarehouses)
      : Promise.resolve({
          id: 'u1',
          name: 'Sara Khan',
          email: 'sara@nike.com',
          warehouseId: 'w1',
          ...userOverrides,
        }),
  );
}

describe('StaffForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
    api.get.mockResolvedValue(sampleWarehouses);
  });

  it('renders the Password field in create mode', async () => {
    render(
      <MemoryRouter>
        <StaffForm />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('Select a warehouse…')).toBeInTheDocument());
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('does not render the Password field in edit mode', async () => {
    mockParams = { id: 'u1' };
    mockEditGet();

    render(
      <MemoryRouter>
        <StaffForm />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByDisplayValue('Sara Khan')).toBeInTheDocument());
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('shows validation errors for empty required fields and does not submit', async () => {
    render(
      <MemoryRouter>
        <StaffForm />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('Select a warehouse…')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Create Staff Account'));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/please select a warehouse/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits POST /users with the right payload on valid create', async () => {
    api.post.mockResolvedValue({ id: 'new-id' });

    render(
      <MemoryRouter>
        <StaffForm />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('Select a warehouse…')).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText('Name'), 'Bilal Ahmed');
    await userEvent.type(screen.getByLabelText('Email'), 'bilal@nike.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.selectOptions(screen.getByLabelText('Warehouse'), 'w2');
    await userEvent.click(screen.getByText('Create Staff Account'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/users', {
        name: 'Bilal Ahmed',
        email: 'bilal@nike.com',
        password: 'secret123',
        phone: undefined,
        warehouseId: 'w2',
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith('/employees');
  });

  it('submits PATCH /users/:id without a password field on valid edit', async () => {
    mockParams = { id: 'u1' };
    mockEditGet();
    api.patch.mockResolvedValue({});

    render(
      <MemoryRouter>
        <StaffForm />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByDisplayValue('Sara Khan')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Save Changes'));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/users/u1', {
        name: 'Sara Khan',
        email: 'sara@nike.com',
        phone: undefined,
        warehouseId: 'w1',
      }),
    );
  });

  it('shows a toast error if submit fails', async () => {
    api.post.mockRejectedValue({ message: 'Email address already registered.' });

    render(
      <MemoryRouter>
        <StaffForm />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('Select a warehouse…')).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText('Name'), 'Bilal Ahmed');
    await userEvent.type(screen.getByLabelText('Email'), 'bilal@nike.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.selectOptions(screen.getByLabelText('Warehouse'), 'w2');
    await userEvent.click(screen.getByText('Create Staff Account'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Email address already registered.'));
  });
});
