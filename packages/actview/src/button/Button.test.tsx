import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { createRenderer } from '../../test/createRenderer';

describe('<Button />', () => {
  const { render, fireEvent } = createRenderer();

  it('renders a native button element with default props', async () => {
    const result = await render(Button, { 'data-testid': 'button' });

    const button = result.getByTestId('button');
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).not.toHaveAttribute('disabled');
    expect(button).not.toHaveAttribute('data-disabled');
  });

  it('renders a disabled native button with the disabled attribute', async () => {
    const handleClick = vi.fn();
    const handleKeyDown = vi.fn();

    const result = await render(Button, {
      disabled: true,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      'data-testid': 'button',
    });

    const button = result.getByTestId('button');
    expect(button).toHaveAttribute('disabled');
    expect(button).toHaveAttribute('data-disabled');
    expect(button).not.toHaveAttribute('aria-disabled');

    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'Enter' });

    expect(handleClick).not.toHaveBeenCalled();
    expect(handleKeyDown).not.toHaveBeenCalled();
  });

  it('applies button semantics to a custom element via the render prop', async () => {
    const handleClick = vi.fn();

    const result = await render(Button, {
      nativeButton: false,
      render: <span data-testid="custom" />,
      onClick: handleClick,
    });

    const button = result.getByTestId('custom');
    expect(button.tagName).toBe('SPAN');
    expect(button).toHaveAttribute('role', 'button');
    expect(button).toHaveAttribute('tabindex', '0');
    expect(button).not.toHaveAttribute('type');

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('custom element: disabled state applies aria-disabled and removes tabindex', async () => {
    const handleClick = vi.fn();

    const result = await render(Button, {
      disabled: true,
      nativeButton: false,
      render: <span data-testid="custom" />,
      onClick: handleClick,
    });

    const button = result.getByTestId('custom');
    expect(button).not.toHaveAttribute('disabled');
    expect(button).toHaveAttribute('data-disabled');
    // ActView renders boolean-true attributes as empty strings (issue #20).
    expect(button).toHaveAttribute('aria-disabled');
    expect(button).toHaveAttribute('tabindex', '-1');

    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('focusableWhenDisabled keeps the element focusable while blocking interactions', async () => {
    const handleClick = vi.fn();

    const result = await render(Button, {
      disabled: true,
      focusableWhenDisabled: true,
      onClick: handleClick,
      'data-testid': 'button',
    });

    const button = result.getByTestId('button');
    expect(button).not.toHaveAttribute('disabled');
    expect(button).toHaveAttribute('aria-disabled');
    expect(button).toHaveAttribute('tabindex', '0');

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('custom element: Space (keyup) and Enter (keydown) keys dispatch real clicks', async () => {
    const handleClick = vi.fn();

    const result = await render(Button, {
      nativeButton: false,
      render: <span data-testid="custom" />,
      onClick: handleClick,
    });

    const button = result.getByTestId('custom');

    fireEvent.keyDown(button, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyUp(button, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('forwards a ref to the component instance', async () => {
    let instance: unknown = null;

    const result = await render(Button, {
      ref: (node: unknown) => {
        instance = node;
      },
      'data-testid': 'button',
    });

    // ActView component-level refs point at the component instance, not the root DOM
    // element (issue #21). The DOM element itself is still rendered.
    expect(instance).not.toBe(null);
    expect(result.getByTestId('button').tagName).toBe('BUTTON');
  });
});
