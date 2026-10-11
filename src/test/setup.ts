import '@testing-library/jest-dom';

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

// Mock URL methods not available in jsdom
if (typeof URL.createObjectURL !== 'function') {
  // @ts-ignore jsdom doesn't have these
  URL.createObjectURL = () => 'blob:test';
}
if (typeof URL.revokeObjectURL !== 'function') {
  // @ts-ignore jsdom doesn't have this
  URL.revokeObjectURL = () => {};
}

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

// Mock canvas getContext to suppress jsdom "Not implemented" stderr noise
const mockCanvasContext = {
  fillRect: () => {},
  strokeRect: () => {},
  roundRect: () => {},
  clearRect: () => {},
  getImageData: () => ({ data: new Array(0) as unknown as Uint8ClampedArray }),
  putImageData: () => {},
  createImageData: () => [],
  setTransform: () => {},
  drawImage: () => {},
  save: () => {},
  fillText: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  stroke: () => {},
  translate: () => {},
  scale: () => {},
  rotate: () => {},
  arc: () => {},
  fill: () => {},
  rect: () => {},
  clip: () => {},
  measureText: () => ({ width: 0 }),
  transform: () => {},
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createPattern: () => null,
  createRadialGradient: () => ({ addColorStop: () => {} }),
  getLineDash: () => [],
  setLineDash: () => {},
  shadowBlur: 0,
  shadowColor: '',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  lineCap: 'butt' as CanvasLineCap,
  lineJoin: 'miter' as CanvasLineJoin,
  lineWidth: 1,
  miterLimit: 10,
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  font: '10px system-ui',
  textAlign: 'left' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline,
  direction: 'ltr' as CanvasDirection,
} as unknown as CanvasRenderingContext2D;

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: (_type: string) => mockCanvasContext,
});
