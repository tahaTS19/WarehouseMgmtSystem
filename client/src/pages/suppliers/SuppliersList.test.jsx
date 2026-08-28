import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import SuppliersList from "./SuppliersList";
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

const SEARCH_PLACEHOLDER = "Search by name or phone number…";

const sampleSuppliers = [
  {
    id: "s1",
    companyName: "Textile Traders Co.",
    contactPerson: "Ahmed Sheikh",
    phone: "03001234567",
    email: "ahmed@textiletraders.com",
  },
];

/**
 * Finds the supplier row instead of using getByText().
 *
 * This is important because "Textile Traders Co." can now exist in:
 * 1. The company filter <option>
 * 2. The supplier table <td>
 */
async function findSupplierRow(companyName) {
  const companyCell = await screen.findByRole("cell", {
    name: companyName,
  });

  return companyCell.closest("tr");
}

describe("SuppliersList", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();

    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads rows from response.data, not the raw response", async () => {
    api.get.mockResolvedValue(envelope(sampleSuppliers));

    render(
      <MemoryRouter>
        <SuppliersList />
      </MemoryRouter>,
    );

    const row = await findSupplierRow("Textile Traders Co.");

    expect(
      within(row).getByRole("cell", {
        name: "Textile Traders Co.",
      }),
    ).toBeInTheDocument();
  });

  it("requests page and limit query params on initial load", async () => {
    api.get.mockResolvedValue(envelope(sampleSuppliers));

    render(
      <MemoryRouter>
        <SuppliersList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/suppliers?page=1&limit=10"),
    );
  });

it("debounces search input before calling the API with a search param", async () => {
  vi.useFakeTimers();

  api.get.mockResolvedValue(envelope(sampleSuppliers));

  render(
    <MemoryRouter>
      <SuppliersList />
    </MemoryRouter>,
  );

  // Allow the initial request/effect to complete.
  await vi.waitFor(() =>
    expect(api.get).toHaveBeenCalledWith(
      "/suppliers?page=1&limit=10",
    ),
  );

  // Clear the initial request so we only measure requests caused
  // by changing the search input.
  api.get.mockClear();

  const searchInput = screen.getByPlaceholderText(
    SEARCH_PLACEHOLDER,
  );

  fireEvent.change(searchInput, {
    target: {
      value: "03001",
    },
  });

  // No search request should have happened yet.
  expect(api.get).not.toHaveBeenCalled();

  // Advance the debounce timer.
  await vi.advanceTimersByTimeAsync(400);

  await vi.waitFor(() =>
    expect(api.get).toHaveBeenCalledWith(
      "/suppliers?page=1&limit=10&search=03001",
    ),
  );

  vi.useRealTimers();
});

  it("shows the empty state with an add-first CTA when there are no suppliers at all", async () => {
    api.get.mockResolvedValue(
      envelope([], {
        totalPages: 0,
      }),
    );

    render(
      <MemoryRouter>
        <SuppliersList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("No suppliers yet.")).toBeInTheDocument(),
    );

    expect(screen.getByText("Add your first supplier")).toBeInTheDocument();
  });

