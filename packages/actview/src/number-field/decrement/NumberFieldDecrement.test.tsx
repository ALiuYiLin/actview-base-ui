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

describe('<NumberField.Decrement />', () => {
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

  it('decrements on button click', async () => {
    const onValueChange = vi.fn();
    await render(Basic, {defaultValue: 0, onValueChange});

    fireEvent.click(document.querySelector('[aria-label="Decrease"]')!);
    await settle();

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toBe(-1);
  });
});
