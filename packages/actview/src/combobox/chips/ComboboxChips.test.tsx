import { describe, expect, it } from 'vitest';
import { ComboboxChips } from './ComboboxChips';
import { ComboboxRootContext } from '../root/ComboboxRootContext';
import { createRenderer } from '../../../test/createRenderer';

const mockStore = {
  useState: (key: string) => {
    const values: Record<string, any> = {
      open: false,
      hasSelectionChips: true,
    };
    return { value: values[key] };
  },
  state: {
    chipsContainerRef: { current: null },
    disabled: false,
    readOnly: false,
  },
  set: () => {},
} as any;

describe('<Combobox.Chips />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return (
        <ComboboxRootContext.Provider value={mockStore}>
          <ComboboxChips data-testid="chips" />
        </ComboboxRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('chips');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('renders children', async () => {
    function Demo() {
      return (
        <ComboboxRootContext.Provider value={mockStore}>
          <ComboboxChips data-testid="chips">
            <span data-testid="child">child</span>
          </ComboboxChips>
        </ComboboxRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const child = result.getByTestId('child');
    expect(child).not.toBe(null);
  });
});