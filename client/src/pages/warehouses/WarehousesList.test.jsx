import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import WarehousesList from "./WarehousesList";
import { api } from "../../services/apiClient";
import toast from "react-hot-toast";

vi.mock("../../services/apiClient", () => ({
  api: { get: vi.fn(), delete: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const sampleWarehouses = {
  data: [
    {
      id: "w1",
      name: "Lahore",
      location: "Lahore, PK",
      createdAt: "2026-01-10T00:00:00Z",
    },
  ],
  page: 1,
  limit: 10,
  total: 1,
  totalPages: 1,
};

describe("WarehousesList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it("shows a loading state, then the fetched warehouses", async () => {
    api.get.mockResolvedValue(sampleWarehouses);

    render(
      <MemoryRouter>
        <WarehousesList />
      </MemoryRouter>,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Lahore")).toBeInTheDocument());
  });

  it("shows an empty state when there are no warehouses", async () => {
    api.get.mockResolvedValue({
      data: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
    render(
      <MemoryRouter>
        <WarehousesList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText(/no warehouses found/i)).toBeInTheDocument(),
    );
  });

  it("navigates to the create form when Add Warehouse is clicked", async () => {
    api.get.mockResolvedValue(sampleWarehouses);
    render(
      <MemoryRouter>
        <WarehousesList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Lahore")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Add Warehouse"));

    expect(mockNavigate).toHaveBeenCalledWith("/warehouses/new");
  });

  it("deletes a warehouse after confirmation and removes it from the list", async () => {
    api.get.mockResolvedValue(sampleWarehouses);
    api.delete.mockResolvedValue({});

    render(
      <MemoryRouter>
        <WarehousesList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Lahore")).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText("Delete Lahore"));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith("/warehouses/w1"),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("does not delete if the user cancels the confirmation dialog", async () => {
    window.confirm = vi.fn(() => false);
    api.get.mockResolvedValue(sampleWarehouses);

    render(
      <MemoryRouter>
        <WarehousesList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Lahore")).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText("Delete Lahore"));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it("shows the real backend message via toast when delete fails (e.g. 409 transaction history)", async () => {
    api.get.mockResolvedValue(sampleWarehouses);
    api.delete.mockRejectedValue({
      message: "Cannot delete a warehouse with existing transaction history.",
    });

    render(
      <MemoryRouter>
        <WarehousesList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Lahore")).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText("Delete Lahore"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Cannot delete a warehouse with existing transaction history.",
      ),
    );
  });

  it("requests the first page of warehouses", async () => {
    api.get.mockResolvedValue(sampleWarehouses);

    render(
      <MemoryRouter>
        <WarehousesList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining("page=1")),
    );

    expect(api.get).toHaveBeenCalledWith(expect.stringContaining("limit=10"));
  });
});
