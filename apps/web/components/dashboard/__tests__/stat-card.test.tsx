import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../stat-card';

describe('StatCard Component', () => {
  it('renders stat card with title and value', () => {
    render(<StatCard title="Total Controls" value="42" />);
    expect(screen.getByText('Total Controls')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <StatCard title="Total Controls" value="42" description="Active controls" />
    );
    expect(screen.getByText('Active controls')).toBeInTheDocument();
  });

  it('renders trend indicator when provided', () => {
    render(
      <StatCard 
        title="Total Controls" 
        value="42" 
        trend={{ value: 5, direction: 'up' }} 
      />
    );
    expect(screen.getByText(/5/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StatCard title="Test" value="10" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
