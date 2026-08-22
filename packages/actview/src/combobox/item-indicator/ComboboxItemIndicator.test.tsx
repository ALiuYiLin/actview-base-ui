import { describe, expect, it } from 'vitest';
import { ComboboxItemIndicator } from '@/combobox/item-indicator/ComboboxItemIndicator';
import { ComboboxItemContext } from '@/combobox/item/ComboboxItemContext';
import { createRenderer } from '../../../test/createRenderer';

const itemContext = {
  selected: true,
  textRef: { current: null },
};

describe('<Combobox.ItemIndicator />', () => {
  const { render } = createRenderer();

  it('renders a span element', async () => {
    function Demo() {
      return (
        <ComboboxItemContext.Provider value={itemContext}>
          <ComboboxItemIndicator data-testid="indicator" />
        </ComboboxItemContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('indicator');
    expect(el).toBeInstanceOf(HTMLSpanElement);
  });

  it('has aria-hidden attribute', async () => {
    function Demo() {
      return (
        <ComboboxItemContext.Provider value={itemContext}>
          <ComboboxItemIndicator data-testid="indicator" />
        </ComboboxItemContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('indicator');
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not render when not selected and keepMounted is false', async () => {
    const unselectedContext = {
      selected: false,
      textRef: { current: null },
    };

    function Demo() {
      return (
        <ComboboxItemContext.Provider value={unselectedContext}>
          <ComboboxItemIndicator data-testid="indicator" />
        </ComboboxItemContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.container.querySelector('[data-testid="indicator"]');
    expect(el).toBe(null);
  });
});