import { expect, vi } from 'vitest';
import { nextTick } from 'actview';
import { Slider } from '@/slider';
import { createRenderer } from '#test-utils';
import { fireEvent, screen } from '#test-utils/rtl';

describe('<Slider />', () => {
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

  it('shows the value in Slider.Value', async () => {
    await render(
      Slider.Root,
      {
        defaultValue: 42,
        children: (
          <Slider.Control>
            <Slider.Track><Slider.Thumb /></Slider.Track>
            <Slider.Value />
          </Slider.Control>
        ),
      },
    );

    expect(screen.getByText('42')).toBeInTheDocument();
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

  it('renders the indicator between values', async () => {
    await render(
      Slider.Root,
      {
        defaultValue: [20, 80],
        children: (
          <Slider.Control>
            <Slider.Track>
              <Slider.Indicator />
              <Slider.Thumb index={0} />
              <Slider.Thumb index={1} />
            </Slider.Track>
          </Slider.Control>
        ),
      },
    );

    const inputs = document.querySelectorAll('input[type="range"]');
    expect(inputs.length).toBe(2);
    expect(document.querySelectorAll('[role="group"] input').length).toBe(2);
  });
});
