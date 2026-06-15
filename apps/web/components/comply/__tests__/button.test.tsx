import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComplyButton } from '../button';

describe('ComplyButton Component', () => {
  it('renders button with text', () => {
    render(<ComplyButton>Click me</ComplyButton>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<ComplyButton onClick={handleClick}>Click me</ComplyButton>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<ComplyButton variant="primary">Primary</ComplyButton>);
    expect(screen.getByRole('button')).toHaveClass('comply-btn-primary');
    
    rerender(<ComplyButton variant="secondary">Secondary</ComplyButton>);
    expect(screen.getByRole('button')).toHaveClass('comply-btn-secondary');
  });

  it('disables button when disabled prop is true', () => {
    render(<ComplyButton disabled>Disabled</ComplyButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ComplyButton className="custom-class">Custom</ComplyButton>
    );
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});
