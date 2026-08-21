import { describe, expect, it } from 'vitest';
import { CollapsibleTrigger } from './CollapsibleTrigger';
import { CollapsibleRootContext } from '../root/CollapsibleRootContext';
import { createRenderer } from '../../../test/createRenderer';

const context = {
  defaultPanelId: undefined,
  disabled: false,
  handleTrigger: () => {},
  mounted: false,
  open: false,
  panelId: 'panel-1',
  setMounted: () => {},
  setOpen: () => {},
  setPanelIdState: () => {},
  transitionStatus: undefined,
  onOpenChange: () => {},
  state: {
    open: false,
    disabled: false,
    transitionStatus: undefined,
  },
};

describe('<Collapsible.Trigger />', () => {
  const { render } = createRenderer();

  it('renders a button element', async () => {
    function Demo() {
      return (
        <CollapsibleRootContext.Provider value={context}>
          <CollapsibleTrigger data-testid="trigger" />
        </CollapsibleRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const trigger = result.getByTestId('trigger');
    expect(trigger).toBeInstanceOf(HTMLButtonElement);
  });

  it('has aria-expanded attribute', async () => {
    function Demo() {
      return (
        <CollapsibleRootContext.Provider value={context}>
          <CollapsibleTrigger data-testid="trigger" />
        </CollapsibleRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const trigger = result.getByTestId('trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});