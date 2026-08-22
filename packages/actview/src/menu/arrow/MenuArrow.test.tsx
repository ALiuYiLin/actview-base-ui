import { describe, expect, it } from 'vitest';
import { MenuArrow } from '@/menu/arrow/MenuArrow';
import { MenuRootContext } from '@/menu/root/MenuRootContext';
import { MenuPositionerContext } from '@/menu/positioner/MenuPositionerContext';
import { createRenderer } from '../../../test/createRenderer';

const mockRootContext = {
  store: {
    useState: (key: string) => {
      const values: Record<string, any> = {
        open: true,
      };
      return { value: values[key] };
    },
    state: {},
  },
  parent: { type: 'menu' },
};

const mockPositionerContext = {
  side: { value: 'bottom' as const },
  align: { value: 'center' as const },
  arrowUncentered: { value: false },
  arrowStyles: { value: {} },
  arrowRef: { current: null },
  context: { nodeId: 'test' },
};

describe('<Menu.Arrow />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return (
        <MenuRootContext.Provider value={mockRootContext as any}>
          <MenuPositionerContext.Provider value={mockPositionerContext as any}>
            <MenuArrow data-testid="arrow" />
          </MenuPositionerContext.Provider>
        </MenuRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('arrow');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('has aria-hidden attribute', async () => {
    function Demo() {
      return (
        <MenuRootContext.Provider value={mockRootContext as any}>
          <MenuPositionerContext.Provider value={mockPositionerContext as any}>
            <MenuArrow data-testid="arrow" />
          </MenuPositionerContext.Provider>
        </MenuRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('arrow');
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });
});