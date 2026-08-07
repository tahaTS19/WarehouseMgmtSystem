import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import StaffList from "./StaffList";
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

const sampleUsers = {
  data: [
    {
      id: "u1",
      name: "Sara Khan",
      email: "sara@nike.com",
      role: "staff",
      warehouseId: "w1",
      status: "active",
      createdAt: new Date().toISOString(),
    },
  ],
  page: 1,
  limit: 10,
  total: 1,
  totalPages: 1,
};
const sampleWarehouses = [
  {
    id: "w1",
    name: "Lahore",
  },
];

function mockGet() {
  api.get.mockImplementation((path) => {
    if (path.startsWith("/users")) {
      return Promise.resolve(sampleUsers);
    }

    if (path.startsWith("/warehouses")) {
      return Promise.resolve(sampleWarehouses);
    }
  });
}

describe("StaffList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it("fetches both users and warehouses, filters out the admin, and resolves warehouse names", async () => {
    mockGet();

    render(
      <MemoryRouter>
        <StaffList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Sara Khan")).toBeInTheDocument(),
    );
    const table = screen.getByRole("table");
    expect(within(table).getByText("Lahore")).toBeInTheDocument();
  });

  it("shows an empty state when there is no staff", async () => {
    api.get.mockImplementation((path) => {
      if (path.startsWith("/users")) {
        return Promise.resolve({
          data: [],
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        });
      }

      return Promise.resolve(sampleWarehouses);
    });

    render(
      <MemoryRouter>
        <StaffList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText(/no staff accounts yet/i)).toBeInTheDocument(),
    );
  });

  it("navigates to the create form when Add Staff is clicked", async () => {
    mockGet();
    render(
      <MemoryRouter>
        <StaffList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Sara Khan")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText("Add Staff"));

    expect(mockNavigate).toHaveBeenCalledWith("/employees/new");
  });

  it("deletes a staff account after confirmation", async () => {
    mockGet();
    api.delete.mockResolvedValue({});

    render(
      <MemoryRouter>
        <StaffList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Sara Khan")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByLabelText("Delete Sara Khan"));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/users/u1"));
    expect(toast.success).toHaveBeenCalled();
  });

  it("shows a 403 message via toast if the backend blocks deleting an admin", async () => {
    mockGet();
    api.delete.mockRejectedValue({
      message: "Cannot delete an admin account through this endpoint.",
    });

    render(
      <MemoryRouter>
        <StaffList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Sara Khan")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByLabelText("Delete Sara Khan"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Cannot delete an admin account through this endpoint.",
      ),
    );
  });

  it("passes pagination params to the users endpoint", async () => {
    mockGet();

    render(
      <MemoryRouter>
        <StaffList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining("page=1")),
    );

    expect(api.get).toHaveBeenCalledWith(expect.stringContaining("limit=10"));
  });
});
