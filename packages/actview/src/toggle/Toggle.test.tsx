import { expect, vi } from 'vitest';
import { nextTick } from 'actview';
import { Toggle } from '@/toggle';
import { ToggleGroup } from '@/toggle-group';
import { createRenderer } from '#test-utils';
import { fireEvent } from '#test-utils/rtl';

describe('<Toggle.Root />', () => {
  const { render } = createRenderer();

  it('renders a native button with aria-pressed', async () => {
    await render(Toggle.Root, {children: null});

    const button = document.querySelector('button') as HTMLButtonElement;
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles pressed state on click', async () => {
    await render(Toggle.Root, {children: null});

    const button = document.querySelector('button') as HTMLButtonElement;
    fireEvent.click(button);
    await nextTick();
    expect(button).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(button);
    await nextTick();
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('fires onPressedChange', async () => {
    const onPressedChange = vi.fn();
    await render(Toggle.Root, {onPressedChange, children: null});

    fireEvent.click(document.querySelector('button') as HTMLButtonElement);
    await nextTick();

    expect(onPressedChange).toHaveBeenCalledTimes(1);
    expect(onPressedChange.mock.calls[0][0]).toBe(true);
  });

  it('respects controlled pressed prop', async () => {
    await render(Toggle.Root, {pressed: true, children: null});

    expect(document.querySelector('button')).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('<ToggleGroup.Root />', () => {
  const { render } = createRenderer();

  it('renders a group with role="group"', async () => {
    await render(
      ToggleGroup.Root,
      {children: (<><Toggle.Root value="a" children={null} /><Toggle.Root value="b" children={null} /></>)},
    );

    expect(document.querySelector('[role="group"]')).toBeInTheDocument();
    const buttons = document.querySelectorAll('button');
    expect(buttons.length).toBe(2);
  });

  it('single-select: pressing one unpressed the other', async () => {
    const onValueChange = vi.fn();
    await render(
      ToggleGroup.Root,
      {
        onValueChange,
        children: (<><Toggle.Root value="a" children={null} /><Toggle.Root value="b" children={null} /></>),
      },
    );

    const buttons = document.querySelectorAll('button');
    fireEvent.click(buttons[1]);
    await nextTick();

    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toEqual(['b']);

    fireEvent.click(buttons[0]);
    await nextTick();
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('multiple: independent pressed states', async () => {
    await render(
      ToggleGroup.Root,
      {
        multiple: true,
        children: (<><Toggle.Root value="a" children={null} /><Toggle.Root value="b" children={null} /></>),
      },
    );

    const buttons = document.querySelectorAll('button');
    fireEvent.click(buttons[0]);
    await nextTick();
    fireEvent.click(buttons[1]);
    await nextTick();

    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
  });

  it('respects defaultValue', async () => {
    await render(
      ToggleGroup.Root,
      {
        defaultValue: ['a'],
        children: (<><Toggle.Root value="a" children={null} /><Toggle.Root value="b" children={null} /></>),
      },
    );

    const buttons = document.querySelectorAll('button');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
  });
});
