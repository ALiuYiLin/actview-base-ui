import { expect } from 'vitest';
import { computed, defineComponent } from 'actview';
import { Accordion } from '@/accordion';
import { screen } from '#test-utils/rtl';
import { describeConformance, createRenderer } from '#test-utils';
import { CollapsibleRootContext } from '@/collapsible/root/CollapsibleRootContext';
import { AccordionItemContext } from '@/accordion/item/AccordionItemContext';

// Trigger 需要两个 context——conformance 直接注入 mock context，
// 让 Trigger 成为渲染根（包 Root/Item 会使根变成 Root 的 div）
function createMockContexts() {
  return {
    collapsible: {
      defaultPanelId: 'mock-panel-id',
      disabled: false,
      handleTrigger: () => {},
      mounted: computed(() => false),
      open: computed(() => false),
      panelId: computed(() => 'mock-panel-id'),
      setMounted: () => {},
      setOpen: () => {},
      setPanelIdState: () => {},
      transitionStatus: computed(() => undefined),
      onOpenChange: () => {},
      state: computed(() => ({open: false, disabled: false, transitionStatus: undefined})),
    },
    item: {
      defaultTriggerId: undefined,
      open: computed(() => false),
      state: computed(() => ({
        value: [] as any[],
        disabled: false,
        orientation: 'vertical' as const,
        hidden: true,
        index: 0,
        open: false,
      })),
      setTriggerId: () => {},
      triggerId: computed(() => undefined),
    },
  };
}

describe('<Accordion.Trigger />', () => {
  const { render } = createRenderer();

  describeConformance(<Accordion.Trigger />, () => ({
    refInstanceof: window.HTMLButtonElement,
    render: (node) => {
      const Wrapper = defineComponent(function (props: {node: any}) {
        const ctx = createMockContexts();
        return () => (
          <CollapsibleRootContext.Provider value={ctx.collapsible as any}>
            <AccordionItemContext.Provider value={ctx.item as any}>
              {props.node}
            </AccordionItemContext.Provider>
          </CollapsibleRootContext.Provider>
        );
      });
      return render(Wrapper, {node});
    },
  }));

  it('keeps a non-native trigger tabbable', async () => {
    const Test = defineComponent(function () {
      return () => (
        <Accordion.Root>
          <Accordion.Item>
            <Accordion.Header>
              <Accordion.Trigger nativeButton={false} render={<span />}>
                Trigger
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel>Panel</Accordion.Panel>
          </Accordion.Item>
        </Accordion.Root>
      );
    });

    await render(Test);

    const trigger = screen.getByRole('button', {name: 'Trigger'});
    expect(trigger).toHaveAttribute('tabindex', '0');
  });
});
