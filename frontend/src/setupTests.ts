import '@testing-library/jest-dom';

// Mock ResizeObserver for Radix UI primitives in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia for theme provider and responsive queries in jsdom
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

// jsdom has no scrollIntoView; chat auto-scroll calls it.
Element.prototype.scrollIntoView = () => {};
