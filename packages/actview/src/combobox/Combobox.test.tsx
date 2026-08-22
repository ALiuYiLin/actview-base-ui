import { describe, expect, it, vi, beforeAll, afterEach } from 'vitest';
import { ComboboxRoot } from '@/combobox/root/ComboboxRoot';
import { ComboboxInput } from '@/combobox/input/ComboboxInput';
import { ComboboxTrigger } from '@/combobox/trigger/ComboboxTrigger';
import { ComboboxPortal } from '@/combobox/portal/ComboboxPortal';
import { ComboboxPositioner } from '@/combobox/positioner/ComboboxPositioner';
import { ComboboxPopup } from '@/combobox/popup/ComboboxPopup';
import { ComboboxList } from '@/combobox/list/ComboboxList';
import { ComboboxItem } from '@/combobox/item/ComboboxItem';
import { ComboboxItemIndicator } from '@/combobox/item-indicator/ComboboxItemIndicator';
import { ComboboxGroup } from '@/combobox/group/ComboboxGroup';
import { ComboboxGroupLabel } from '@/combobox/group-label/ComboboxGroupLabel';
import { ComboboxLabel } from '@/combobox/label/ComboboxLabel';
import { ComboboxValue } from '@/combobox/value/ComboboxValue';
import { ComboboxClear } from '@/combobox/clear/ComboboxClear';
import { ComboboxChips } from '@/combobox/chips/ComboboxChips';
import { ComboboxChip } from '@/combobox/chip/ComboboxChip';
import { ComboboxChipRemove } from '@/combobox/chip-remove/ComboboxChipRemove';
import { ComboboxArrow } from '@/combobox/arrow/ComboboxArrow';
import { ComboboxBackdrop } from '@/combobox/backdrop/ComboboxBackdrop';
import { ComboboxIcon } from '@/combobox/icon/ComboboxIcon';
import { createRenderer } from '#/test/createRenderer';

beforeAll(() => {
  // jsdom doesn't fully implement PointerEvent
  (window as any).PointerEvent = window.MouseEvent;
});

afterEach(() => {
  document
    .querySelectorAll('[data-base-ui-portal], [data-base-ui-focus-guard]')
    .forEach((node) => node.remove());
});

const { render, fireEvent, act, waitFor } = createRenderer();

function queryPopup(): HTMLElement | null {
  return document.querySelector('[data-testid="popup"]');
}

function queryList(): HTMLElement | null {
  return document.querySelector('[data-testid="list"]');
}

function queryInput(): HTMLInputElement | null {
  return document.querySelector('[data-testid="input"]');
}

/**
 * The actview JSX type layer intersects component props with `HTMLAttributes`, whose
 * `children` excludes functions, so a function child can't be passed inline. Routing it
 * through an `any`-typed helper keeps the runtime render-prop supported (see QA note on
 * `LibraryManagedAttributes = P & HTMLAttributes`).
 */
function renderItems(): any {
  return (item: string) => (
    <ComboboxItem key={item} value={item} data-testid={`item-${item}`}>
      {item}
    </ComboboxItem>
  );
}

function renderItemsWithIndicator(): any {
  return (item: string) => (
    <ComboboxItem key={item} value={item} data-testid={`item-${item}`}>
      {item}
      <ComboboxItemIndicator data-testid={`indicator-${item}`} />
    </ComboboxItem>
  );
}

function renderGroups(): any {
  return (group: any) => (
    <ComboboxGroup key={group.value} items={group.items}>
      <ComboboxGroupLabel>{group.value}</ComboboxGroupLabel>
      <ComboboxItem value="Apple" data-testid="item-Apple">
        Apple
      </ComboboxItem>
      <ComboboxItem value="Banana" data-testid="item-Banana">
        Banana
      </ComboboxItem>
      <ComboboxItem value="Carrot" data-testid="item-Carrot">
        Carrot
      </ComboboxItem>
    </ComboboxGroup>
  );
}

function ComboboxWithItems(props: any) {
  return (
    <ComboboxRoot items={['Apple', 'Banana', 'Cherry']} {...props}>
      <ComboboxInput data-testid="input" />
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup data-testid="popup">
            <ComboboxList data-testid="list">{renderItems()}</ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </ComboboxRoot>
  );
}

function ComboboxWithGroup(props: any) {
  return (
    <ComboboxRoot
      items={[
        { value: 'Fruits', items: ['Apple', 'Banana'] },
        { value: 'Vegetables', items: ['Carrot'] },
      ]}
      {...props}
    >
      <ComboboxInput data-testid="input" />
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup data-testid="popup">
            <ComboboxList data-testid="list">{renderGroups()}</ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </ComboboxRoot>
  );
}

