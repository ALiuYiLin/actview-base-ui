import { describe, expect, it, vi } from 'vitest';
import { AccordionHeader } from '@/accordion/header/AccordionHeader';
import { AccordionItemContext } from '@/accordion/item/AccordionItemContext';
import { createRenderer } from '../../../test/createRenderer';

const testContext = {
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
  triggerId: undefined,
};

describe('<Accordion.Header />', () => {
  const { render } = createRenderer();

  it('renders a heading element (refInstanceof: HTMLHeadingElement)', async () => {
    function Demo() {
      return (
        <AccordionItemContext.Provider value={testContext}>
          <AccordionHeader data-testid="header" />
        </AccordionItemContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const header = result.getByTestId('header');
    expect(header).toBeInstanceOf(HTMLHeadingElement);
  });

  it('throws when rendered outside an Accordion.Item', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      function Demo() {
        return <AccordionHeader />;
      }

      await render(Demo, {});

      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: expect.stringContaining(
            'Base UI: AccordionItemContext is missing. Accordion parts must be placed within <Accordion.Item>.',
          ),
        }),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('renders children', async () => {
    function Demo() {
      return (
        <AccordionItemContext.Provider value={testContext}>
          <AccordionHeader>Header Content</AccordionHeader>
        </AccordionItemContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const header = result.getByText('Header Content');
    expect(header).not.toBe(null);
  });
});