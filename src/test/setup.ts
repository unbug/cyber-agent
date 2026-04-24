import '@testing-library/jest-dom';

// Ensure i18n defaults to English in tests by setting a known locale
Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: {
    getItem: (key: string) => (key === 'cyberagent-locale' ? 'en' : null),
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  },
});

// Ensure navigator.language doesn't trigger zh locale detection
Object.defineProperty(window.navigator, 'language', {
  value: 'en-US',
  writable: false,
  configurable: true,
});

// Mock ResizeObserver for canvas-based components
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// Mock IntersectionObserver for framer-motion's whileInView
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock matchMedia for border-beam and useTheme
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
