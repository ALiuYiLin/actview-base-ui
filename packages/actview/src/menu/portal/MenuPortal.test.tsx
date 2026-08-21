import { describe, expect, it } from 'vitest';
import { MenuPortal } from './MenuPortal';
import { MenuRootContext } from '../root/MenuRootContext';
import { createRenderer } from '../../../test/createRenderer';

const mockRootContext = {
  store: {
    useState: (key: string) => {
      const values: Record<string, any> = {
        mounted: true,
      };
      return { value: values[key] };
    },
    state: {},
  },
  parent: { type: 'menu' },
};

describe('<Menu.Portal />', () => {
  const { render } = createRenderer();

  it('renders portal content', async () => {
    function Demo() {
      return (
        <MenuRootContext.Provider value={mockRootContext as any}>
          <MenuPortal>
            <span data-testid="portal-content">content</span>
          </MenuPortal>
        </MenuRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    // FloatingPortal renders content to the body by default
    const el = document.body.querySelector('[data-testid="portal-content"]');
    expect(el).not.toBe(null);
  });
});