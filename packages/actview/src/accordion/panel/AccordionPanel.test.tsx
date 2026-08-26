import { describe, expect, it, vi } from 'vitest';
import { Accordion } from '@/accordion';
import { createRenderer, describeConformance } from '#test-utils';
import { render, screen } from '#test-utils/rtl';

const PANEL_CONTENT = 'This is panel content';

describe('<Accordion.Panel />', () => {
  const {render: renderCR} = createRenderer();

  describeConformance(<Accordion.Panel keepMounted />, () => ({
    // actview conformance 检查容器首元素（Accordion.Root 的根 div）；
    // render-prop ref 传递是组件内部机制——跳过。
    refInstanceof: window.HTMLDivElement,
    skip: ['renderProp'],
    render: (node) =>
      renderCR(Accordion.Root, {
        children: <Accordion.Item>{node}</Accordion.Item>,
      }),
  }));

  it('warns when a panel enables hiddenUntilFound and disables keepMounted', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await render(
        <Accordion.Root>
          <Accordion.Item>
            <Accordion.Panel hiddenUntilFound keepMounted={false}>
              {PANEL_CONTENT}
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion.Root>,
      );

      expect(warnSpy.mock.calls.some(([message]) => String(message).includes('keepMounted'))).toBe(
        true,
      );
      expect(screen.getByText(PANEL_CONTENT).getAttribute('hidden')).toBe('until-found');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('passes root keepMounted to closed panels', async () => {
    await render(
      <Accordion.Root keepMounted>
        <Accordion.Item value={0}>
          <Accordion.Header>
            <Accordion.Trigger>Trigger</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>{PANEL_CONTENT}</Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>,
    );

    expect(screen.getByText(PANEL_CONTENT)).toHaveAttribute('hidden');
  });
});
