import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordInput from './PasswordInput';

describe('PasswordInput', () => {
  it('renders the input as type="password" by default', () => {
    const { container } = render(
      <PasswordInput id="password" name="password" value="secret123" onChange={() => {}} />,
    );

    expect(container.querySelector('input')).toHaveAttribute('type', 'password');
  });

  it('reveals the password as plain text when the toggle button is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PasswordInput id="password" name="password" value="secret123" onChange={() => {}} />,
    );

    await user.click(screen.getByRole('button', { name: /show password/i }));

    expect(container.querySelector('input')).toHaveAttribute('type', 'text');
  });

  it('hides the password again when the toggle is clicked a second time', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PasswordInput id="password" name="password" value="secret123" onChange={() => {}} />,
    );

    await user.click(screen.getByRole('button', { name: /show password/i }));
    await user.click(screen.getByRole('button', { name: /hide password/i }));

    expect(container.querySelector('input')).toHaveAttribute('type', 'password');
  });

  it('calls onChange when the user types into the field', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const { container } = render(
      <PasswordInput id="password" name="password" value="" onChange={handleChange} />,
    );

    await user.type(container.querySelector('input'), 'a');

    expect(handleChange).toHaveBeenCalled();
  });
});