it("shows pagination info and enables Next when multiple pages exist", async () => {
  api.get.mockResolvedValue(
    envelope(sampleSuppliers, { page: 2, totalPages: 5 }),
  );

  render(
    <MemoryRouter>
      <SuppliersList />
    </MemoryRouter>,
  );

  await waitFor(() =>
    expect(screen.getByText(/Page\s*1\s*of\s*5/)).toBeInTheDocument(),
  );

  expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
});

  it("navigates to the create form when Add Supplier is clicked", async () => {
    api.get.mockResolvedValue(envelope(sampleSuppliers));

    render(
      <MemoryRouter>
        <SuppliersList />
      </MemoryRouter>,
    );

    await findSupplierRow("Textile Traders Co.");

    await userEvent.click(
      screen.getByRole("button", {
        name: "Add Supplier",
      }),
    );

    expect(mockNavigate).toHaveBeenCalledWith("/suppliers/new");
  });

  it("deletes a supplier and reloads the list afterward", async () => {
    api.get.mockResolvedValue(envelope(sampleSuppliers));
    api.delete.mockResolvedValue({});

    render(
      <MemoryRouter>
        <SuppliersList />
      </MemoryRouter>,
    );

    const row = await findSupplierRow("Textile Traders Co.");

    await userEvent.click(
      within(row).getByRole("button", {
        name: "Delete Textile Traders Co.",
      }),
    );

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith("/suppliers/s1"),
    );

    expect(toast.success).toHaveBeenCalled();

    await waitFor(() => {
      const paginatedCalls = api.get.mock.calls.filter((call) =>
        call[0].startsWith("/suppliers?page="),
      );

      expect(paginatedCalls).toHaveLength(2);
    });
  });

  it("shows a toast with the real backend message if delete fails", async () => {
    api.get.mockResolvedValue(envelope(sampleSuppliers));

    api.delete.mockRejectedValue({
      message: "Cannot delete a supplier linked to existing products.",
    });

    render(
      <MemoryRouter>
        <SuppliersList />
      </MemoryRouter>,
    );

    const row = await findSupplierRow("Textile Traders Co.");

    await userEvent.click(
      within(row).getByRole("button", {
        name: "Delete Textile Traders Co.",
      }),
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Cannot delete a supplier linked to existing products.",
      ),
    );
  });

  describe("company filter dropdown (fully decoupled from search)", () => {
    const allSuppliers = [
      {
        id: "s1",
        companyName: "Textile Traders Co.",
      },
      {
        id: "s2",
        companyName: "Rubber Sole Ltd.",
      },
      {
        id: "s3",
        companyName: "Textile Traders Co.",
      },
    ];

    function mockGetWithAll() {
      api.get.mockImplementation((url) => {
        if (url === "/suppliers?all=true") {
          return Promise.resolve(
            envelope(allSuppliers, {
              total: 3,
              totalPages: 1,
            }),
          );
        }

        return Promise.resolve(envelope(sampleSuppliers));
      });
    }

    it("fetches ?all=true on mount and populates the dropdown with unique company names", async () => {
      mockGetWithAll();

      render(
        <MemoryRouter>
          <SuppliersList />
        </MemoryRouter>,
      );

      await waitFor(() =>
        expect(api.get).toHaveBeenCalledWith("/suppliers?all=true"),
      );

      const select = await screen.findByRole("combobox", {
        name: "Filter by supplier firm name",
      });

      const options = Array.from(select.querySelectorAll("option")).map(
        (option) => option.textContent,
      );

      expect(options).toEqual([
        "All companies",
        "Rubber Sole Ltd.",
        "Textile Traders Co.",
      ]);
    });

    it("selecting a company sends it as a companyName param, not search", async () => {
      mockGetWithAll();

      render(
        <MemoryRouter>
          <SuppliersList />
        </MemoryRouter>,
      );

      const select = await screen.findByRole("combobox", {
        name: "Filter by supplier firm name",
      });

      await userEvent.selectOptions(select, "Rubber Sole Ltd.");

      await waitFor(() =>
        expect(api.get).toHaveBeenLastCalledWith(
          "/suppliers?page=1&limit=10&companyName=Rubber+Sole+Ltd.",
        ),
      );
    });

    it("does NOT change the search box text when a company is selected", async () => {
      mockGetWithAll();

      render(
        <MemoryRouter>
          <SuppliersList />
        </MemoryRouter>,
      );

      const select = await screen.findByRole("combobox", {
        name: "Filter by supplier firm name",
      });

      await userEvent.selectOptions(select, "Rubber Sole Ltd.");

      expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toHaveValue("");
    });

    it("does NOT reset the dropdown when the user types in the search box", async () => {
      mockGetWithAll();

      render(
        <MemoryRouter>
          <SuppliersList />
        </MemoryRouter>,
      );

      const select = await screen.findByRole("combobox", {
        name: "Filter by supplier firm name",
      });

      await userEvent.selectOptions(select, "Rubber Sole Ltd.");

      expect(select).toHaveValue("Rubber Sole Ltd.");

      await userEvent.type(
        screen.getByPlaceholderText(SEARCH_PLACEHOLDER),
        "0300",
      );

      expect(select).toHaveValue("Rubber Sole Ltd.");
    });

    it("combines search text and company filter as independent params when both are set", async () => {
      mockGetWithAll();

      render(
        <MemoryRouter>
          <SuppliersList />
        </MemoryRouter>,
      );

      const select = await screen.findByRole("combobox", {
        name: "Filter by supplier firm name",
      });

      await userEvent.selectOptions(select, "Rubber Sole Ltd.");

      await userEvent.type(
        screen.getByPlaceholderText(SEARCH_PLACEHOLDER),
        "0300",
      );

      await waitFor(() =>
        expect(api.get).toHaveBeenLastCalledWith(
          "/suppliers?page=1&limit=10&search=0300&companyName=Rubber+Sole+Ltd.",
        ),
      );
    });
  });
});
