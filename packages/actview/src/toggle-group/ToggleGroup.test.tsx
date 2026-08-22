import { describe, expect, it, vi } from 'vitest';
import { ToggleGroup } from '@/toggle-group/ToggleGroup';
import { Toggle } from '@/toggle/Toggle';
import { createRenderer } from '../../test/createRenderer';

const { render, fireEvent, act } = createRenderer();

function ToggleGroupWithToggles(props: any) {
  return (
    <ToggleGroup {...props}>
      <Toggle value="one" data-testid="toggle-1" />
      <Toggle value="two" data-testid="toggle-2" />
    </ToggleGroup>
  );
}

function ToggleGroupWithThreeToggles(props: any) {
  return (
    <ToggleGroup {...props}>
      <Toggle value="one" data-testid="toggle-1" />
      <Toggle value="two" data-testid="toggle-2" />
      <Toggle value="three" data-testid="toggle-3" />
    </ToggleGroup>
  );
}

function ToggleGroupWithOmittedValues(props: any) {
  return (
    <ToggleGroup {...props}>
      <Toggle data-testid="toggle-1" />
      <Toggle value="" data-testid="toggle-2" />
    </ToggleGroup>
  );
}

function ToggleGroupWithDisabledItem(props: any) {
  return (
    <ToggleGroup {...props}>
      <Toggle value="one" data-testid="toggle-1" />
      <Toggle value="two" disabled data-testid="toggle-2" />
    </ToggleGroup>
  );
}

function getToggles(): HTMLElement[] {
  return [
    document.querySelector('[data-testid="toggle-1"]') as HTMLElement,
    document.querySelector('[data-testid="toggle-2"]') as HTMLElement,
    document.querySelector('[data-testid="toggle-3"]') as HTMLElement,
  ].filter(Boolean);
}

function getGroup(): HTMLElement | null {
  return document.querySelector('[role="group"]');
}