function MultipleCombobox(props: any) {
  return (
    <ComboboxRoot multiple items={['Apple', 'Banana', 'Cherry']} {...props}>
      <ComboboxChips data-testid="chips">
        <ComboboxChip data-testid="chip-Apple">
          Apple
          <ComboboxChipRemove data-testid="chip-remove-Apple" />
        </ComboboxChip>
        <ComboboxChip data-testid="chip-Banana">
          Banana
          <ComboboxChipRemove data-testid="chip-remove-Banana" />
        </ComboboxChip>
        <ComboboxChip data-testid="chip-Cherry">
          Cherry
          <ComboboxChipRemove data-testid="chip-remove-Cherry" />
        </ComboboxChip>
      </ComboboxChips>
      <ComboboxInput data-testid="input" />
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup data-testid="popup">
            <ComboboxList data-testid="list">{renderItems()}</ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </ComboboxRoot>
  );
}

function ComboboxWithClear(props: any) {
  return (
    <ComboboxRoot {...props}>
      <ComboboxInput data-testid="input" />
      <ComboboxClear data-testid="clear" />
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup data-testid="popup">
            <ComboboxList data-testid="list">{renderItems()}</ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </ComboboxRoot>
  );
}

function ComboboxWithTrigger(props: any) {
  return (
    <ComboboxRoot {...props}>
      <ComboboxLabel data-testid="label">Fruit</ComboboxLabel>
      <ComboboxTrigger data-testid="trigger">
        <ComboboxValue data-testid="value" />
        <ComboboxIcon data-testid="icon" />
      </ComboboxTrigger>
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup data-testid="popup">
            <ComboboxList data-testid="list">{renderItems()}</ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </ComboboxRoot>
  );
}

function ComboboxWithArrowAndBackdrop(props: any) {
  return (
    <ComboboxRoot {...props}>
      <ComboboxInput data-testid="input" />
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup data-testid="popup">
            <ComboboxList data-testid="list">{renderItems()}</ComboboxList>
            <ComboboxArrow data-testid="arrow" />
            <ComboboxBackdrop data-testid="backdrop" />
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </ComboboxRoot>
  );
}

function ComboboxWithIndicator(props: any) {
  return (
    <ComboboxRoot items={['Apple', 'Banana', 'Cherry']} {...props}>
      <ComboboxInput data-testid="input" />
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup data-testid="popup">
            <ComboboxList data-testid="list">{renderItemsWithIndicator()}</ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </ComboboxRoot>
  );
}

function ComboboxWithGroupPattern(props: any) {
  return (
    <ComboboxRoot {...props}>
      <ComboboxInput data-testid="input" />
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup data-testid="popup">
            <ComboboxList data-testid="list">
              <ComboboxGroup>
                <ComboboxGroupLabel data-testid="group-label">Fruits</ComboboxGroupLabel>
                <ComboboxItem value="Apple" data-testid="item-Apple">
                  Apple
                </ComboboxItem>
              </ComboboxGroup>
            </ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </ComboboxRoot>
  );
}

