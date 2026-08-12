import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CategoriesList from "./CategoriesList";
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

const sampleCategories = [
  { id: "c1", name: "Footwear", description: "Shoes and boots" },
];

describe("CategoriesList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads rows from response.data, not the raw response", async () => {
    api.get.mockResolvedValue(envelope(sampleCategories));

    render(
      <MemoryRouter>
        <CategoriesList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Footwear")).toBeInTheDocument(),
    );
  });

  it("requests page and limit query params on initial load", async () => {
    api.get.mockResolvedValue(envelope(sampleCategories));

    render(
      <MemoryRouter>
        <CategoriesList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/categories?page=1&limit=10"),
    );
  });

  it("debounces search input before calling the API with a search param", async () => {
    api.get.mockResolvedValue(envelope(sampleCategories));

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CategoriesList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    await user.type(screen.getByPlaceholderText("Search categories…"), "Foot");

    // Debounce has not completed yet
    expect(api.get).toHaveBeenCalledTimes(1);

    await waitFor(
      () =>
        expect(api.get).toHaveBeenLastCalledWith(
          "/categories?page=1&limit=10&search=Foot",
        ),
      { timeout: 1000 },
    );
  });

  it("resets to page 1 when the search term changes", async () => {
    api.get.mockResolvedValue(envelope(sampleCategories, { totalPages: 3 }));

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CategoriesList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    await user.type(screen.getByPlaceholderText("Search categories…"), "x");

    await waitFor(
      () =>
        expect(api.get).toHaveBeenLastCalledWith(
          "/categories?page=1&limit=10&search=x",
        ),
      { timeout: 1000 },
    );
  });

  it("shows the empty state with an add-first CTA when there are no categories at all", async () => {
    api.get.mockResolvedValue(envelope([], { totalPages: 0 }));

    render(
      <MemoryRouter>
        <CategoriesList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("No categories yet.")).toBeInTheDocument(),
    );

    expect(screen.getByText("Add your first category")).toBeInTheDocument();
  });

  it("deletes a category and reloads the list afterward", async () => {
    api.get.mockResolvedValue(envelope(sampleCategories));
    api.delete.mockResolvedValue({});

    render(
      <MemoryRouter>
        <CategoriesList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Footwear")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByLabelText("Delete Footwear"));

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith("/categories/c1"),
    );

    expect(toast.success).toHaveBeenCalledWith("Category deleted.");

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  it("shows a toast with the real backend message on a 409", async () => {
    api.get.mockResolvedValue(envelope(sampleCategories));

    api.delete.mockRejectedValue({
      message: 'Category with name "Footwear" already exists.',
    });

    render(
      <MemoryRouter>
        <CategoriesList />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Footwear")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByLabelText("Delete Footwear"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Category with name "Footwear" already exists.',
      ),
    );
  });
});
