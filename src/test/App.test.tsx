import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

// Simple component for testing
const TestComponent = () => {
  return <div data-testid="test-component">Hello Test</div>;
};

describe('Basic Tests', () => {
  it('renders test component without crashing', () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('test-component')).toBeInTheDocument();
    expect(getByTestId('test-component')).toHaveTextContent('Hello Test');
  });

  it('basic math works', () => {
    expect(2 + 2).toBe(4);
  });

  it('environment is properly set up', () => {
    expect(typeof window).toBe('object');
    expect((window as any).__VITEST__).toBe(true);
  });
});
