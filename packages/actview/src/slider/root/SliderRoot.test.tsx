import { describe, expect, it, vi, beforeAll } from 'vitest';
import { SliderRoot } from './SliderRoot';
import { SliderControl } from '../control/SliderControl';
import { SliderTrack } from '../track/SliderTrack';
import { SliderThumb } from '../thumb/SliderThumb';
import { SliderIndicator } from '../indicator/SliderIndicator';
import { createRenderer } from '../../../test/createRenderer';

beforeAll(() => {
  // jsdom doesn't fully implement PointerEvent
  (window as any).PointerEvent = window.MouseEvent;
});

// `any` props: `SliderRoot.Props` includes a function `className`, which collides
// with the JSX element check when spread (plantform-diff.md PD-22).
function SimpleSlider(props: any) {
  return (
    <SliderRoot data-testid="root" {...props}>
      <SliderControl>
        <SliderTrack>
          <SliderIndicator />
          <SliderThumb data-testid="thumb" />
        </SliderTrack>
      </SliderControl>
    </SliderRoot>
  );
}

describe('<Slider.Root />', () => {
  const { render, fireEvent, act } = createRenderer();

  it('renders with role="group"', async () => {
    const result = await render(SimpleSlider, { defaultValue: 50 });
    const root = result.getByTestId('root');
    expect(root).toHaveAttribute('role', 'group');
  });

  it('renders a hidden range input with the correct initial value', async () => {
    const result = await render(SimpleSlider, { defaultValue: 35 });
    const input = result.container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('35');
  });

  it('calls onValueChange when a thumb receives an ArrowRight keydown', async () => {
    const onValueChange = vi.fn();
    const result = await render(SimpleSlider, { defaultValue: 50, onValueChange });
    const input = result.container.querySelector('input[type="range"]') as HTMLInputElement;
    input!.focus();

    fireEvent.keyDown(input!, { key: 'ArrowRight' });
    await act(() => {});
    expect(onValueChange).toHaveBeenCalled();
  });

  it('increments the value on ArrowRight', async () => {
    const result = await render(SimpleSlider, { defaultValue: 50 });
    const input = result.container.querySelector('input[type="range"]') as HTMLInputElement;
    input!.focus();

    fireEvent.keyDown(input!, { key: 'ArrowRight' });
    await act(() => {});
    expect(input!.value).toBe('51');
  });

  it('decrements the value on ArrowLeft', async () => {
    const result = await render(SimpleSlider, { defaultValue: 50 });
    const input = result.container.querySelector('input[type="range"]') as HTMLInputElement;
    input!.focus();

    fireEvent.keyDown(input!, { key: 'ArrowLeft' });
    await act(() => {});
    expect(input!.value).toBe('49');
  });

  it('clamps the value to min/max', async () => {
    const result = await render(SimpleSlider, { defaultValue: 50, min: 20, max: 80 });
    const input = result.container.querySelector('input[type="range"]') as HTMLInputElement;

    // ArrowRight past max
    for (let i = 0; i < 40; i++) {
      fireEvent.keyDown(input!, { key: 'ArrowRight' });
    }
    await act(() => {});
    expect(input!.value).toBe('80');

    // ArrowLeft past min
    for (let i = 0; i < 70; i++) {
      fireEvent.keyDown(input!, { key: 'ArrowLeft' });
    }
    await act(() => {});
    expect(input!.value).toBe('20');
  });

  it('handles Home (jump to min) and End (jump to max)', async () => {
    const onValueChange = vi.fn();
    const result = await render(SimpleSlider, {
      defaultValue: 50,
      min: 0,
      max: 200,
      onValueChange,
    });
    const input = result.container.querySelector('input[type="range"]') as HTMLInputElement;
    input!.focus();

    fireEvent.keyDown(input!, { key: 'Home' });
    await act(() => {});
    expect(input!.value).toBe('0');

    fireEvent.keyDown(input!, { key: 'End' });
    await act(() => {});
    expect(input!.value).toBe('200');
  });

  it('uses step prop correctly', async () => {
    const onValueChange = vi.fn();
    const result = await render(SimpleSlider, { defaultValue: 50, step: 5, onValueChange });
    const input = result.container.querySelector('input[type="range"]') as HTMLInputElement;
    input!.focus();

    fireEvent.keyDown(input!, { key: 'ArrowRight' });
    await act(() => {});
    expect(input!.value).toBe('55');
  });

  it('moves by largeStep when shift is pressed', async () => {
    const result = await render(SimpleSlider, { defaultValue: 50, largeStep: 20 });
    const input = result.container.querySelector('input[type="range"]') as HTMLInputElement;
    input!.focus();

    fireEvent.keyDown(input!, { key: 'ArrowRight', shiftKey: true });
    await act(() => {});
    expect(input!.value).toBe('70');
  });

  it('supports PageUp / PageDown', async () => {
    const result = await render(SimpleSlider, { defaultValue: 50, largeStep: 20 });
    const input = result.container.querySelector('input[type="range"]') as HTMLInputElement;
    input!.focus();

    fireEvent.keyDown(input!, { key: 'PageUp' });
    await act(() => {});
    expect(input!.value).toBe('70');

    fireEvent.keyDown(input!, { key: 'PageDown' });
    await act(() => {});
    expect(input!.value).toBe('50');
  });
});