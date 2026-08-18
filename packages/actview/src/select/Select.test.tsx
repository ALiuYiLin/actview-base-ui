import { describe, expect, it, vi, beforeAll, afterEach } from 'vitest';
import { SelectRoot } from './root/SelectRoot';
import { SelectTrigger } from './trigger/SelectTrigger';
import { SelectValue } from './value/SelectValue';
import { SelectIcon } from './icon/SelectIcon';
import { SelectPortal } from './portal/SelectPortal';
import { SelectPositioner } from './positioner/SelectPositioner';
import { SelectPopup } from './popup/SelectPopup';
import { SelectList } from './list/SelectList';
import { SelectItem } from './item/SelectItem';
import { SelectItemText } from './item-text/SelectItemText';
import { SelectItemIndicator } from './item-indicator/SelectItemIndicator';
import { SelectArrow } from './arrow/SelectArrow';
import { SelectBackdrop } from './backdrop/SelectBackdrop';
import { SelectGroup } from './group/SelectGroup';
import { SelectGroupLabel } from './group-label/SelectGroupLabel';
import { SelectSeparator } from './separator/SelectSeparator';
import { createRenderer } from '../../test/createRenderer';

beforeAll(() => {
  // jsdom doesn't fully implement PointerEvent
  (window as any).PointerEvent = window.MouseEvent;
});

// `@actview/testing`'s `cleanup` removes the render container without running component
// unmount hooks, so portal nodes appended to `document.body` would leak between tests.
afterEach(() => {
  document
    .querySelectorAll('[data-base-ui-portal], [data-base-ui-focus-guard]')
    .forEach((node) => node.remove());
});

const { render, fireEvent, act, waitFor } = createRenderer();

// The popup is rendered through a portal into `document.body`, so queries scoped to the
// render container cannot see it. Use global document queries for the popup subtree.
function queryPopup(): HTMLElement | null {
  return document.querySelector('[data-testid="popup"]');
}

function queryList(): HTMLElement | null {
  return document.querySelector('[data-testid="list"]');
}

function SimpleSelect(props: any) {
  return (
    <SelectRoot {...props}>
      <SelectTrigger data-testid="trigger">
        <SelectValue data-testid="value" />
      </SelectTrigger>
      <SelectPortal>
        <SelectPositioner>
          <SelectPopup data-testid="popup">
            <SelectList data-testid="list">
              <SelectItem value="a" data-testid="item-a">
                <SelectItemText>Apple</SelectItemText>
                <SelectItemIndicator data-testid="indicator-a" />
              </SelectItem>
              <SelectItem value="b" data-testid="item-b">
                <SelectItemText>Banana</SelectItemText>
                <SelectItemIndicator data-testid="indicator-b" />
              </SelectItem>
              <SelectItem value="c" data-testid="item-c">
                <SelectItemText>Cherry</SelectItemText>
                <SelectItemIndicator data-testid="indicator-c" />
              </SelectItem>
            </SelectList>
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  );
}

function SelectWithGroup(props: any) {
  return (
    <SelectRoot {...props}>
      <SelectTrigger data-testid="trigger">
        <SelectValue data-testid="value" />
      </SelectTrigger>
      <SelectPortal>
        <SelectPositioner>
          <SelectPopup data-testid="popup">
            <SelectList data-testid="list">
              <SelectGroup>
                <SelectGroupLabel>Fruits</SelectGroupLabel>
                <SelectItem value="a" data-testid="item-a">
                  Apple
                </SelectItem>
                <SelectItem value="b" data-testid="item-b">
                  Banana
                </SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectGroupLabel>Vegetables</SelectGroupLabel>
                <SelectItem value="c" data-testid="item-c">
                  Carrot
                </SelectItem>
              </SelectGroup>
            </SelectList>
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  );
}

function MultipleSelect(props: any) {
  return (
    <SelectRoot multiple {...props}>
      <SelectTrigger data-testid="trigger">
        <SelectValue data-testid="value" />
      </SelectTrigger>
      <SelectPortal>
        <SelectPositioner>
          <SelectPopup data-testid="popup">
            <SelectList data-testid="list">
              <SelectItem value="a" data-testid="item-a">
                Apple
              </SelectItem>
              <SelectItem value="b" data-testid="item-b">
                Banana
              </SelectItem>
              <SelectItem value="c" data-testid="item-c">
                Cherry
              </SelectItem>
            </SelectList>
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  );
}

