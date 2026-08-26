import { expect, vi } from 'vitest';
import { nextTick } from 'actview';
import { Slider } from '@/slider';
import { createRenderer } from '#test-utils';
import { fireEvent } from '#test-utils/rtl';

describe('<Slider.Root />', () => {
  const { render } = createRenderer();

  it('renders a role="group" root with a range input', async () => {
    await render(
      Slider.Root,
      {children: (<Slider.Control><Slider.Track><Slider.Thumb /></Slider.Track></Slider.Control>)},
    );

    expect(document.querySelector('[role="group"]')).toBeInTheDocument();
    const input = document.querySelector('input[type="range"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
    expect(input.value).toBe('0');
  });

  it('respects value/defaultValue', async () => {
    await render(
      Slider.Root,
      {defaultValue: 50, children: (<Slider.Control><Slider.Thumb /></Slider.Control>)},
    );

    const input = document.querySelector('input[type="range"]') as HTMLInputElement;
    expect(input.value).toBe('50');
  });

  it('fires onValueChange on input change', async () => {
    const onValueChange = vi.fn();
    await render(
      Slider.Root,
      {
        defaultValue: 50,
        onValueChange,
        children: (<Slider.Control><Slider.Thumb /></Slider.Control>),
      },
    );

    const input = document.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.input(input, {target: {value: '75'}});
    await nextTick();

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toBe(75);
  });
});
