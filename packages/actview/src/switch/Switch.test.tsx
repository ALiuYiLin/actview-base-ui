import { expect, vi } from 'vitest';
import { nextTick } from 'actview';
import { Switch } from '@/switch';
import { createRenderer } from '#test-utils';
import { fireEvent } from '#test-utils/rtl';

describe('<Switch.Root />', () => {
  const { render } = createRenderer();

  it('renders role="switch" with a hidden checkbox input', async () => {
    await render(Switch.Root, {children: null});

    const root = document.querySelector('[role="switch"]') as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('aria-checked', 'false');
    const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it('toggles checked on click', async () => {
    await render(Switch.Root, {children: null});

    const root = document.querySelector('[role="switch"]') as HTMLElement;
    fireEvent.click(root);
    await nextTick();
    expect(root).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(root);
    await nextTick();
    expect(root).toHaveAttribute('aria-checked', 'false');
  });

  it('fires onCheckedChange', async () => {
    const onCheckedChange = vi.fn();
    await render(Switch.Root, {onCheckedChange, children: null});

    fireEvent.click(document.querySelector('[role="switch"]') as HTMLElement);
    await nextTick();

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange.mock.calls[0][0]).toBe(true);
  });

  it('respects defaultChecked', async () => {
    await render(Switch.Root, {defaultChecked: true, children: null});

    const root = document.querySelector('[role="switch"]') as HTMLElement;
    expect(root).toHaveAttribute('aria-checked', 'true');
    expect(root).toHaveAttribute('data-checked', '');
  });

  it('renders the thumb with state attributes', async () => {
    await render(
      Switch.Root,
      {defaultChecked: true, children: (<Switch.Thumb />)},
    );

    const thumb = document.querySelector('[data-checked] span');
    expect(thumb).toBeInTheDocument();
  });

  it('stops at readOnly', async () => {
    const onCheckedChange = vi.fn();
    await render(Switch.Root, {readOnly: true, onCheckedChange, children: null});

    fireEvent.click(document.querySelector('[role="switch"]') as HTMLElement);
    await nextTick();

    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
