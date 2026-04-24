import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider, useI18n } from '../i18n';
import { HomePage as Home } from '../pages/Home';

// Mock useI18n to return the key itself for test assertions
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

describe('Home page', () => {
  it('renders the hero heading', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText('home.hero_title')).toBeInTheDocument();
  });

  it('renders feature cards', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText('home.agents_title')).toBeInTheDocument();
    expect(screen.getByText('feature_agents_title')).toBeInTheDocument();
  });

  it('renders CTA link to gallery', () => {
    renderWithRouter(<Home />);
    const link = screen.getByRole('link', { name: /home.hero_cta/i });
    expect(link).toHaveAttribute('href', '/gallery');
  });
});
