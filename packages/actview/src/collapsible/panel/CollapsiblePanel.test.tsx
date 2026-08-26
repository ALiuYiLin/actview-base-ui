import { describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'actview';
import { Collapsible } from '@/collapsible';
import { createRenderer, describeConformance } from '#test-utils';
import { fireEvent, render, screen } from '#test-utils/rtl';

const PANEL_CONTENT = 'This is panel content';

describe('<Collapsible.Panel />', () => {
  const {render: renderCR} = createRenderer();

  describeConformance(<Collapsible.Panel />, () => ({
    // actview conformance 检查容器首元素（Collapsible.Root 的根 div）；
    // render-prop ref 传递是组件内部机制——跳过；
    // style 转发由 Panel 的 CSS 变量合并逻辑接管——跳过。
    refInstanceof: window.HTMLDivElement,
    skip: ['renderProp', 'propsSpread'],
    render: (node) =>
      renderCR(Collapsible.Root, {
        defaultOpen: true,
        children: node,
      }),
  }));

  it('warns when hiddenUntilFound overrides keepMounted={false}', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await render(
        <Collapsible.Root>
          <Collapsible.Panel hiddenUntilFound keepMounted={false}>
            {PANEL_CONTENT}
          </Collapsible.Panel>
        </Collapsible.Root>,
      );

      expect(warnSpy.mock.calls.some(([message]) => String(message).includes('keepMounted'))).toBe(
        true,
      );
      expect(screen.getByText(PANEL_CONTENT).getAttribute('hidden')).toBe('until-found');
    } finally {
      warnSpy.mockRestore();
    }
  });

  describe('prop: keepMounted', () => {
    it('does not unmount the panel when true', async () => {
      const open = ref(false);
      const App = defineComponent(function () {
        return () => (
          <Collapsible.Root open={open.value} onOpenChange={(v) => (open.value = v)}>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel keepMounted>{PANEL_CONTENT}</Collapsible.Panel>
          </Collapsible.Root>
        );
      });

      await render(<App />);

      const trigger = screen.getByRole('button');

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT)).not.toBe(null);
      expect(screen.queryByText(PANEL_CONTENT)).toHaveAttribute('data-closed');

      fireEvent.click(trigger);
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.queryByText(PANEL_CONTENT)).toHaveAttribute('data-open');

      fireEvent.click(trigger);
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT)).toHaveAttribute('data-closed');
    });
  });
});
