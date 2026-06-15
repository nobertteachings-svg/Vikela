import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardBody } from '../card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders card with children', () => {
      render(
        <Card>
          <p>Card content</p>
        </Card>
      );
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <Card className="custom-class">
          <p>Content</p>
        </Card>
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('applies elevated class when elevated prop is true', () => {
      const { container } = render(
        <Card elevated>
          <p>Content</p>
        </Card>
      );
      expect(container.firstChild).toHaveClass('comply-card-elevated');
    });
  });

  describe('CardHeader', () => {
    it('renders card header with title', () => {
      render(<CardHeader title="Card Title" />);
      expect(screen.getByText('Card Title')).toBeInTheDocument();
    });

    it('renders action when provided', () => {
      render(
        <CardHeader title="Title" action={<button>Action</button>} />
      );
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
  });

  describe('CardBody', () => {
    it('renders card body with children', () => {
      render(
        <CardBody>
          <p>Body content</p>
        </CardBody>
      );
      expect(screen.getByText('Body content')).toBeInTheDocument();
    });
  });

  it('renders complete card structure', () => {
    render(
      <Card>
        <CardHeader title="Card Title" />
        <CardBody>
          <p>Card content</p>
        </CardBody>
      </Card>
    );
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });
});