describe('<ToggleGroup />', () => {
  it('renders a `group`', async () => {
    await render(ToggleGroup, { 'aria-label': 'My Toggle Group' });

    const group = getGroup();
    expect(group).not.toBe(null);
    expect(group).toHaveAttribute('aria-label', 'My Toggle Group');
  });

  describe('uncontrolled', () => {
    it('pressed state', async () => {
      await render(ToggleGroupWithToggles, {});

      const [button1, button2] = getToggles();

      expect(button1).toHaveAttribute('aria-pressed', 'false');
      expect(button2).toHaveAttribute('aria-pressed', 'false');

      await act(() => {
        fireEvent.click(button1);
      });

      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button1).toHaveAttribute('data-pressed');
      expect(button2).toHaveAttribute('aria-pressed', 'false');

      await act(() => {
        fireEvent.click(button2);
      });

      expect(button2).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('data-pressed');
      expect(button1).toHaveAttribute('aria-pressed', 'false');
    });

    it('prop: defaultValue', async () => {
      await render(ToggleGroupWithToggles, { defaultValue: ['two'] });

      const [button1, button2] = getToggles();

      expect(button2).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('data-pressed');
      expect(button1).toHaveAttribute('aria-pressed', 'false');

      await act(() => {
        fireEvent.click(button1);
      });

      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button1).toHaveAttribute('data-pressed');
      expect(button2).toHaveAttribute('aria-pressed', 'false');
    });

    it('when Toggles omit value', async () => {
      await render(ToggleGroupWithOmittedValues, {});

      const [button1, button2] = getToggles();

      expect(button2).toHaveAttribute('aria-pressed', 'false');
      expect(button1).toHaveAttribute('aria-pressed', 'false');

      await act(() => {
        fireEvent.click(button1);
      });
      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('aria-pressed', 'false');

      await act(() => {
        fireEvent.click(button2);
      });
      expect(button1).toHaveAttribute('aria-pressed', 'false');
      expect(button2).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('controlled', () => {
    it('pressed state reacts to value prop changes', async () => {
      const result = await render(ToggleGroupWithToggles, { value: ['two'] });

      const [button1, button2] = getToggles();

      expect(button1).toHaveAttribute('aria-pressed', 'false');
      expect(button2).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('data-pressed');

      await result.setProps({ value: ['one'] });

      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button1).toHaveAttribute('data-pressed');
      expect(button2).toHaveAttribute('aria-pressed', 'false');

      await result.setProps({ value: ['two'] });

      expect(button2).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('data-pressed');
      expect(button1).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('prop: disabled', () => {
    it('can disable the whole group', async () => {
      await render(ToggleGroupWithToggles, { disabled: true });

      const [button1, button2] = getToggles();

      expect(button1).toHaveAttribute('aria-disabled', 'true');
      expect(button1).toHaveAttribute('data-disabled');
      expect(button2).toHaveAttribute('aria-disabled', 'true');
      expect(button2).toHaveAttribute('data-disabled');
    });

    it('can disable individual items', async () => {
      await render(ToggleGroupWithDisabledItem, {});

      const [button1, button2] = getToggles();

      expect(button1).toHaveAttribute('aria-disabled', 'false');
      expect(button1).not.toHaveAttribute('data-disabled');
      expect(button2).toHaveAttribute('aria-disabled', 'true');
      expect(button2).toHaveAttribute('data-disabled');
    });
  });

  describe('prop: orientation', () => {
    it('vertical', async () => {
      await render(ToggleGroupWithToggles, { orientation: 'vertical' });

      const group = getGroup();
      expect(group).toHaveAttribute('data-orientation', 'vertical');
    });

    it('does not render aria-orientation on role="group"', async () => {
      await render(ToggleGroupWithToggles, { orientation: 'horizontal' });

      const group = getGroup();
      expect(group).not.toHaveAttribute('aria-orientation');
    });
  });

  describe('prop: multiple', () => {
    it('multiple items can be pressed when true', async () => {
      await render(ToggleGroupWithToggles, {
        multiple: true,
        defaultValue: ['one'],
      });

      const [button1, button2] = getToggles();

      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('aria-pressed', 'false');

      await act(() => {
        fireEvent.click(button2);
      });

      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('aria-pressed', 'true');
    });

    it('only one item can be pressed when false', async () => {
      await render(ToggleGroupWithToggles, { defaultValue: ['one'] });

      const [button1, button2] = getToggles();

      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('aria-pressed', 'false');

      await act(() => {
        fireEvent.click(button2);
      });

      expect(button1).toHaveAttribute('aria-pressed', 'false');
      expect(button2).toHaveAttribute('aria-pressed', 'true');
    });

    it('when Toggles omit value', async () => {
      await render(ToggleGroupWithOmittedValues, { multiple: true });

      const [button1, button2] = getToggles();

      expect(button2).toHaveAttribute('aria-pressed', 'false');
      expect(button1).toHaveAttribute('aria-pressed', 'false');

      await act(() => {
        fireEvent.click(button1);
      });
      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('aria-pressed', 'false');

      await act(() => {
        fireEvent.click(button2);
      });
      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('aria-pressed', 'true');

      await act(() => {
        fireEvent.click(button1);
      });
      expect(button1).toHaveAttribute('aria-pressed', 'false');
      expect(button2).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('keyboard interactions', () => {
    it('ArrowRight moves focus to the next item', async () => {
      await render(ToggleGroupWithThreeToggles, {});

      const [button1, button2, button3] = getToggles();

      button1.focus();

      await act(() => {
        fireEvent.keyDown(button1, { key: 'ArrowRight' });
      });
      expect(button2).toHaveFocus();

      await act(() => {
        fireEvent.keyDown(button2, { key: 'ArrowRight' });
      });
      expect(button3).toHaveFocus();

      // loop to the beginning
      await act(() => {
        fireEvent.keyDown(button3, { key: 'ArrowRight' });
      });
      expect(button1).toHaveFocus();
    });

    it('Home key moves focus to the first item', async () => {
      await render(ToggleGroupWithThreeToggles, {});

      const [button1, , button3] = getToggles();

      button3.focus();

      await act(() => {
        fireEvent.keyDown(button3, { key: 'Home' });
      });
      expect(button1).toHaveFocus();
    });

    it('End key moves focus to the last item', async () => {
      await render(ToggleGroupWithThreeToggles, {});

      const [button1, , button3] = getToggles();

      button1.focus();

      await act(() => {
        fireEvent.keyDown(button1, { key: 'End' });
      });
      expect(button3).toHaveFocus();
    });
  });

  describe('prop: onValueChange', () => {
    it('fires when an item is clicked', async () => {
      const onValueChange = vi.fn();

      await render(ToggleGroupWithToggles, { onValueChange });

      const [button1, button2] = getToggles();

      expect(onValueChange.mock.calls.length).toBe(0);

      await act(() => {
        fireEvent.click(button1);
      });

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toEqual(['one']);

      await act(() => {
        fireEvent.click(button2);
      });

      expect(onValueChange.mock.calls.length).toBe(2);
      expect(onValueChange.mock.calls[1][0]).toEqual(['two']);
    });

    it('does not change the value when the event is canceled', async () => {
      const onValueChange = vi.fn((_value: string[], eventDetails: any) => {
        eventDetails.cancel();
      });

      await render(ToggleGroupWithToggles, { onValueChange });

      const [button1] = getToggles();

      await act(() => {
        fireEvent.click(button1);
      });

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(button1).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
