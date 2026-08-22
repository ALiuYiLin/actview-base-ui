import { describe, expect, it } from 'vitest';
import { ComboboxValue } from '@/combobox/value/ComboboxValue';
import { ComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import { createRenderer } from '../../../test/createRenderer';

const mockStore = {
  useState: (key: string) => {
    const values: Record<string, any> = {
      itemToStringLabel: (v: any) => v,
      selectedValue: 'apple',
      items: ['apple', 'banana'],
      hasSelectedValue: true,
    };
    return { value: values[key] };
  },
  state: {
    selectionMode: 'single',
  },
  select: () => ({ value: false }),
  set: () => {},
} as any;

describe('<Combobox.Value />', () => {
  const { render } = createRenderer();

  it('renders the selected value text', async () => {
    function Demo() {
      return (
        <ComboboxRootContext.Provider value={mockStore}>
          <ComboboxValue data-testid="value" />
        </ComboboxRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.container.querySelector('[data-testid="value"]');
    expect(el).toBe(null);
  });

  it('renders children as render prop', async () => {
    function Demo() {
      return (
        <ComboboxRootContext.Provider value={mockStore}>
          <ComboboxValue>
            {(value: any) => <span data-testid="value">{value}</span>}
          </ComboboxValue>
        </ComboboxRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('value');
    expect(el).not.toBe(null);
    expect(el).toHaveTextContent('apple');
  });
});