import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Package } from 'lucide-react';
import StatCard from './StatCard';

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard icon={Package} label="Products" value={42} />);

    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('applies accent styling when accent is true', () => {
    const { container } = render(
      <StatCard icon={Package} label="Low Stock" value={3} accent />,
    );

    expect(container.querySelector('[class*="accent"]')).toBeInTheDocument();
  });

  it('does not apply accent styling by default', () => {
    const { container } = render(<StatCard icon={Package} label="Products" value={10} />);

    expect(container.querySelector('[class*="accent"]')).not.toBeInTheDocument();
  });
});
