import { describe, expect, it } from 'vitest';
import { CollapsiblePanel } from '@/collapsible/panel/CollapsiblePanel';
import { CollapsibleRootContext } from '@/collapsible/root/CollapsibleRootContext';
import { createRenderer } from '../../../test/createRenderer';

const context = {
  defaultPanelId: 'panel-default',
  disabled: false,
  handleTrigger: () => {},
  mounted: true,
  open: true,
  panelId: 'panel-1',
  setMounted: () => {},
  setOpen: () => {},
  setPanelIdState: () => {},
  transitionStatus: undefined,
  onOpenChange: () => {},
  state: {
    open: true,
    disabled: false,
    transitionStatus: undefined,
  },
};

describe('<Collapsible.Panel />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return (
        <CollapsibleRootContext.Provider value={context}>
          <CollapsiblePanel data-testid="panel" />
        </CollapsibleRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const panel = result.getByTestId('panel');
    expect(panel).toBeInstanceOf(HTMLDivElement);
  });

  it('renders children', async () => {
    function Demo() {
      return (
        <CollapsibleRootContext.Provider value={context}>
          <CollapsiblePanel>Panel Content</CollapsiblePanel>
        </CollapsibleRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const panel = result.getByText('Panel Content');
    expect(panel).not.toBe(null);
  });
});