import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProductMovementReport from "./ProductMovementReport";
import { api } from "../../services/apiClient";
import toast from "react-hot-toast";

vi.mock("../../services/apiClient", () => ({
  api: { get: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// Two dates, each with both a stock_in and stock_out row — exactly the
// confirmed flat shape, one row per (date, type) pair.
const flatResponse = [
  { date: "2026-09-01T00:00:00.000Z", type: "stock_in", totalQuantity: 150 },
  { date: "2026-09-01T00:00:00.000Z", type: "stock_out", totalQuantity: 45 },
  { date: "2026-09-02T00:00:00.000Z", type: "stock_in", totalQuantity: 80 },
];

describe("ProductMovementReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests the endpoint with from/to query params", async () => {
    api.get.mockResolvedValue([]);

    render(<ProductMovementReport />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    const calledUrl = api.get.mock.calls[0][0];

    expect(calledUrl).toContain("/reports/product-movement?");
    expect(calledUrl).toContain("from=");
    expect(calledUrl).toContain("to=");
  });

  it("re-fetches when the date range changes", async () => {
    api.get.mockResolvedValue([]);

    render(<ProductMovementReport />);

    // Wait for the initial request.
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    const fromInput = screen.getByLabelText("From");

    await userEvent.clear(fromInput);
    await userEvent.type(fromInput, "2026-01-01");

    // Test the behavior we actually care about:
    // the latest request contains the updated date.
    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        expect.stringContaining("from=2026-01-01"),
      );
    });
  });

  it("shows the empty state when there is no movement in range", async () => {
    api.get.mockResolvedValue([]);

    render(<ProductMovementReport />);

    await waitFor(() =>
      expect(
        screen.getByText("No movement recorded in this date range."),
      ).toBeInTheDocument(),
    );
  });

  it("shows a toast with the real backend message on failure", async () => {
    api.get.mockRejectedValue({ message: "Something went wrong." });

    render(<ProductMovementReport />);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Something went wrong."),
    );
  });

  it("does not crash on the flat one-row-per-type response shape", async () => {
    api.get.mockResolvedValue(flatResponse);

    render(<ProductMovementReport />);

    // Chart itself isn't easily assertable in jsdom (Recharts needs real
    // layout) — the real coverage here is that pivoting a flat array with
    // duplicate dates doesn't throw and clears the loading/empty states.
    await waitFor(() =>
      expect(
        screen.queryByText("No movement recorded in this date range."),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });
});
