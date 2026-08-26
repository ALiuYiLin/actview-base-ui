import { describe, expect, it } from 'vitest';
import { Tooltip } from '@/tooltip';
import { createRenderer } from '#test-utils';
import { fireEvent, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

// actview Provider 为简化版：提供 TooltipProviderContext（delay 值），
// FloatingDelayGroup 未迁移——测试覆盖 Provider 渲染与 delay=0 的即时打开。
describe('<Tooltip.Provider />', () => {
  const { render } = createRenderer();

  it('renders its children', async () => {
    await render(
      Tooltip.Provider, {
        children: (
          <Tooltip.Root>
            <Tooltip.Trigger>Trigger</Tooltip.Trigger>
          </Tooltip.Root>
        ),
      },
    );

    expect(screen.getByRole('button', {name: 'Trigger'})).not.toBe(null);
  });

  it('shows the tooltip on hover with delay=0', async () => {
    await render(
      Tooltip.Provider, {
        delay: 0,
        children: (
          <Tooltip.Root>
            <Tooltip.Trigger delay={0}>Trigger</Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner>
                <Tooltip.Popup>Content</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        ),
      },
    );
    await settle();

    const trigger = screen.getByRole('button', {name: 'Trigger'});
    fireEvent.mouseEnter(trigger);
    await settle();
    await settle();

    expect(screen.getByText('Content')).not.toBe(null);
  });
});