describe('<Combobox.Root />', () => {
  it('renders the input and hidden input', async () => {
    await render(ComboboxWithItems, {});
    expect(queryInput()).not.toBeNull();
    expect(document.querySelector('input[aria-hidden]')).not.toBeNull();
  });

  it('opens the popup when clicking the input', async () => {
    await render(ComboboxWithItems, {});
    expect(queryPopup()).toBeNull();

    const input = queryInput()!;
    await act(async () => {
      fireEvent.mouseDown(input);
    });

    await waitFor(() => {
      expect(queryPopup()).not.toBeNull();
    });
    expect(queryList()).not.toBeNull();
  });

  it('closes the popup when pressing Escape', async () => {
    await render(ComboboxWithItems, {});
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
    });

    await waitFor(() => {
      expect(queryPopup()).not.toBeNull();
    });

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Escape' });
    });

    await waitFor(() => {
      expect(queryPopup()).toBeNull();
    });
  });

  it('filters items while typing', async () => {
    await render(ComboboxWithItems, {});
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
      fireEvent.input(input, { target: { value: 'Ap' }, inputType: 'insertText' });
    });

    await waitFor(() => {
      expect(queryList()?.textContent).toContain('Apple');
      expect(queryList()?.textContent).not.toContain('Banana');
      expect(queryList()?.textContent).not.toContain('Cherry');
    });
  });

  it('selects the highlighted item with Enter', async () => {
    const onValueChange = vi.fn();
    await render(ComboboxWithItems, { onValueChange });
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
    });
    await waitFor(() => {
      expect(queryList()).not.toBeNull();
    });

    // Auto-highlight the first item after typing.
    await act(async () => {
      fireEvent.input(input, { target: { value: 'B' }, inputType: 'insertText' });
    });
    await waitFor(() => {
      expect(queryList()?.textContent).toContain('Banana');
    });

    // Navigate to the filtered item, then confirm with Enter.
    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' });
    });
    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="item-Banana"]')?.getAttribute('data-highlighted'),
      ).not.toBeNull();
    });

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith('Banana', expect.anything());
    });
  });

  it('selects an item on click', async () => {
    const onValueChange = vi.fn();
    await render(ComboboxWithItems, { onValueChange });
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
    });
    await waitFor(() => {
      expect(queryList()).not.toBeNull();
    });

    const item = document.querySelector('[data-testid="item-Cherry"]')!;
    await act(async () => {
      fireEvent.pointerDown(item);
      fireEvent.mouseDown(item);
      fireEvent.click(item);
    });

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith('Cherry', expect.anything());
    });
  });

  it('does not open when disabled', async () => {
    await render(ComboboxWithItems, { disabled: true });
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
    });

    expect(queryPopup()).toBeNull();
  });

  it('supports groups and group labels', async () => {
    await render(ComboboxWithGroup, {});
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
    });

    await waitFor(() => {
      expect(queryList()).not.toBeNull();
      expect(document.querySelector('[data-testid="item-Apple"]')).not.toBeNull();
      expect(document.querySelector('[data-testid="item-Carrot"]')).not.toBeNull();
    });
  });

  it('renders a clear button when a value is selected and clears it', async () => {
    const onValueChange = vi.fn();
    await render(ComboboxWithClear, { defaultValue: 'Apple', onValueChange });

    await waitFor(() => {
      expect(document.querySelector('[data-testid="clear"]')).not.toBeNull();
    });

    const clear = document.querySelector('[data-testid="clear"]')!;
    await act(async () => {
      fireEvent.click(clear);
    });

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith(null, expect.anything());
    });
  });

  it('auto-highlights the first matching item after typing when autoHighlight is enabled', async () => {
    await render(ComboboxWithItems, { autoHighlight: true });
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
      fireEvent.input(input, { target: { value: 'Ch' }, inputType: 'insertText' });
    });

    await waitFor(() => {
      const item = document.querySelector('[data-testid="item-Cherry"]');
      expect(item).not.toBeNull();
      expect(item?.getAttribute('data-highlighted')).not.toBeNull();
    });
  });

  it('renders the trigger, icon, label and value', async () => {
    await render(ComboboxWithTrigger, { defaultValue: 'Apple' });

    expect(document.querySelector('[data-testid="trigger"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="trigger"]')?.textContent).toContain('Apple');
    expect(document.querySelector('[data-testid="icon"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="label"]')).not.toBeNull();
  });

  it('renders chips for multiple selection and removes them', async () => {
    const onValueChange = vi.fn();
    await render(MultipleCombobox, { defaultValue: ['Apple', 'Banana'], onValueChange });

    await waitFor(() => {
      expect(document.querySelector('[data-testid="chip-Apple"]')).not.toBeNull();
      expect(document.querySelector('[data-testid="chip-Banana"]')).not.toBeNull();
    });

    const remove = document.querySelector('[data-testid="chip-remove-Apple"]')!;
    await act(async () => {
      fireEvent.click(remove);
    });

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith(['Banana'], expect.anything());
    });
  });

  it('navigates with ArrowDown and highlights the next item', async () => {
    await render(ComboboxWithItems, {});
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
    });
    await waitFor(() => {
      expect(queryList()).not.toBeNull();
    });

    // First ArrowDown navigates from no selection to the first item; a second moves to the
    // next item. (Auto-highlight is intentionally not used: it would seed the navigation
    // index asynchronously, making the second press race the sync.)
    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
    });

    await waitFor(() => {
      const apple = document.querySelector('[data-testid="item-Apple"]');
      const banana = document.querySelector('[data-testid="item-Banana"]');
      // After ArrowDown from the first item, the second item becomes highlighted.
      expect(banana?.getAttribute('data-highlighted')).not.toBeNull();
      expect(apple?.getAttribute('data-highlighted')).toBeNull();
    });
  });

  it('renders arrow and backdrop when open', async () => {
    await render(ComboboxWithArrowAndBackdrop, {});
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
    });

    await waitFor(() => {
      expect(queryPopup()).not.toBeNull();
      expect(document.querySelector('[data-testid="arrow"]')).not.toBeNull();
      expect(document.querySelector('[data-testid="backdrop"]')).not.toBeNull();
    });
  });

  it('renders an item indicator for the selected item', async () => {
    await render(ComboboxWithIndicator, { defaultValue: 'Banana' });
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
    });

    await waitFor(() => {
      expect(document.querySelector('[data-testid="indicator-Banana"]')).not.toBeNull();
    });
  });

  it('groups items with labels when using the group pattern', async () => {
    await render(ComboboxWithGroupPattern, {});
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
    });

    await waitFor(() => {
      expect(queryList()).not.toBeNull();
      expect(document.querySelector('[data-testid="group-label"]')).not.toBeNull();
      expect(document.querySelector('[data-testid="item-Apple"]')).not.toBeNull();
    });
  });
});
