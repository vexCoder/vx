import Counter from '@components/Counter';
import { render, within } from '@utils/test.utils';
import React from 'react';

describe('Default Value', () => {
  test(
    'Should display 0 by default',
    async () => {
      const { getByTestId } = render(<Counter />);
      const counter = getByTestId('counter').innerHTML;
      expect(counter).toBe('0');
    },
  );
});

describe('Add 5 Times', () => {
  test(
    'Should display 5',
    async () => {
      const { getByTestId } = render(<Counter />);
      const { getByText } = within(getByTestId('counter'));
      const button = getByTestId('counter-plus');
      for (let i = 0; i < 5; i++) {
        button.click();
      }
      expect(getByText('5')).toBeDefined();
    },
  );
});

describe('Subtract 5 Times', () => {
  test(
    'Should display -5',
    async () => {
      const { getByTestId } = render(<Counter />);
      const { getByText } = within(getByTestId('counter'));
      const button = getByTestId('counter-minus');
      for (let i = 0; i < 5; i++) {
        button.click();
      }
      expect(getByText('-5')).toBeDefined();
    },
  );
});
