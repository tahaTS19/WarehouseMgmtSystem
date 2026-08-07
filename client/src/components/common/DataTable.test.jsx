import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DataTable from "./DataTable";
import { useIsMobile } from "./useIsMobile";

vi.mock("./useIsMobile", () => ({ useIsMobile: vi.fn(() => false) }));

const columns = [
  { key: "name", header: "Name" },
  { key: "email", header: "Email" },
];

describe("DataTable", () => {
  beforeEach(() => {
    useIsMobile.mockReturnValue(false);
  });

  it("shows a loading state", () => {
    render(
      <DataTable columns={columns} rows={[]} isLoading emptyMessage="none" />,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows the empty state and calls onEmptyAction when its button is clicked", async () => {
    const onEmptyAction = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={[]}
        isLoading={false}
        emptyMessage="No items yet."
        emptyActionLabel="Add one"
        onEmptyAction={onEmptyAction}
      />,
    );

    expect(screen.getByText("No items yet.")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Add one"));
    expect(onEmptyAction).toHaveBeenCalled();
  });

  describe("desktop (table) rendering", () => {
    it("renders a real table with rows using the column definitions", () => {
      render(
        <DataTable
          columns={columns}
          rows={[{ id: "1", name: "Warehouse A", email: "a@x.com" }]}
          isLoading={false}
          emptyMessage="none"
        />,
      );
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText("Warehouse A")).toBeInTheDocument();
    });

    it("uses a column render function when provided instead of the raw value", () => {
      render(
        <DataTable
          columns={[
            {
              key: "name",
              header: "Name",
              render: (row) => row.name.toUpperCase(),
            },
          ]}
          rows={[{ id: "1", name: "warehouse a" }]}
          isLoading={false}
          emptyMessage="none"
        />,
      );
      expect(screen.getByText("WAREHOUSE A")).toBeInTheDocument();
    });

    it("renders an actions column when renderActions is provided", () => {
      render(
        <DataTable
          columns={columns}
          rows={[{ id: "1", name: "Warehouse A", email: "a@x.com" }]}
          isLoading={false}
          emptyMessage="none"
          renderActions={() => <button>Edit</button>}
        />,
      );
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    it("renders pagination when more than one page exists", () => {
      render(
        <DataTable
          columns={columns}
          rows={[{ id: "1", name: "Warehouse A", email: "a@x.com" }]}
          isLoading={false}
          emptyMessage="none"
          page={2}
          totalPages={5}
          onPageChange={vi.fn()}
        />,
      );

      expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /previous/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });

    it("calls onPageChange when pagination buttons are clicked", async () => {
      const onPageChange = vi.fn();

      render(
        <DataTable
          columns={columns}
          rows={[{ id: "1", name: "Warehouse A", email: "a@x.com" }]}
          isLoading={false}
          emptyMessage="none"
          page={2}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      await userEvent.click(screen.getByRole("button", { name: /previous/i }));
      expect(onPageChange).toHaveBeenCalledWith(1);

      await userEvent.click(screen.getByRole("button", { name: /next/i }));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    //optional: nice to have
    it("disables Previous on first page and Next on last page", () => {
      const { rerender } = render(
        <DataTable
          columns={columns}
          rows={[{ id: "1", name: "Warehouse A", email: "a@x.com" }]}
          isLoading={false}
          emptyMessage="none"
          page={1}
          totalPages={5}
          onPageChange={vi.fn()}
        />,
      );

      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();

      rerender(
        <DataTable
          columns={columns}
          rows={[{ id: "1", name: "Warehouse A", email: "a@x.com" }]}
          isLoading={false}
          emptyMessage="none"
          page={5}
          totalPages={5}
          onPageChange={vi.fn()}
        />,
      );

      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    });
  });

  describe("mobile (card) rendering", () => {
    beforeEach(() => {
      useIsMobile.mockReturnValue(true);
    });

    it("renders cards instead of a table", () => {
      render(
        <DataTable
          columns={columns}
          rows={[{ id: "1", name: "Warehouse A", email: "a@x.com" }]}
          isLoading={false}
          emptyMessage="none"
        />,
      );

      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.getByText("Warehouse A")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("a@x.com")).toBeInTheDocument();
    });

    it("uses the first column as the card title and does not repeat it as a detail row", () => {
      render(
        <DataTable
          columns={columns}
          rows={[{ id: "1", name: "Warehouse A", email: "a@x.com" }]}
          isLoading={false}
          emptyMessage="none"
        />,
      );

      // "Warehouse A" is the title; "Name" (its label) should NOT also
      // appear as a detail row label, since the title column is excluded.
      expect(screen.queryByText("Name")).not.toBeInTheDocument();
    });

    it("respects a custom titleKey when provided", () => {
      render(
        <DataTable
          columns={columns}
          rows={[{ id: "1", name: "Warehouse A", email: "a@x.com" }]}
          isLoading={false}
          emptyMessage="none"
          titleKey="email"
        />,
      );

      expect(screen.queryByText("Email")).not.toBeInTheDocument();
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    it("renders actions inside the card when renderActions is provided", () => {
      render(
        <DataTable
          columns={columns}
          rows={[{ id: "1", name: "Warehouse A", email: "a@x.com" }]}
          isLoading={false}
          emptyMessage="none"
          renderActions={() => <button>Edit</button>}
        />,
      );
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });
  });
});
