import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormField from './FormField';

describe('FormField', () => {
  it('renders a plain text input by default, associated with its label', () => {
    render(
      <FormField id="companyName" name="companyName" label="Company name" value="" onChange={() => {}} />,
    );

    const input = screen.getByLabelText('Company name');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('renders a PasswordInput (with toggle) when type="password"', () => {
    const { container } = render(
      <FormField id="password" name="password" label="Password" type="password" value="" onChange={() => {}} />,
    );

    expect(container.querySelector('input')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
  });

  it('displays an error message when the error prop is set', () => {
    render(
      <FormField
        id="email"
        name="email"
        label="Email"
        value=""
        onChange={() => {}}
        error="Email is required"
      />,
    );

    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('does not render an error message when no error is passed', () => {
    render(<FormField id="email" name="email" label="Email" value="" onChange={() => {}} />);

    expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
  });

  it('calls onChange when the user types into a plain field', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<FormField id="email" name="email" label="Email" value="" onChange={handleChange} />);

    await user.type(screen.getByLabelText('Email'), 'a');

    expect(handleChange).toHaveBeenCalled();
  });
});
