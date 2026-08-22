import { describe, expect, it } from 'vitest';
import { ComboboxBackdrop } from '@/combobox/backdrop/ComboboxBackdrop';
import { ComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import { createRenderer } from '../../../test/createRenderer';

const mockStore = {
  useState: (key: string) => {
    const values: Record<string, any> = {
      open: false,
      mounted: false,
      transitionStatus: undefined,
    };
    return { value: values[key] };
  },
  state: {} as any,
  set: () => {},
} as any;

describe('<Combobox.Backdrop />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return (
        <ComboboxRootContext.Provider value={mockStore}>
          <ComboboxBackdrop data-testid="backdrop" />
        </ComboboxRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const backdrop = result.getByTestId('backdrop');
    expect(backdrop).toBeInstanceOf(HTMLDivElement);
  });
});