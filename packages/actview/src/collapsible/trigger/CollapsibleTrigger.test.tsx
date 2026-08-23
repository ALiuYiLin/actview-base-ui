import { expect, vi } from 'vitest';
import { computed, defineComponent } from '@actview/core';
import { Collapsible } from '@/collapsible';
import { createRenderer, describeConformance } from '#test-utils';
import { screen } from '#test-utils/rtl';
import { CollapsibleRootContext } from '../root/CollapsibleRootContext';

// Trigger 必须位于 Root context 内——conformance 直接注入 mock context，
// 让 Trigger 成为渲染根（包 Root 会使根变成 Root 的 div）
function createMockRootContext() {
  return {
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
  };
}

describe('<Collapsible.Trigger />', () => {
  const { render } = createRenderer();

  it('throws when rendered outside a Collapsible.Root', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(render(Collapsible.Trigger)).rejects.toThrow(
        'Base UI: CollapsibleRootContext is missing. Collapsible parts must be placed within <Collapsible.Root>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  describeConformance(<Collapsible.Trigger />, () => ({
    refInstanceof: window.HTMLButtonElement,
    render: (node) => {
      const Wrapper = defineComponent(function () {
        const ctx = createMockRootContext();
        return () => (
          <CollapsibleRootContext.Provider value={ctx as any}>{node}</CollapsibleRootContext.Provider>
        );
      });
      return render(Wrapper);
    },
  }));

  it('forwards the id prop', async () => {
    const Test = defineComponent(function () {
      return () => (
        <Collapsible.Root>
          <Collapsible.Trigger id="custom-trigger-id">Trigger</Collapsible.Trigger>
        </Collapsible.Root>
      );
    });

    await render(Test);

    expect(screen.getByRole('button', {name: 'Trigger'})).toHaveAttribute(
      'id',
      'custom-trigger-id',
    );
  });
});
