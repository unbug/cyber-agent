import '@testing-library/jest-dom';

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
