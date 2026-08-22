import { describe, expect, it } from 'vitest';
import { ComboboxArrow } from '@/combobox/arrow/ComboboxArrow';
import { ComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import { ComboboxPositionerContext } from '@/combobox/positioner/ComboboxPositionerContext';
import { createRenderer } from '../../../test/createRenderer';

const mockStore = {
  useState: (key: string) => {
    const values: Record<string, any> = {
      open: false,
    };
    return { value: values[key] };
  },
  state: {} as any,
  set: () => {},
} as any;

const positionerContext = {
  arrowRef: { current: null },
  side: { value: 'bottom' as const },
  align: { value: 'center' as const },
  arrowUncentered: { value: false },
  arrowStyles: { value: {} },
};

describe('<Combobox.Arrow />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return (
        <ComboboxRootContext.Provider value={mockStore}>
          <ComboboxPositionerContext.Provider value={positionerContext}>
            <ComboboxArrow data-testid="arrow" />
          </ComboboxPositionerContext.Provider>
        </ComboboxRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const arrow = result.getByTestId('arrow');
    expect(arrow).toBeInstanceOf(HTMLDivElement);
  });

  it('has aria-hidden attribute', async () => {
    function Demo() {
      return (
        <ComboboxRootContext.Provider value={mockStore}>
          <ComboboxPositionerContext.Provider value={positionerContext}>
            <ComboboxArrow data-testid="arrow" />
          </ComboboxPositionerContext.Provider>
        </ComboboxRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const arrow = result.getByTestId('arrow');
    expect(arrow).toHaveAttribute('aria-hidden', 'true');
  });
});