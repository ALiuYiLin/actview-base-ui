import { expect } from 'vitest';
import { NumberField } from '@/number-field';
import { createRenderer } from '#test-utils';

describe('<NumberField.Group />', () => {
  const { render } = createRenderer();

  it('renders input, increment and decrement buttons', async () => {
    await render(
      NumberField.Root,
      {
        children: (
          <NumberField.Group>
            <NumberField.Increment>+</NumberField.Increment>
            <NumberField.Input />
            <NumberField.Decrement>-</NumberField.Decrement>
          </NumberField.Group>
        ),
      },
    );

    expect(document.querySelector('[aria-label="Increase"]')).toBeInTheDocument();
    expect(document.querySelector('[aria-label="Decrease"]')).toBeInTheDocument();
    const input = document.querySelector('input[type="text"]');
    expect(input).toBeInTheDocument();
  });
});
