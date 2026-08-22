import { describe, expect, it } from 'vitest';
import { ComboboxPortal } from '@/combobox/portal/ComboboxPortal';
import { ComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import { createRenderer } from '../../../test/createRenderer';

const mockStore = {
  useState: (key: string) => {
    const values: Record<string, any> = {
      mounted: true,
      forceMounted: false,
    };
    return { value: values[key] };
  },
  state: {},
  set: () => {},
} as any;

describe('<Combobox.Portal />', () => {
  const { render } = createRenderer();

  it('renders portal content', async () => {
    function Demo() {
      return (
        <ComboboxRootContext.Provider value={mockStore}>
          <ComboboxPortal>
            <span data-testid="portal-content">content</span>
          </ComboboxPortal>
        </ComboboxRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    // FloatingPortal renders content to the body by default
    const el = document.body.querySelector('[data-testid="portal-content"]');
    expect(el).not.toBe(null);
  });
});