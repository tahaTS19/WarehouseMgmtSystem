import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DataTable from './DataTable';
import { useIsMobile } from './useIsMobile';

vi.mock('./useIsMobile', () => ({ useIsMobile: vi.fn(() => false) }));

const columns = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
];

describe('DataTable', () => {
  beforeEach(() => {
    useIsMobile.mockReturnValue(false);
  });

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

  describe('desktop (table) rendering', () => {
    it('renders a real table with rows using the column definitions', () => {
      render(
        <DataTable
          columns={columns}
          rows={[{ id: '1', name: 'Warehouse A', email: 'a@x.com' }]}
          isLoading={false}
          emptyMessage="none"
        />,
      );
      expect(screen.getByRole('table')).toBeInTheDocument();
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
          rows={[{ id: '1', name: 'Warehouse A', email: 'a@x.com' }]}
          isLoading={false}
          emptyMessage="none"
          renderActions={() => <button>Edit</button>}
        />,
      );
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  describe('mobile (card) rendering', () => {
    beforeEach(() => {
      useIsMobile.mockReturnValue(true);
    });

    it('renders cards instead of a table', () => {
      render(
        <DataTable
          columns={columns}
          rows={[{ id: '1', name: 'Warehouse A', email: 'a@x.com' }]}
          isLoading={false}
          emptyMessage="none"
        />,
      );

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getByText('Warehouse A')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('a@x.com')).toBeInTheDocument();
    });

    it('uses the first column as the card title and does not repeat it as a detail row', () => {
      render(
        <DataTable
          columns={columns}
          rows={[{ id: '1', name: 'Warehouse A', email: 'a@x.com' }]}
          isLoading={false}
          emptyMessage="none"
        />,
      );

      // "Warehouse A" is the title; "Name" (its label) should NOT also
      // appear as a detail row label, since the title column is excluded.
      expect(screen.queryByText('Name')).not.toBeInTheDocument();
    });

    it('respects a custom titleKey when provided', () => {
      render(
        <DataTable
          columns={columns}
          rows={[{ id: '1', name: 'Warehouse A', email: 'a@x.com' }]}
          isLoading={false}
          emptyMessage="none"
          titleKey="email"
        />,
      );

      expect(screen.queryByText('Email')).not.toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('renders actions inside the card when renderActions is provided', () => {
      render(
        <DataTable
          columns={columns}
          rows={[{ id: '1', name: 'Warehouse A', email: 'a@x.com' }]}
          isLoading={false}
          emptyMessage="none"
          renderActions={() => <button>Edit</button>}
        />,
      );
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });
});
