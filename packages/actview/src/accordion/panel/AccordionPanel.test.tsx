import { describe, expect, it } from 'vitest';
import { AccordionPanel } from '@/accordion/panel/AccordionPanel';
import { AccordionItemContext } from '@/accordion/item/AccordionItemContext';
import { CollapsibleRootContext } from '@/collapsible/root/CollapsibleRootContext';
import { AccordionRootContext } from '@/accordion/root/AccordionRootContext';
import { createRenderer } from '#/test/createRenderer';

const rootContext = {
  value: [],
  handleValueChange: () => {},
  state: {
    disabled: false,
    dirty: false,
    filled: false,
    focused: false,
    touched: false,
    valid: null,
  },
  disabled: false,
};

const collapsibleContext = {
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

const itemContext = {
  defaultTriggerId: undefined,
  open: true,
  state: {
    hidden: false,
    index: 0,
    disabled: false,
    open: true,
    dirty: false,
    filled: false,
    focused: false,
    touched: false,
    valid: null,
  },
  setTriggerId: () => {},
  triggerId: 'trigger-1',
};

describe('<Accordion.Panel />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return (
        <AccordionRootContext.Provider value={rootContext}>
          <CollapsibleRootContext.Provider value={collapsibleContext}>
            <AccordionItemContext.Provider value={itemContext}>
              <AccordionPanel data-testid="panel" />
            </AccordionItemContext.Provider>
          </CollapsibleRootContext.Provider>
        </AccordionRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const panel = result.getByTestId('panel');
    expect(panel).toBeInstanceOf(HTMLDivElement);
  });

  it('renders children', async () => {
    function Demo() {
      return (
        <AccordionRootContext.Provider value={rootContext}>
          <CollapsibleRootContext.Provider value={collapsibleContext}>
            <AccordionItemContext.Provider value={itemContext}>
              <AccordionPanel>Panel Content</AccordionPanel>
            </AccordionItemContext.Provider>
          </CollapsibleRootContext.Provider>
        </AccordionRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const panel = result.getByText('Panel Content');
    expect(panel).not.toBe(null);
  });

  it('has role region', async () => {
    function Demo() {
      return (
        <AccordionRootContext.Provider value={rootContext}>
          <CollapsibleRootContext.Provider value={collapsibleContext}>
            <AccordionItemContext.Provider value={itemContext}>
              <AccordionPanel data-testid="panel" />
            </AccordionItemContext.Provider>
          </CollapsibleRootContext.Provider>
        </AccordionRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const panel = result.getByTestId('panel');
    expect(panel).toHaveAttribute('role', 'region');
  });
});