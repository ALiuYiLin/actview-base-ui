import { describe, expect, it, vi, beforeAll, afterEach } from 'vitest';
import { AutocompleteRoot } from '@/autocomplete/root/AutocompleteRoot';
import { AutocompleteTrigger } from '@/autocomplete/trigger/AutocompleteTrigger';
import { AutocompleteValue } from '@/autocomplete/value/AutocompleteValue';
import { AutocompleteItem } from '@/autocomplete/item/AutocompleteItem';
import { ComboboxInput } from '@/combobox/input/ComboboxInput';
import { ComboboxPortal } from '@/combobox/portal/ComboboxPortal';
import { ComboboxPositioner } from '@/combobox/positioner/ComboboxPositioner';
import { ComboboxPopup } from '@/combobox/popup/ComboboxPopup';
import { ComboboxList } from '@/combobox/list/ComboboxList';
import { createRenderer } from '../../test/createRenderer';

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

function queryByTestId(id: string): HTMLElement | null {
  return document.querySelector(`[data-testid="${id}"]`);
}

/**
 * The actview JSX type layer intersects component props with `HTMLAttributes`, whose
 * `children` excludes functions, so a function child can't be passed inline. Routing it
 * through an `any`-typed helper keeps the runtime render-prop supported (see QA note on
 * `LibraryManagedAttributes = P & HTMLAttributes`).
 */
function renderItems(): any {
  return (item: string) => (
    <AutocompleteItem key={item} value={item} data-testid={`item-${item}`}>
      {item}
    </AutocompleteItem>
  );
}

function AutocompleteWithItems(props: any) {
  return (
    <AutocompleteRoot items={['Apple', 'Banana', 'Cherry']} {...props}>
      <ComboboxInput data-testid="input" />
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup data-testid="popup">
            <ComboboxList data-testid="list">{renderItems()}</ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </AutocompleteRoot>
  );
}

function AutocompleteWithTrigger(props: any) {
  return (
    <AutocompleteRoot items={['Apple', 'Banana', 'Cherry']} {...props}>
      <AutocompleteTrigger data-testid="trigger">
        <AutocompleteValue data-testid="value" />
      </AutocompleteTrigger>
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup data-testid="popup">
            <ComboboxList data-testid="list">{renderItems()}</ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </AutocompleteRoot>
  );
}

function AutocompleteWithPopupInput(props: any) {
  return (
    <AutocompleteRoot items={['Apple', 'Banana', 'Cherry']} {...props}>
      <AutocompleteTrigger data-testid="trigger">
        <AutocompleteValue>
          {(val: string) => <span data-testid="value">{val}</span>}
        </AutocompleteValue>
      </AutocompleteTrigger>
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup data-testid="popup">
            <ComboboxInput data-testid="input" />
            <ComboboxList data-testid="list">{renderItems()}</ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </AutocompleteRoot>
  );
}

