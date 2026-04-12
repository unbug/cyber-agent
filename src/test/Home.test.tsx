import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage as Home } from '../pages/Home';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Home page', () => {
  it('renders the hero heading', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText(/Give your robot/i)).toBeInTheDocument();
  });

  it('renders feature cards', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText('Character Gallery')).toBeInTheDocument();
    expect(screen.getByText('Robot Integration')).toBeInTheDocument();
  });

  it('renders CTA link to gallery', () => {
    renderWithRouter(<Home />);
    const link = screen.getByRole('link', { name: /Explore Characters/i });
    expect(link).toHaveAttribute('href', '/gallery');
  });
});
