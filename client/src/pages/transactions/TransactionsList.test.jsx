import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import TransactionsList from "./TransactionsList";
import { api } from "../../services/apiClient";
import toast from "react-hot-toast";

vi.mock("../../services/apiClient", () => ({
  api: { get: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
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

const sampleTransactions = [
  {
    id: "t1",
    warehouseInventoryId: "wi1",
    quantity: 10,
    type: "stock_in",
    reason: "purchase",
    userId: "u1",
    createdAt: "2026-08-21T14:56:56.000Z",

    warehouseInventory: {
      id: "wi1",
      currentStock: 110,
      warehouse: {
        id: "w1",
        name: "Main Warehouse",
      },
      product: {
        id: "p1",
        name: "Wireless Mouse",
        sku: "WM-001",
      },
    },

    user: {
      id: "u1",
      name: "John Doe",
      email: "john@example.com",
    },
  },
];

describe("TransactionsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads rows from response.data and renders the nested product/warehouse/user fields", async () => {
    api.get.mockResolvedValue(envelope(sampleTransactions));

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Wireless Mouse (WM-001)")).toBeInTheDocument(),
    );

    expect(
      screen.getByRole("cell", { name: "Main Warehouse" }),
    ).toBeInTheDocument();

    expect(screen.getByRole("cell", { name: "John Doe" })).toBeInTheDocument();
  });

  it("renders human-readable labels for type and reason, not raw enum values", async () => {
    api.get.mockResolvedValue(envelope(sampleTransactions));

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(
        screen.getByRole("cell", { name: /Stock In/ }),
      ).toBeInTheDocument(),
    );

    expect(screen.getByRole("cell", { name: "Purchase" })).toBeInTheDocument();

    expect(screen.queryByText("stock_in")).not.toBeInTheDocument();
    expect(screen.queryByText("purchase")).not.toBeInTheDocument();
  });

  it("never renders any edit or delete action — immutable audit log", async () => {
    api.get.mockResolvedValue(envelope(sampleTransactions));

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Wireless Mouse (WM-001)")).toBeInTheDocument(),
    );

    expect(screen.queryByLabelText(/^Edit /)).not.toBeInTheDocument();

    expect(screen.queryByLabelText(/^Delete /)).not.toBeInTheDocument();

    expect(
      screen.queryByRole("columnheader", { name: "Actions" }),
    ).not.toBeInTheDocument();
  });

  it("requests page and limit query params on initial load", async () => {
    api.get.mockResolvedValue(envelope(sampleTransactions));

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/transactions?page=1&limit=10"),
    );
  });

it('debounces search input before calling the API with a search param', async () => {
  vi.useFakeTimers();

  api.get.mockResolvedValue(envelope(sampleTransactions));

  render(
    <MemoryRouter>
      <TransactionsList />
    </MemoryRouter>,
  );

  // Let the initial useEffect/loadTransactions request complete.
  await vi.waitFor(() =>
    expect(api.get).toHaveBeenCalledTimes(1),
  );

  const searchInput = screen.getByPlaceholderText(
    'Search by product name or SKU…',
  );

  fireEvent.change(searchInput, {
    target: { value: 'WM-001' },
  });

  // The debounce should prevent another request before 400ms.
  expect(api.get).toHaveBeenCalledTimes(1);

  // Advance to just before the debounce finishes.
  await vi.advanceTimersByTimeAsync(399);

  expect(api.get).toHaveBeenCalledTimes(1);

  // Complete the 400ms debounce.
  await vi.advanceTimersByTimeAsync(1);

  // React's state/effect update happens after the timer.
  await vi.waitFor(() =>
    expect(api.get).toHaveBeenLastCalledWith(
      '/transactions?page=1&limit=10&search=WM-001',
    ),
  );
});

  it("selecting a type filter sends the type param immediately", async () => {
    api.get.mockResolvedValue(envelope(sampleTransactions));

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    const typeFilter = await screen.findByLabelText("Filter by type");

    await user.selectOptions(typeFilter, "stock_out");

    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith(
        "/transactions?page=1&limit=10&type=stock_out",
      ),
    );
  });

  it("selecting a reason filter sends the reason param immediately", async () => {
    api.get.mockResolvedValue(envelope(sampleTransactions));

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    const reasonFilter = await screen.findByLabelText("Filter by reason");

    await user.selectOptions(reasonFilter, "damage");

    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith(
        "/transactions?page=1&limit=10&reason=damage",
      ),
    );
  });

  it("shows the empty state with a record-first CTA when there are no transactions at all", async () => {
    api.get.mockResolvedValue(
      envelope([], {
        totalPages: 0,
      }),
    );

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    expect(await screen.findByText("No transactions yet.")).toBeInTheDocument();

    expect(
      screen.getByText("Record your first stock movement"),
    ).toBeInTheDocument();
  });

  it("navigates to the create form when Record Stock Movement is clicked", async () => {
    api.get.mockResolvedValue(envelope(sampleTransactions));

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await screen.findByText("Wireless Mouse (WM-001)");

    await user.click(
      screen.getByRole("button", {
        name: "Record Stock Movement",
      }),
    );

    expect(mockNavigate).toHaveBeenCalledWith("/transactions/new");
  });

  it("shows a toast with the real backend message if loading fails", async () => {
    api.get.mockRejectedValue({
      message: "Something went wrong.",
    });

    render(
      <MemoryRouter>
        <TransactionsList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Something went wrong."),
    );
  });
});