describe('<Autocomplete.Root />', () => {
  it('renders the input and hidden input', async () => {
    await render(AutocompleteWithItems, {});
    expect(queryInput()).not.toBeNull();
    expect(document.querySelector('input[aria-hidden]')).not.toBeNull();
  });

  it('does not open on input click by default, but opens when typing', async () => {
    await render(AutocompleteWithItems, {});
    expect(queryPopup()).toBeNull();

    const input = queryInput()!;
    await act(async () => {
      fireEvent.mouseDown(input);
    });
    // `openOnInputClick` defaults to `false` for Autocomplete.
    expect(queryPopup()).toBeNull();

    await act(async () => {
      fireEvent.input(input, { target: { value: 'Ap' }, inputType: 'insertText' });
    });

    await waitFor(() => {
      expect(queryPopup()).not.toBeNull();
    });
    expect(queryList()).not.toBeNull();
  });

  it('filters items while typing', async () => {
    await render(AutocompleteWithItems, {});
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

  it('closes the popup when pressing Escape', async () => {
    await render(AutocompleteWithItems, {});
    const input = queryInput()!;

    await act(async () => {
      fireEvent.input(input, { target: { value: 'Ap' }, inputType: 'insertText' });
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

  it('highlights the first matching item with autoHighlight', async () => {
    await render(AutocompleteWithItems, { autoHighlight: true });
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
      fireEvent.input(input, { target: { value: 'Ap' }, inputType: 'insertText' });
    });

    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="item-Apple"]')?.getAttribute('data-highlighted'),
      ).not.toBeNull();
    });
    expect(input.getAttribute('aria-activedescendant')).toBe(
      document.querySelector('[data-testid="item-Apple"]')?.id,
    );
  });

  it('selects the highlighted item with Enter and fills the input', async () => {
    const onValueChange = vi.fn();
    await render(AutocompleteWithItems, { onValueChange });
    const input = queryInput()!;

    await act(async () => {
      fireEvent.input(input, { target: { value: 'B' }, inputType: 'insertText' });
    });
    await waitFor(() => {
      expect(queryList()).not.toBeNull();
      expect(queryList()?.textContent).toContain('Banana');
    });

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
      expect(input.value).toBe('Banana');
    });
  });

  it('mode="both": inline overlay changes the input value on navigation', async () => {
    await render(AutocompleteWithItems, { mode: 'both' });
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
      fireEvent.input(input, { target: { value: 'Ap' }, inputType: 'insertText' });
    });
    await waitFor(() => {
      expect(queryList()?.textContent).toContain('Apple');
    });

    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' });
    });
    await waitFor(() => {
      expect(input.value).toBe('Apple');
    });
  });

  it('mode="none": static items without inline overlay', async () => {
    await render(AutocompleteWithItems, { mode: 'none' });
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
      fireEvent.input(input, { target: { value: 'x' }, inputType: 'insertText' });
    });
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid^="item-"]')).toHaveLength(3);
    });

    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' });
    });
    expect(input.value).toBe('x');
    expect(document.querySelectorAll('[data-testid^="item-"]')).toHaveLength(3);
  });

  it('controlled value updates the input', async () => {
    const result = await render(AutocompleteWithItems, { value: 'Ap' });
    const input = queryInput()!;
    expect(input.value).toBe('Ap');

    await result.setProps({ value: 'Apple' });
    await waitFor(() => {
      expect(input.value).toBe('Apple');
    });
  });

  it('calls onValueChange while typing', async () => {
    const onValueChange = vi.fn();
    await render(AutocompleteWithItems, { onValueChange });
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
      fireEvent.input(input, { target: { value: 'Ap' }, inputType: 'insertText' });
    });

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalled();
    });
    expect(onValueChange.mock.lastCall?.[0]).toBe('Ap');
  });

  it('calls onItemHighlighted with reason "none" on auto-highlight', async () => {
    const onItemHighlighted = vi.fn();
    await render(AutocompleteWithItems, { autoHighlight: true, onItemHighlighted });
    const input = queryInput()!;

    await act(async () => {
      fireEvent.mouseDown(input);
      fireEvent.input(input, { target: { value: 'Ap' }, inputType: 'insertText' });
    });

    await waitFor(() => {
      expect(onItemHighlighted).toHaveBeenCalled();
    });
    const [value, eventDetails] = onItemHighlighted.mock.lastCall ?? [];
    expect(value).toBe('Apple');
    expect(eventDetails.reason).toBe('none');
  });

  it('opens the popup from the trigger', async () => {
    await render(AutocompleteWithTrigger, {});
    expect(queryPopup()).toBeNull();

    const trigger = queryByTestId('trigger')!;
    await act(async () => {
      fireEvent.mouseDown(trigger);
    });

    await waitFor(() => {
      expect(queryPopup()).not.toBeNull();
    });
  });

  it('AutocompleteValue reflects the input value', async () => {
    await render(AutocompleteWithPopupInput, {});
    const trigger = queryByTestId('trigger')!;

    await act(async () => {
      fireEvent.mouseDown(trigger);
    });
    await waitFor(() => {
      expect(queryInput()).not.toBeNull();
    });

    const input = queryInput()!;
    await act(async () => {
      fireEvent.input(input, { target: { value: 'Ap' }, inputType: 'insertText' });
    });

    await waitFor(() => {
      expect(queryByTestId('value')?.textContent).toContain('Ap');
    });
  });
});
