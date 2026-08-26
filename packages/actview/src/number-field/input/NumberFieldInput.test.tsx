import { expect, vi } from 'vitest';
import { nextTick } from 'actview';
import { NumberField } from '@/number-field';
import { createRenderer } from '#test-utils';
import { fireEvent } from '#test-utils/rtl';

async function settle() {
  await nextTick();
  await nextTick();
  await nextTick();
}

describe('<NumberField.Input />', () => {
  const { render } = createRenderer();

  const Basic = ({defaultValue, onValueChange}: {defaultValue?: number, onValueChange?: (v: any, d: any) => void}) => (
    <NumberField.Root defaultValue={defaultValue} onValueChange={onValueChange as any}>
      <NumberField.Group>
        <NumberField.Increment>+</NumberField.Increment>
        <NumberField.Input />
        <NumberField.Decrement>-</NumberField.Decrement>
      </NumberField.Group>
    </NumberField.Root>
  );

  it('respects defaultValue', async () => {
    await render(
      NumberField.Root,
      {
        defaultValue: 5,
        children: <NumberField.Input />,
      },
    );
    await settle();

    expect(document.querySelector('input[type="text"]')).toHaveValue('5');
  });

  it('steps with arrow keys', async () => {
    const onValueChange = vi.fn();
    await render(Basic, {defaultValue: 0, onValueChange});

    const input = document.querySelector('input[type="text"]')!;
    fireEvent.keyDown(input, {key: 'ArrowUp'});
    await settle();

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toBe(1);
  });
});
