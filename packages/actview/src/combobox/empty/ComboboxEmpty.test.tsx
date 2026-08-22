import { describe, expect, it } from 'vitest';
import { ComboboxEmpty } from '@/combobox/empty/ComboboxEmpty';
import { ComboboxRootContext, ComboboxDerivedItemsContext } from '@/combobox/root/ComboboxRootContext';
import { createRenderer } from '../../../test/createRenderer';

const mockStore = {
  useState: () => ({ value: false }),
  state: {
    emptyRef: { current: null },
  },
  set: () => {},
} as any;

const derivedItemsContext = {
  query: '',
  hasItems: false,
  filteredItems: [],
  flatFilteredValues: [],
};

describe('<Combobox.Empty />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return (
        <ComboboxRootContext.Provider value={mockStore}>
          <ComboboxDerivedItemsContext.Provider value={derivedItemsContext}>
            <ComboboxEmpty data-testid="empty" />
          </ComboboxDerivedItemsContext.Provider>
        </ComboboxRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('empty');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('has role status and aria-live polite', async () => {
    function Demo() {
      return (
        <ComboboxRootContext.Provider value={mockStore}>
          <ComboboxDerivedItemsContext.Provider value={derivedItemsContext}>
            <ComboboxEmpty data-testid="empty" />
          </ComboboxDerivedItemsContext.Provider>
        </ComboboxRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('empty');
    expect(el).toHaveAttribute('role', 'status');
    expect(el).toHaveAttribute('aria-live', 'polite');
    expect(el).toHaveAttribute('aria-atomic', 'true');
  });

  it('renders children when filtered items are empty', async () => {
    function Demo() {
      return (
        <ComboboxRootContext.Provider value={mockStore}>
          <ComboboxDerivedItemsContext.Provider value={derivedItemsContext}>
            <ComboboxEmpty data-testid="empty">No results</ComboboxEmpty>
          </ComboboxDerivedItemsContext.Provider>
        </ComboboxRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('empty');
    expect(el).toHaveTextContent('No results');
  });
});