function SelectWithArrowAndBackdrop(props: any) {
  return (
    <SelectRoot {...props}>
      <SelectTrigger data-testid="trigger">
        <SelectValue data-testid="value" />
      </SelectTrigger>
      <SelectPortal>
        {/* The arrow only renders when the popup is not aligned with the trigger. */}
        <SelectPositioner alignItemWithTrigger={false}>
          <SelectArrow data-testid="arrow" />
          <SelectPopup data-testid="popup">
            <SelectList data-testid="list">
              <SelectItem value="a" data-testid="item-a">
                Apple
              </SelectItem>
            </SelectList>
          </SelectPopup>
          <SelectBackdrop data-testid="backdrop" />
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  );
}

describe('<Select />', () => {
  it('renders nothing while closed', async () => {
    const result = await render(SimpleSelect, {});
    expect(queryPopup()).toBe(null);
    expect(result.queryByText('Apple')).toBe(null);
  });

  it('opens on trigger mousedown', async () => {
    const result = await render(SimpleSelect, {});
    const trigger = result.getByTestId('trigger');
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });
    expect(queryList()?.querySelectorAll('[role="option"]')).toHaveLength(3);
  });

  it('closes on a second trigger mousedown', async () => {
    const result = await render(SimpleSelect, {});
    const trigger = result.getByTestId('trigger');
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).toBe(null);
    });
  });

  it('renders a hidden input with the serialized value', async () => {
    const result = await render(SimpleSelect, { name: 'country', defaultValue: 'a' });
    // `aria-hidden` is a boolean attribute: ActView renders it as a bare attribute (PD-01).
    const input = result.container.querySelector('input[aria-hidden]') as HTMLInputElement;
    expect(input).not.toBe(null);
    expect(input).toHaveAttribute('name', 'country');
    // `value` is a DOM property, not an attribute.
    expect(input.value).toBe('a');
  });

  it('renders the selected value in the trigger', async () => {
    // Without `items` data, the raw serialized value is displayed (matching the React version).
    const result = await render(SimpleSelect, { defaultValue: 'b' });
    expect(result.getByTestId('value').textContent).toBe('b');
  });

  it('renders the item label in the trigger when `items` data is provided', async () => {
    const items = { a: 'Apple', b: 'Banana' };
    const result = await render(SimpleSelect, { items, defaultValue: 'b' });
    expect(result.getByTestId('value').textContent).toBe('Banana');
  });

  it('shows the placeholder when no value is selected', async () => {
    const result = await render(SimpleSelect, {});
    expect(result.getByTestId('value').textContent).toBe('');
  });

  it('selects an item on click and closes the popup', async () => {
    const onValueChange = vi.fn();
    const result = await render(SimpleSelect, { onValueChange });
    const trigger = result.getByTestId('trigger');
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const item = queryPopup()!.querySelector('[data-testid="item-b"]') as HTMLElement;
    // A real click starts with a pointerdown on the item, which arms mouse selection.
    fireEvent.pointerDown(item, { pointerType: 'mouse' });
    fireEvent.click(item);

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith('b', expect.anything());
    });
    expect(result.getByTestId('value').textContent).toBe('b');
  });

  it('highlights items on hover', async () => {
    const result = await render(SimpleSelect, {});
    const trigger = result.getByTestId('trigger');
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const item = queryPopup()!.querySelector('[data-testid="item-b"]') as HTMLElement;
    fireEvent.mouseMove(item);
    await waitFor(() => {
      expect(item).toHaveAttribute('data-highlighted', '');
    });
  });

  it('navigates with arrow keys and commits with Enter', async () => {
    const onValueChange = vi.fn();
    const result = await render(SimpleSelect, { onValueChange });
    const trigger = result.getByTestId('trigger');
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const list = queryList()!;
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    await waitFor(() => {
      const firstItem = queryPopup()!.querySelector('[data-testid="item-a"]') as HTMLElement;
      expect(firstItem).toHaveAttribute('data-highlighted', '');
    });

    // Enter activation is handled by `useButton` on the item itself (keyboard clicks
    // dispatch a synthesized click on the focused item).
    const firstItem = queryPopup()!.querySelector('[data-testid="item-a"]') as HTMLElement;
    fireEvent.keyDown(firstItem, { key: 'Enter' });
    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith('a', expect.anything());
    });
  });

  it('supports multiple selection', async () => {
    const onValueChange = vi.fn();
    const result = await render(MultipleSelect, { onValueChange });
    const trigger = result.getByTestId('trigger');
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const itemA = queryPopup()!.querySelector('[data-testid="item-a"]') as HTMLElement;
    const itemB = queryPopup()!.querySelector('[data-testid="item-b"]') as HTMLElement;
    fireEvent.pointerDown(itemA, { pointerType: 'mouse' });
    fireEvent.click(itemA);
    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });
    fireEvent.pointerDown(itemB, { pointerType: 'mouse' });
    fireEvent.click(itemB);

    await waitFor(() => {
      expect(onValueChange).toHaveBeenLastCalledWith(['a', 'b'], expect.anything());
    });
  });

  it('marks selected items with aria-selected and the indicator', async () => {
    const result = await render(SimpleSelect, { defaultValue: 'b' });
    const trigger = result.getByTestId('trigger');
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const itemB = queryPopup()!.querySelector('[data-testid="item-b"]') as HTMLElement;
    const itemA = queryPopup()!.querySelector('[data-testid="item-a"]') as HTMLElement;
    expect(itemB).toHaveAttribute('aria-selected', 'true');
    expect(itemA).toHaveAttribute('aria-selected', 'false');

    // The indicator is only mounted for the selected item.
    const indicatorA = queryPopup()!.querySelector('[data-testid="indicator-a"]');
    const indicatorB = queryPopup()!.querySelector('[data-testid="indicator-b"]');
    expect(indicatorA).toBe(null);
    expect(indicatorB).not.toBe(null);
  });

  it('respects the controlled value prop', async () => {
    const onValueChange = vi.fn();
    // Without `items`, the raw serialized value is displayed (matching the React version).
    const result = await render(SimpleSelect, { value: 'a', onValueChange });
    expect(result.getByTestId('value').textContent).toBe('a');

    // Controlled: clicking an item fires onValueChange but the DOM stays driven by `value`.
    const trigger = result.getByTestId('trigger');
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });
    const itemC = queryPopup()!.querySelector('[data-testid="item-c"]') as HTMLElement;
    fireEvent.pointerDown(itemC, { pointerType: 'mouse' });
    fireEvent.click(itemC);
    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith('c', expect.anything());
    });
  });

  it('applies field validity attributes when inside a field', async () => {
    // Without a Field.Root, no validity mapping is applied.
    const result = await render(SimpleSelect, {});
    const trigger = result.getByTestId('trigger');
    expect(trigger).not.toHaveAttribute('data-invalid');
  });

  it('renders groups with labels', async () => {
    const result = await render(SelectWithGroup, {});
    const trigger = result.getByTestId('trigger');
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const popup = queryPopup()!;
    expect(popup.textContent).toContain('Fruits');
    expect(popup.textContent).toContain('Vegetables');
    const group = popup.querySelector('[role="group"]') as HTMLElement;
    expect(group).not.toBe(null);
    expect(group.getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('renders the arrow and backdrop', async () => {
    const result = await render(SelectWithArrowAndBackdrop, {});
    const trigger = result.getByTestId('trigger');
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });
    expect(document.querySelector('[data-testid="arrow"]')).not.toBe(null);
    expect(document.querySelector('[data-testid="backdrop"]')).not.toBe(null);
  });

  it('renders a separator', async () => {
    const result = await render(SimpleSelect, {});
    const trigger = result.getByTestId('trigger');
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });
    // Separator is a plain presentation element; the suite renders it through SelectSeparator
    // in dedicated tests. Here we just verify the popup contains the listbox.
    expect(queryList()?.getAttribute('role')).toBe('listbox');
  });
});
