import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ProductsList from "./ProductsList";
import { api } from "../../services/apiClient";
import toast from "react-hot-toast";

vi.mock("../../services/apiClient", () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function envelope(data, overrides = {}) {
  return {
    data,
    page: 1,
    limit: 10,
    total: data.length,
    totalPages: 1,
    ...overrides,
  };
}

const sampleProducts = [
  {
    id: "p1",
    name: "Home Jersey 2026",
    sku: "JER-001",
    categoryId: "cat1",
    supplierId: "sup1",
    unitPrice: "45.00",
  },
];

const categories = [
  {
    id: "cat1",
    name: "Jerseys",
  },
];

const suppliers = [
  {
    id: "sup1",
    companyName: "Textile Traders Co.",
  },
];

function mockGetDefault() {
  api.get.mockImplementation((url) => {
    if (url === "/categories?all=true") {
      return Promise.resolve(envelope(categories));
    }

    if (url === "/suppliers?all=true") {
      return Promise.resolve(envelope(suppliers));
    }

    return Promise.resolve(envelope(sampleProducts));
  });
}

function renderProductsList() {
  return render(
    <MemoryRouter>
      <ProductsList />
    </MemoryRouter>,
  );
}

describe("ProductsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders products and resolves category and supplier names", async () => {
    mockGetDefault();

    renderProductsList();

    const productName = await screen.findByText("Home Jersey 2026");
    expect(productName).toBeInTheDocument();

    // Scope these assertions to the table so the category/supplier
    // dropdown options do not cause duplicate-text failures.
    const table = productName.closest("table");

    expect(within(table).getByText("Jerseys")).toBeInTheDocument();
    expect(within(table).getByText("Textile Traders Co.")).toBeInTheDocument();
  });

  it("formats unitPrice to two decimal places even when returned as a string", async () => {
    mockGetDefault();

    renderProductsList();

    expect(await screen.findByText("45.00")).toBeInTheDocument();
  });

  it("renders a thumbnail image when the product has one", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/categories?all=true") {
        return Promise.resolve(envelope(categories));
      }

      if (url === "/suppliers?all=true") {
        return Promise.resolve(envelope(suppliers));
      }

      return Promise.resolve(
        envelope([
          {
            ...sampleProducts[0],
            image: "https://res.cloudinary.com/x/jersey.jpg",
          },
        ]),
      );
    });

    renderProductsList();

    const thumbnail = await screen.findByAltText("");

    expect(thumbnail).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/x/jersey.jpg",
    );
  });

  it("shows a placeholder icon instead of a broken image when there is no image", async () => {
    mockGetDefault();

    renderProductsList();

    expect(await screen.findByText("Home Jersey 2026")).toBeInTheDocument();

    expect(screen.queryByAltText("")).not.toBeInTheDocument();
  });

  it("shows an em dash when a product has no category or supplier", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/categories?all=true") {
        return Promise.resolve(envelope(categories));
      }

      if (url === "/suppliers?all=true") {
        return Promise.resolve(envelope(suppliers));
      }

      return Promise.resolve(
        envelope([
          {
            id: "p2",
            name: "Loose Item",
            sku: "MISC-1",
            categoryId: null,
            supplierId: null,
            unitPrice: "5.00",
          },
        ]),
      );
    });

    renderProductsList();

    const productName = await screen.findByText("Loose Item");
    const table = productName.closest("table");

    expect(within(table).getAllByText("—")).toHaveLength(2);
  });

  it("requests page and limit query params on initial load", async () => {
    mockGetDefault();

    renderProductsList();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/products?page=1&limit=10");
    });
  });

  it("populates both filter dropdowns from ?all=true", async () => {
    mockGetDefault();

    renderProductsList();

    const categorySelect = await screen.findByLabelText("Filter by category");

    const supplierSelect = await screen.findByLabelText("Filter by supplier");

    expect(
      Array.from(categorySelect.querySelectorAll("option")).map(
        (option) => option.textContent,
      ),
    ).toEqual(["All categories", "Jerseys"]);

    expect(
      Array.from(supplierSelect.querySelectorAll("option")).map(
        (option) => option.textContent,
      ),
    ).toEqual(["All suppliers", "Textile Traders Co."]);
  });

  it("debounces search before calling the products API", async () => {
    mockGetDefault();

    const user = userEvent.setup();

    renderProductsList();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/products?page=1&limit=10");
    });

    const searchInput = screen.getByPlaceholderText("Search by name or SKU…");

    await user.type(searchInput, "JER");

    // It should not immediately send the search request.
    expect(api.get).not.toHaveBeenCalledWith(
      "/products?page=1&limit=10&search=JER",
    );

    // ProductsList uses a 400ms debounce.
    await new Promise((resolve) => {
      setTimeout(resolve, 450);
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        "/products?page=1&limit=10&search=JER",
      );
    });
  });

  it("selecting a category sends categoryId immediately, without debounce", async () => {
    mockGetDefault();

    const user = userEvent.setup();

    renderProductsList();

    const categorySelect = await screen.findByLabelText("Filter by category");

    await user.selectOptions(categorySelect, "cat1");

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        "/products?page=1&limit=10&categoryId=cat1",
      );
    });
  });

  it("combines search, category, and supplier filters", async () => {
    mockGetDefault();

    const user = userEvent.setup();

    renderProductsList();

    const categorySelect = await screen.findByLabelText("Filter by category");

    const supplierSelect = await screen.findByLabelText("Filter by supplier");

    const searchInput = screen.getByPlaceholderText("Search by name or SKU…");

    await user.selectOptions(categorySelect, "cat1");

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        "/products?page=1&limit=10&categoryId=cat1",
      );
    });

    await user.selectOptions(supplierSelect, "sup1");

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        "/products?page=1&limit=10&categoryId=cat1&supplierId=sup1",
      );
    });

    await user.type(searchInput, "JER");

    // Wait longer than ProductsList's 400ms debounce.
    await new Promise((resolve) => {
      setTimeout(resolve, 450);
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        "/products?page=1&limit=10&search=JER&categoryId=cat1&supplierId=sup1",
      );
    });
  });

  it("shows the empty state with an add-first CTA when there are no products at all", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/categories?all=true") {
        return Promise.resolve(envelope(categories));
      }

      if (url === "/suppliers?all=true") {
        return Promise.resolve(envelope(suppliers));
      }

      return Promise.resolve(
        envelope([], {
          totalPages: 0,
        }),
      );
    });

    renderProductsList();

    expect(await screen.findByText("No products yet.")).toBeInTheDocument();

    expect(screen.getByText("Add your first product")).toBeInTheDocument();
  });

  it("deletes a product and reloads the list afterward", async () => {
    mockGetDefault();

    api.delete.mockResolvedValue({});

    const user = userEvent.setup();

    renderProductsList();

    expect(await screen.findByText("Home Jersey 2026")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Delete Home Jersey 2026"));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/products/p1");
    });

    expect(toast.success).toHaveBeenCalledWith("Product deleted.");

    await waitFor(() => {
      const paginatedCalls = api.get.mock.calls.filter((call) =>
        call[0].startsWith("/products?page="),
      );

      expect(paginatedCalls).toHaveLength(2);
    });
  });

  it("shows a toast with the real backend message if delete fails", async () => {
    mockGetDefault();

    api.delete.mockRejectedValue({
      message: "Cannot delete a product with existing stock records.",
    });

    const user = userEvent.setup();

    renderProductsList();

    expect(await screen.findByText("Home Jersey 2026")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Delete Home Jersey 2026"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Cannot delete a product with existing stock records.",
      );
    });
  });
});
