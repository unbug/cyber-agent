import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GalleryPage as Gallery } from '../pages/Gallery';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Gallery page', () => {
  it('renders the page heading', () => {
    renderWithRouter(<Gallery />);
    expect(screen.getByText(/Character Gallery/i)).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithRouter(<Gallery />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('renders character cards', () => {
    renderWithRouter(<Gallery />);
    expect(screen.getByText(/Loyal Dog/i)).toBeInTheDocument();
    expect(screen.getByText(/Curious Cat/i)).toBeInTheDocument();
  });
});
