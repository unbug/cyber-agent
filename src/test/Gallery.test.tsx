import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GalleryPage as Gallery } from '../pages/Gallery';

// Mock i18n to return keys directly, so tests don't depend on locale
vi.mock('../i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../i18n')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
      locale: 'en',
      setLocale: vi.fn(),
    }),
    I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Gallery page', () => {
  it('renders the page heading', () => {
    renderWithRouter(<Gallery />);
    expect(screen.getByText(/gallery\.title/i)).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithRouter(<Gallery />);
    expect(screen.getByPlaceholderText(/gallery\.search_placeholder/i)).toBeInTheDocument();
  });

  it('renders character cards', () => {
    renderWithRouter(<Gallery />);
    // Use function matcher to avoid substring matches (e.g., "Unitree Loyal Dog")
    const loyalDog = screen.getByText((content) => content === 'Loyal Dog');
    expect(loyalDog).toBeInTheDocument();
    const curiousCat = screen.getByText((content) => content === 'Curious Cat');
    expect(curiousCat).toBeInTheDocument();
  });
});
