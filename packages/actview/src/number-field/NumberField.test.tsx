import { describe, expect, it, vi, beforeAll } from 'vitest';
import { NumberFieldRoot } from './root/NumberFieldRoot';
import { NumberFieldInput } from './input/NumberFieldInput';
import { NumberFieldIncrement } from './increment/NumberFieldIncrement';
import { NumberFieldDecrement } from './decrement/NumberFieldDecrement';
import { NumberFieldGroup } from './group/NumberFieldGroup';
import { createRenderer } from '../../test/createRenderer';

beforeAll(() => {
  // jsdom doesn't fully implement PointerEvent
  (window as any).PointerEvent = window.MouseEvent;
});

function NumberField(props: any) {
  return (
    <NumberFieldRoot data-testid="root" {...props}>
      <NumberFieldGroup>
        <NumberFieldInput data-testid="input" />
        <NumberFieldIncrement />
        <NumberFieldDecrement />
      </NumberFieldGroup>
    </NumberFieldRoot>
  );
}

function FormDemo(props: any) {
  return (
    <form data-testid="form">
      <NumberFieldRoot name="quantity" min={0} step={0.1} {...props}>
        <NumberFieldGroup>
          <NumberFieldInput data-testid="input" />
        </NumberFieldGroup>
      </NumberFieldRoot>
      <button type="submit">Submit</button>
    </form>
  );
}

describe('<NumberField />', () => {
  const { render, fireEvent, act, waitFor } = createRenderer();

  it('renders a textbox input with the formatted defaultValue', async () => {
    const result = await render(NumberField, { defaultValue: 1 });
    const input = result.getByTestId('input') as HTMLInputElement;
    expect(input.value).toBe('1');
  });

  it('renders an empty input when no value is provided', async () => {
    const result = await render(NumberField);
    const input = result.getByTestId('input') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('accepts a controlled value that can change over time', async () => {
    const result = await render(NumberField, { value: 1 });
    const input = result.getByTestId('input') as HTMLInputElement;
    expect(input.value).toBe('1');

    await result.setProps({ value: 2 });
    await waitFor(() => {
      expect(input.value).toBe('2');
    });
  });

  it('calls onValueChange with the parsed number when typing', async () => {
    const onValueChange = vi.fn();
    const result = await render(NumberField, { onValueChange });
    const input = result.getByTestId('input') as HTMLInputElement;

    fireEvent.input(input, { target: { value: '2' } });
    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });

    expect(onValueChange.mock.calls[0][0]).toBe(2);
  });

  it('fires onValueChange with null when the input is cleared', async () => {
    const onValueChange = vi.fn();
    const result = await render(NumberField, { defaultValue: 1, onValueChange });
    const input = result.getByTestId('input') as HTMLInputElement;

    fireEvent.input(input, { target: { value: '' } });
    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });

    expect(onValueChange.mock.calls[0][0]).toBe(null);
    expect(onValueChange.mock.calls[0][1].reason).toBe('input-clear');
  });

  it('increments the value when the increment button is clicked', async () => {
    const onValueChange = vi.fn();
    const result = await render(NumberField, { defaultValue: 5, onValueChange });
    const input = result.getByTestId('input') as HTMLInputElement;
    const increment = result.container.querySelector(
      'button[aria-label="Increase"]',
    ) as HTMLButtonElement;

    fireEvent.click(increment);
    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });

    expect(onValueChange.mock.calls[0][0]).toBe(6);
    expect(onValueChange.mock.calls[0][1].reason).toBe('increment-press');
    expect(input.value).toBe('6');
  });

  it('decrements the value when the decrement button is clicked', async () => {
    const onValueChange = vi.fn();
    const result = await render(NumberField, { defaultValue: 5, onValueChange });
    const input = result.getByTestId('input') as HTMLInputElement;
    const decrement = result.container.querySelector(
      'button[aria-label="Decrease"]',
    ) as HTMLButtonElement;

    fireEvent.click(decrement);
    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });

    expect(onValueChange.mock.calls[0][0]).toBe(4);
    expect(input.value).toBe('4');
  });

  it('clamps step interactions to min/max', async () => {
    const onValueChange = vi.fn();
    const result = await render(NumberField, {
      defaultValue: 10,
      min: 0,
      max: 10,
      onValueChange,
    });
    const increment = result.container.querySelector(
      'button[aria-label="Increase"]',
    ) as HTMLButtonElement;

    fireEvent.click(increment);
    await act(() => {});
    expect(onValueChange).not.toHaveBeenCalled();

    const input = result.getByTestId('input') as HTMLInputElement;
    expect(input.value).toBe('10');
  });

  it('steps with ArrowUp and ArrowDown on the input', async () => {
    const onValueChange = vi.fn();
    const result = await render(NumberField, { defaultValue: 5, onValueChange });
    const input = result.getByTestId('input') as HTMLInputElement;

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });
    expect(onValueChange.mock.calls[0][0]).toBe(6);
    expect(onValueChange.mock.calls[0][1].reason).toBe('keyboard');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledTimes(2);
    });
    expect(onValueChange.mock.calls[1][0]).toBe(5);
  });

  it('commits the value on blur after typing', async () => {
    const onValueCommitted = vi.fn();
    const result = await render(NumberField, { defaultValue: 1, onValueCommitted });
    const input = result.getByTestId('input') as HTMLInputElement;

    fireEvent.input(input, { target: { value: '3' } });
    await act(() => {});

    fireEvent.blur(input);
    await waitFor(() => {
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
    });
    expect(onValueCommitted.mock.calls[0][0]).toBe(3);
    expect(onValueCommitted.mock.calls[0][1].reason).toBe('input-blur');
  });

  it('does not commit when blurring an untouched empty field', async () => {
    const onValueCommitted = vi.fn();
    const result = await render(NumberField, { onValueCommitted });
    const input = result.getByTestId('input') as HTMLInputElement;

    fireEvent.blur(input);
    await act(() => {});
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it('renders a hidden number input for form submission', async () => {
    const result = await render(NumberField, { defaultValue: 7, name: 'quantity' });
    const hiddenInput = result.container.querySelector(
      'input[type="number"][name="quantity"]',
    ) as HTMLInputElement;
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput.value).toBe('7');
  });

  it('blocks submission when step mismatch occurs', async () => {
    const result = await render(FormDemo, {});

    const input = result.getByTestId('input') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '0.11' } });
    await act(() => {});

    const hiddenInput = result.container.querySelector(
      'input[type="number"][name="quantity"]',
    ) as HTMLInputElement;
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput.validity.stepMismatch).toBe(true);

    const form = result.getByTestId('form') as HTMLFormElement;
    expect(form.checkValidity()).toBe(false);
  });
});
