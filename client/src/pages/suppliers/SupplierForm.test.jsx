import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SupplierForm from './SupplierForm';
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

describe('SupplierForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
  });

  it('renders in create mode with the right title and submit label', () => {
    render(
      <MemoryRouter>
        <SupplierForm />
      </MemoryRouter>,
    );

    expect(screen.getByText('Add Supplier')).toBeInTheDocument();
    expect(screen.getByText('Create Supplier')).toBeInTheDocument();
  });

  it('shows a validation error and does not submit if company name is empty', async () => {
    render(
      <MemoryRouter>
        <SupplierForm />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByText('Create Supplier'));

    expect(await screen.findByText(/company name is required/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('calls POST /suppliers with only company name when everything else is left blank', async () => {
    api.post.mockResolvedValue({ id: 'new-id' });

    render(
      <MemoryRouter>
        <SupplierForm />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Company Name'), 'Rubber Sole Ltd.');
    await userEvent.click(screen.getByText('Create Supplier'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/suppliers', {
        companyName: 'Rubber Sole Ltd.',
        contactPerson: undefined,
        phone: undefined,
        email: undefined,
        address: undefined,
      }),
    );
    expect(toast.success).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/suppliers');
  });

  it('calls POST /suppliers with all fields filled in', async () => {
    api.post.mockResolvedValue({ id: 'new-id' });

    render(
      <MemoryRouter>
        <SupplierForm />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Company Name'), 'Textile Traders Co.');
    await userEvent.type(screen.getByLabelText('Contact Person'), 'Ahmed Sheikh');
    await userEvent.type(screen.getByLabelText('Phone'), '03001234567');
    await userEvent.type(screen.getByLabelText('Email'), 'ahmed@textiletraders.com');
    await userEvent.type(screen.getByLabelText('Address'), '12 Industrial Road, Lahore');
    await userEvent.click(screen.getByText('Create Supplier'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/suppliers', {
        companyName: 'Textile Traders Co.',
        contactPerson: 'Ahmed Sheikh',
        phone: '03001234567',
        email: 'ahmed@textiletraders.com',
        address: '12 Industrial Road, Lahore',
      }),
    );
  });

  it('loads existing data and switches to edit mode when an id param is present', async () => {
    mockParams = { id: 's1' };
    api.get.mockResolvedValue({
      id: 's1',
      companyName: 'Textile Traders Co.',
      contactPerson: 'Ahmed Sheikh',
      phone: '03001234567',
      email: 'ahmed@textiletraders.com',
      address: '12 Industrial Road, Lahore',
    });

    render(
      <MemoryRouter>
        <SupplierForm />
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('Textile Traders Co.')).toBeInTheDocument();
    expect(screen.getByText('Edit Supplier')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('calls PATCH /suppliers/:id on valid edit submit', async () => {
    mockParams = { id: 's1' };
    api.get.mockResolvedValue({
      id: 's1',
      companyName: 'Textile Traders Co.',
      contactPerson: 'Ahmed Sheikh',
      phone: '',
      email: '',
      address: '',
    });
    api.patch.mockResolvedValue({});

    render(
      <MemoryRouter>
        <SupplierForm />
      </MemoryRouter>,
    );

    await screen.findByDisplayValue('Textile Traders Co.');
    await userEvent.click(screen.getByText('Save Changes'));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/suppliers/s1', {
        companyName: 'Textile Traders Co.',
        contactPerson: 'Ahmed Sheikh',
        phone: undefined,
        email: undefined,
        address: undefined,
      }),
    );
  });

  it('shows a toast with the real backend message on submit failure', async () => {
    api.post.mockRejectedValue({ message: 'Something went wrong.' });

    render(
      <MemoryRouter>
        <SupplierForm />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Company Name'), 'Rubber Sole Ltd.');
    await userEvent.click(screen.getByText('Create Supplier'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong.'));
  });
});
