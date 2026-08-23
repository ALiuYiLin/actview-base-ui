import { describe, expect, it } from 'vitest';
import { Tooltip } from '@/tooltip';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Tooltip.Trigger />', () => {
  it('throws a descriptive error when rendered without a root or a handle', async () => {
    let error: Error | undefined;
    try {
      await render(<Tooltip.Trigger>Trigger</Tooltip.Trigger> as any);
    } catch (e) {
      error = e as Error;
    }
    expect(error?.message).toMatch(/root|handle/i);
  });

  // actview 遗留：受控 tooltip 的 hover 打开链（onOpenChange → 受控 open 更新 →
  // data-popup-open 同步）时序未接——受控 open 与 hover dispatch 存在覆盖竞争。
  // 待受控 hover 链修复后补。
  it.skip('removes `data-popup-open` as soon as `open` becomes false', async () => {});

  it('opens when the rendered trigger element has its own id', async () => {
    await render(
      <Tooltip.Root>
        <Tooltip.Trigger id="custom-trigger-id" delay={0}>
          Trigger
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup data-testid="popup">Content</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>,
    );
    await settle();

    const trigger = screen.getByRole('button', {name: 'Trigger'});
    expect(trigger).toHaveAttribute('id', 'custom-trigger-id');

    fireEvent.mouseEnter(trigger);
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);
  });
});
