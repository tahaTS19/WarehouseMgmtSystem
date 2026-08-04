import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import DataTable from './DataTable';

const columns = [{ key: 'name', header: 'Name' }];

describe('DataTable', () => {
  it('shows a loading state', () => {
    render(<DataTable columns={columns} rows={[]} isLoading emptyMessage="none" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows the empty state and calls onEmptyAction when its button is clicked', async () => {
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

    expect(screen.getByText('No items yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Add one'));
    expect(onEmptyAction).toHaveBeenCalled();
  });

  it('does not render an empty-action button when none is provided', () => {
    render(<DataTable columns={columns} rows={[]} isLoading={false} emptyMessage="No items yet." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders rows using the column definitions', () => {
    render(
      <DataTable
        columns={columns}
        rows={[{ id: '1', name: 'Warehouse A' }]}
        isLoading={false}
        emptyMessage="none"
      />,
    );
    expect(screen.getByText('Warehouse A')).toBeInTheDocument();
  });

  it('uses a column render function when provided instead of the raw value', () => {
    render(
      <DataTable
        columns={[{ key: 'name', header: 'Name', render: (row) => row.name.toUpperCase() }]}
        rows={[{ id: '1', name: 'warehouse a' }]}
        isLoading={false}
        emptyMessage="none"
      />,
    );
    expect(screen.getByText('WAREHOUSE A')).toBeInTheDocument();
  });

  it('renders an actions column when renderActions is provided', () => {
    render(
      <DataTable
        columns={columns}
        rows={[{ id: '1', name: 'Warehouse A' }]}
        isLoading={false}
        emptyMessage="none"
        renderActions={() => <button>Edit</button>}
      />,
    );
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });
});
