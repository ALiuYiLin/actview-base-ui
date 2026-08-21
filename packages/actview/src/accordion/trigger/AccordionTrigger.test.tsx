import { describe, expect, it } from 'vitest';
import { AccordionTrigger } from './AccordionTrigger';
import { AccordionItemContext } from '../item/AccordionItemContext';
import { CollapsibleRootContext } from '../../collapsible/root/CollapsibleRootContext';
import { createRenderer } from '../../../test/createRenderer';

const collapsibleContext = {
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

const itemContext = {
  defaultTriggerId: undefined,
  open: false,
  state: {
    hidden: true,
    index: 0,
    disabled: false,
    open: false,
    dirty: false,
    filled: false,
    focused: false,
    touched: false,
    valid: null,
  },
  setTriggerId: () => {},
  triggerId: undefined,
};

describe('<Accordion.Trigger />', () => {
  const { render } = createRenderer();

  it('renders a button element (refInstanceof: HTMLButtonElement)', async () => {
    function Demo() {
      return (
        <CollapsibleRootContext.Provider value={collapsibleContext}>
          <AccordionItemContext.Provider value={itemContext}>
            <AccordionTrigger data-testid="trigger" />
          </AccordionItemContext.Provider>
        </CollapsibleRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const trigger = result.getByTestId('trigger');
    expect(trigger).toBeInstanceOf(HTMLButtonElement);
  });

  it('renders children', async () => {
    function Demo() {
      return (
        <CollapsibleRootContext.Provider value={collapsibleContext}>
          <AccordionItemContext.Provider value={itemContext}>
            <AccordionTrigger>Trigger Text</AccordionTrigger>
          </AccordionItemContext.Provider>
        </CollapsibleRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const trigger = result.getByText('Trigger Text');
    expect(trigger).not.toBe(null);
  });

  it('has aria-expanded attribute reflecting open state', async () => {
    const openContext = {
      ...collapsibleContext,
      open: true,
      state: { ...collapsibleContext.state, open: true },
    };

    function Demo() {
      return (
        <CollapsibleRootContext.Provider value={openContext}>
          <AccordionItemContext.Provider value={itemContext}>
            <AccordionTrigger data-testid="trigger" />
          </AccordionItemContext.Provider>
        </CollapsibleRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const trigger = result.getByTestId('trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('has aria-expanded false when closed', async () => {
    function Demo() {
      return (
        <CollapsibleRootContext.Provider value={collapsibleContext}>
          <AccordionItemContext.Provider value={itemContext}>
            <AccordionTrigger data-testid="trigger" />
          </AccordionItemContext.Provider>
        </CollapsibleRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const trigger = result.getByTestId('trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});