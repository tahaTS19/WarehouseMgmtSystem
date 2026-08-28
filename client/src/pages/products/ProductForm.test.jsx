import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProductForm from './ProductForm';
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

function envelope(data, overrides = {}) {
  return { data, page: 1, limit: 10, total: data.length, totalPages: 1, ...overrides };
}

const categories = [{ id: 'cat1', name: 'Jerseys' }];
const suppliers = [{ id: 'sup1', companyName: 'Textile Traders Co.' }];

function mockOptionsGet(extra) {
  api.get.mockImplementation((url) => {
    if (url === '/categories?all=true') return Promise.resolve(envelope(categories));
    if (url === '/suppliers?all=true') return Promise.resolve(envelope(suppliers));
    if (extra) return extra(url);
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

function makeImageFile({ type = 'image/png', size = 1024, name = 'photo.png' } = {}) {
  return new File(['a'.repeat(size)], name, { type });
}

// The image group has its own "Cancel" button (cancel the newly-picked
// file) AND the form has a separate, unrelated "Cancel" button (abandon
// the whole form, navigate back). Both literally say "Cancel" — scope the
// query to the image group specifically instead of a global lookup, which
// is ambiguous and will throw "found multiple elements".
function getImageCancelButton() {
  const fileInput = screen.getByLabelText('Product image');
  const imageGroup = fileInput.closest('div');
  return within(imageGroup).getByRole('button', { name: 'Cancel' });
}

describe('ProductForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-image');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders an image upload button and a placeholder when there is no image yet', async () => {
    mockOptionsGet();

    render(
      <MemoryRouter>
        <ProductForm />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Upload Image')).toBeInTheDocument();
    expect(screen.queryByText('Change Image')).not.toBeInTheDocument();
    expect(screen.queryByText('Remove Image')).not.toBeInTheDocument();
  });

  it('shows an error and does not accept a non-image file', async () => {
    mockOptionsGet();

    render(
      <MemoryRouter>
        <ProductForm />
      </MemoryRouter>,
    );

    await screen.findByText('Upload Image');
    const input = screen.getByLabelText('Product image');
    const badFile = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    // applyAccept: false — user-event normally filters files against the
    // input's `accept` attribute like a real file picker would, which means
    // this file would never reach onChange at all otherwise. Bypassing that
    // here tests the component's own JS validation as defense-in-depth,
    // since accept is only a UI hint — it can be bypassed (drag-and-drop,
    // devtools), so the real guard has to be in the handler itself.
    await userEvent.upload(input, badFile, { applyAccept: false });

    expect(await screen.findByText(/only jpg, png, or webp/i)).toBeInTheDocument();
  });

  it('shows an error and does not accept a file over 5MB', async () => {
    mockOptionsGet();

    render(
      <MemoryRouter>
        <ProductForm />
      </MemoryRouter>,
    );

    await screen.findByText('Upload Image');
    const input = screen.getByLabelText('Product image');
    const bigFile = makeImageFile({ size: 6 * 1024 * 1024 });
    await userEvent.upload(input, bigFile);

    expect(await screen.findByText(/5mb or smaller/i)).toBeInTheDocument();
  });

  it('accepts a valid image and shows Change Image and a Cancel button for it', async () => {
    mockOptionsGet();

    render(
      <MemoryRouter>
        <ProductForm />
      </MemoryRouter>,
    );

    await screen.findByText('Upload Image');
    const input = screen.getByLabelText('Product image');
    await userEvent.upload(input, makeImageFile());

    expect(await screen.findByText('Change Image')).toBeInTheDocument();
    expect(getImageCancelButton()).toBeInTheDocument();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('cancels a newly selected image and reverts to the Upload Image state', async () => {
    mockOptionsGet();

    render(
      <MemoryRouter>
        <ProductForm />
      </MemoryRouter>,
    );

    await screen.findByText('Upload Image');
    await userEvent.upload(screen.getByLabelText('Product image'), makeImageFile());
    await screen.findByText('Change Image');

    await userEvent.click(getImageCancelButton());

    expect(await screen.findByText('Upload Image')).toBeInTheDocument();
    expect(screen.queryByText('Change Image')).not.toBeInTheDocument();
  });

  it('creates the product first, then uploads the image against the returned id', async () => {
    mockOptionsGet();
    api.post.mockImplementation((url) => {
      if (url === '/products') return Promise.resolve({ id: 'new-product-id' });
      if (url === '/products/new-product-id/image') {
        return Promise.resolve({ id: 'new-product-id', image: 'https://res.cloudinary.com/x/y.jpg' });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    render(
      <MemoryRouter>
        <ProductForm />
      </MemoryRouter>,
    );

    await screen.findByText('Upload Image');
    await userEvent.upload(screen.getByLabelText('Product image'), makeImageFile());
    await userEvent.type(screen.getByLabelText('Name'), 'Home Jersey');
    await userEvent.type(screen.getByLabelText('SKU'), 'JER-001');
    await userEvent.type(screen.getByLabelText('Unit Price'), '45');
    await userEvent.click(screen.getByText('Create Product'));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/products', expect.any(Object)));
    await waitFor(() => {
      const call = api.post.mock.calls.find((c) => c[0] === '/products/new-product-id/image');
      expect(call).toBeTruthy();
      expect(call[1]).toBeInstanceOf(FormData);
    });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/products'));
  });

  it('does NOT set a Content-Type header on the image upload call', async () => {
    mockOptionsGet();
    api.post.mockImplementation((url) => {
      if (url === '/products') return Promise.resolve({ id: 'new-product-id' });
      if (url === '/products/new-product-id/image') {
        return Promise.resolve({ image: 'https://res.cloudinary.com/x/y.jpg' });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    render(
      <MemoryRouter>
        <ProductForm />
      </MemoryRouter>,
    );

    await screen.findByText('Upload Image');
    await userEvent.upload(screen.getByLabelText('Product image'), makeImageFile());
    await userEvent.type(screen.getByLabelText('Name'), 'Home Jersey');
    await userEvent.type(screen.getByLabelText('SKU'), 'JER-001');
    await userEvent.type(screen.getByLabelText('Unit Price'), '45');
    await userEvent.click(screen.getByText('Create Product'));

    await waitFor(() => {
      const call = api.post.mock.calls.find((c) => c[0] === '/products/new-product-id/image');
      expect(call).toBeTruthy();
      // Exactly two args: url and FormData — no third options/headers arg
      expect(call.length).toBe(2);
    });
  });

  it('still navigates away and shows the real backend message if the image upload fails after a successful product save', async () => {
    mockOptionsGet();
    api.post.mockImplementation((url) => {
      if (url === '/products') return Promise.resolve({ id: 'new-product-id' });
      if (url === '/products/new-product-id/image') {
        return Promise.reject({ message: 'File size exceeds 5MB.' });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    render(
      <MemoryRouter>
        <ProductForm />
      </MemoryRouter>,
    );

    await screen.findByText('Upload Image');
    await userEvent.upload(screen.getByLabelText('Product image'), makeImageFile());
    await userEvent.type(screen.getByLabelText('Name'), 'Home Jersey');
    await userEvent.type(screen.getByLabelText('SKU'), 'JER-001');
    await userEvent.type(screen.getByLabelText('Unit Price'), '45');
    await userEvent.click(screen.getByText('Create Product'));

    // The real backend message wins over the generic fallback — same rule
    // getErrorMessage applies everywhere else in this app.
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('File size exceeds 5MB.'));
    // Product itself DID save — this should not block navigation
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/products'));
    // Should NOT be conflated with the generic "could not save this product" failure
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining('Could not save this product'));
  });

  it('falls back to a generic message if the image upload fails with no specific error message at all', async () => {
    mockOptionsGet();
    api.post.mockImplementation((url) => {
      if (url === '/products') return Promise.resolve({ id: 'new-product-id' });
      if (url === '/products/new-product-id/image') {
        return Promise.reject({}); // no .message at all
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    render(
      <MemoryRouter>
        <ProductForm />
      </MemoryRouter>,
    );

    await screen.findByText('Upload Image');
    await userEvent.upload(screen.getByLabelText('Product image'), makeImageFile());
    await userEvent.type(screen.getByLabelText('Name'), 'Home Jersey');
    await userEvent.type(screen.getByLabelText('SKU'), 'JER-001');
    await userEvent.type(screen.getByLabelText('Unit Price'), '45');
    await userEvent.click(screen.getByText('Create Product'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Product saved, but the image failed to upload'),
      ),
    );
  });

  it('does not attempt an image upload at all when no file was selected', async () => {
    mockOptionsGet();
    api.post.mockResolvedValue({ id: 'new-product-id' });

    render(
      <MemoryRouter>
        <ProductForm />
      </MemoryRouter>,
    );

    await screen.findByText('Upload Image');
    await userEvent.type(screen.getByLabelText('Name'), 'Home Jersey');
    await userEvent.type(screen.getByLabelText('SKU'), 'JER-001');
    await userEvent.type(screen.getByLabelText('Unit Price'), '45');
    await userEvent.click(screen.getByText('Create Product'));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/products'));
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('loads the existing image in edit mode and offers Remove Image', async () => {
    mockParams = { id: 'p1' };
    mockOptionsGet((url) => {
      if (url === '/products/p1') {
        return Promise.resolve({
          id: 'p1',
          name: 'Home Jersey',
          sku: 'JER-001',
          unitPrice: '45.00',
          image: 'https://res.cloudinary.com/x/existing.jpg',
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(
      <MemoryRouter>
        <ProductForm />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Change Image')).toBeInTheDocument();
    expect(screen.getByText('Remove Image')).toBeInTheDocument();
    expect(screen.getByAltText('')).toHaveAttribute('src', 'https://res.cloudinary.com/x/existing.jpg');
  });

  it('removing an existing image calls PATCH with image: null', async () => {
    mockParams = { id: 'p1' };
    mockOptionsGet((url) => {
      if (url === '/products/p1') {
        return Promise.resolve({
          id: 'p1',
          name: 'Home Jersey',
          sku: 'JER-001',
          unitPrice: '45.00',
          image: 'https://res.cloudinary.com/x/existing.jpg',
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    api.patch.mockResolvedValue({});
    window.confirm = vi.fn(() => true);

    render(
      <MemoryRouter>
        <ProductForm />
      </MemoryRouter>,
    );

    await screen.findByText('Remove Image');
    await userEvent.click(screen.getByText('Remove Image'));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/products/p1', { image: null }));
    expect(screen.queryByText('Remove Image')).not.toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    mockOptionsGet();

    render(
      <MemoryRouter>
        <ProductForm />
      </MemoryRouter>,
    );

    await screen.findByText('Add Product');
    await userEvent.click(screen.getByText('Create Product'));

    expect(await screen.findByText(/product name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/sku is required/i)).toBeInTheDocument();
    expect(screen.getByText(/unit price is required/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric unit price', async () => {
    mockOptionsGet();

    render(
      <MemoryRouter>
        <ProductForm />
      </MemoryRouter>,
    );

    await screen.findByText('Add Product');
    await userEvent.type(screen.getByLabelText('Name'), 'Home Jersey');
    await userEvent.type(screen.getByLabelText('SKU'), 'JER-001');
    await userEvent.type(screen.getByLabelText('Unit Price'), 'abc');
    await userEvent.click(screen.getByText('Create Product'));

    expect(await screen.findByText(/valid non-negative number/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('calls PATCH /products/:id with JSON fields on edit submit, unaffected by image state', async () => {
    mockParams = { id: 'p1' };
    mockOptionsGet((url) => {
      if (url === '/products/p1') {
        return Promise.resolve({
          id: 'p1',
          name: 'Home Jersey',
          sku: 'JER-001',
          unitPrice: '45.00',
          categoryId: 'cat1',
          supplierId: 'sup1',
          image: null,
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    api.patch.mockResolvedValue({});

    render(
      <MemoryRouter>
        <ProductForm />
      </MemoryRouter>,
    );

    await screen.findByDisplayValue('Home Jersey');
    await userEvent.click(screen.getByText('Save Changes'));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/products/p1', {
        name: 'Home Jersey',
        sku: 'JER-001',
        description: undefined,
        unitPrice: 45,
        categoryId: 'cat1',
        supplierId: 'sup1',
      }),
    );
  });
});