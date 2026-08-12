import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CategoryForm from './CategoryForm';
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

describe('CategoryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
  });

  it('renders in create mode with the right title and submit label', () => {
    render(
      <MemoryRouter>
        <CategoryForm />
      </MemoryRouter>,
    );

    expect(screen.getByText('Add Category')).toBeInTheDocument();
    expect(screen.getByText('Create Category')).toBeInTheDocument();
  });

  it('shows a validation error and does not submit if name is empty', async () => {
    render(
      <MemoryRouter>
        <CategoryForm />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByText('Create Category'));

    expect(await screen.findByText(/category name is required/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('calls POST /categories with the entered values on valid create submit', async () => {
    api.post.mockResolvedValue({ id: 'new-id' });

    render(
      <MemoryRouter>
        <CategoryForm />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Name'), 'Footwear');
    await userEvent.type(screen.getByLabelText('Description'), 'Shoes and boots');
    await userEvent.click(screen.getByText('Create Category'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/categories', {
        name: 'Footwear',
        description: 'Shoes and boots',
      }),
    );
    expect(toast.success).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/categories');
  });

  it('loads existing data and switches to edit mode when an id param is present', async () => {
    mockParams = { id: 'c1' };
    api.get.mockResolvedValue({ id: 'c1', name: 'Footwear', description: 'Shoes and boots' });

    render(
      <MemoryRouter>
        <CategoryForm />
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('Footwear')).toBeInTheDocument();
    expect(screen.getByText('Edit Category')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('calls PATCH /categories/:id on valid edit submit', async () => {
    mockParams = { id: 'c1' };
    api.get.mockResolvedValue({ id: 'c1', name: 'Footwear', description: 'Shoes and boots' });
    api.patch.mockResolvedValue({});

    render(
      <MemoryRouter>
        <CategoryForm />
      </MemoryRouter>,
    );

    await screen.findByDisplayValue('Footwear');
    await userEvent.click(screen.getByText('Save Changes'));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/categories/c1', {
        name: 'Footwear',
        description: 'Shoes and boots',
      }),
    );
  });

  it('shows a toast with the real backend message on a duplicate-name conflict', async () => {
    api.post.mockRejectedValue({ message: 'Category with name "Footwear" already exists.' });

    render(
      <MemoryRouter>
        <CategoryForm />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Name'), 'Footwear');
    await userEvent.click(screen.getByText('Create Category'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Category with name "Footwear" already exists.'),
    );
  });
});
