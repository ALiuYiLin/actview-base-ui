import { describe, expect, it, vi } from 'vitest';
import { Input } from '@/input/Input';
import { createRenderer } from '../../test/createRenderer';

describe('<Input />', () => {
  const { render, fireEvent } = createRenderer();

  it('renders an input element', async () => {
    const result = await render(Input, { 'data-testid': 'input' });
    const input = result.getByTestId('input');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('data-testid', 'input');
  });

  it('renders the defaultValue when uncontrolled', async () => {
    const result = await render(Input, { defaultValue: 'abc', 'data-testid': 'input' });
    expect(result.getByTestId('input')).toHaveValue('abc');
  });

  it('fires onValueChange on input with the new value (uncontrolled)', async () => {
    const handleValueChange = vi.fn();

    const result = await render(Input, {
      onValueChange: handleValueChange,
      'data-testid': 'input',
    });

    fireEvent.input(result.getByTestId('input'), { target: { value: 'hello' } });

    expect(handleValueChange).toHaveBeenCalledTimes(1);
    expect(handleValueChange.mock.calls[0][0]).toBe('hello');
    expect(handleValueChange.mock.calls[0][1].reason).toBe('none');
  });

  it('reflects a controlled value', async () => {
    const result = await render(Input, { value: 'controlled', 'data-testid': 'input' });
    expect(result.getByTestId('input')).toHaveValue('controlled');
  });

  it('fires onValueChange with a controlled value', async () => {
    const handleValueChange = vi.fn();

    const result = await render(Input, {
      value: 'a',
      onValueChange: handleValueChange,
      'data-testid': 'input',
    });

    fireEvent.input(result.getByTestId('input'), { target: { value: 'b' } });

    expect(handleValueChange).toHaveBeenCalledTimes(1);
    expect(handleValueChange.mock.calls[0][0]).toBe('b');
  });

  it('forwards native props to the input element', async () => {
    const result = await render(Input, {
      type: 'email',
      placeholder: 'Enter email',
      'data-testid': 'input',
    });

    const input = result.getByTestId('input');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'Enter email');
  });

  it('applies the disabled attribute', async () => {
    const result = await render(Input, { disabled: true, 'data-testid': 'input' });
    expect(result.getByTestId('input')).toHaveAttribute('disabled');
    expect(result.getByTestId('input')).toHaveAttribute('data-disabled');
  });
});
