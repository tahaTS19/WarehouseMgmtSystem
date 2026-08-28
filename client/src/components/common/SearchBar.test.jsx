import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import SearchBar from "./SearchBar";

describe("SearchBar", () => {
  it("renders the default placeholder", () => {
    render(<SearchBar value="" onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("renders a custom placeholder", () => {
    render(
      <SearchBar value="" onChange={vi.fn()} placeholder="Search staff..." />,
    );

    expect(screen.getByPlaceholderText("Search staff...")).toBeInTheDocument();
  });

  it("displays the provided value", () => {
    render(<SearchBar value="Warehouse A" onChange={vi.fn()} />);

    expect(screen.getByDisplayValue("Warehouse A")).toBeInTheDocument();
  });

  it("calls onChange with the updated value as the user types", async () => {
    const onChange = vi.fn();

    render(<SearchBar value="" onChange={onChange} />);

    const input = screen.getByRole("textbox");

    await userEvent.type(input, "abc");

    expect(onChange).toHaveBeenCalledTimes(3);

    expect(onChange).toHaveBeenNthCalledWith(1, "a");
    expect(onChange).toHaveBeenNthCalledWith(2, "b");
    expect(onChange).toHaveBeenNthCalledWith(3, "c");
  });

  it("calls onChange with an empty string when cleared", async () => {
    const onChange = vi.fn();

    render(<SearchBar value="hello" onChange={onChange} />);

    const input = screen.getByRole("textbox");

    await userEvent.clear(input);

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("renders a textbox input", () => {
    render(<SearchBar value="" onChange={vi.fn()} />);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
