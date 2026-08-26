import { describe, expect, it } from 'vitest';
import { Popover } from '@/popover';
import { createRenderer } from '#test-utils';
import { fireEvent, screen } from '#test-utils/rtl';

// actview 无 PopoverXxxDataAttributes 枚举——直接断言 data-* 字符串（对齐
// React 版 enumSync 的 DOM 断言部分；positioner 不产生 data-open 等属性）。
describe('Popover enum sync', () => {
  const { render } = createRenderer();

  async function renderPopover() {
    return render(Popover.Root, {
      children: (
        <>
          <Popover.Trigger>Toggle</Popover.Trigger>
          <Popover.Backdrop data-testid="backdrop" />
          <Popover.Portal keepMounted>
            <Popover.Positioner data-testid="positioner">
              <Popover.Popup data-testid="popup">
                <Popover.Arrow data-testid="arrow" />
                <Popover.Viewport data-testid="viewport">Content</Popover.Viewport>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </>
      ),
    });
  }

  it('names the open/closed attributes on every part', async () => {
    await renderPopover();

    expect(screen.getByTestId('popup')).toHaveAttribute('data-closed');
    expect(screen.getByTestId('backdrop')).toHaveAttribute('data-closed');

    fireEvent.click(screen.getByRole('button', {name: 'Toggle'}));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByTestId('popup')).toHaveAttribute('data-open');
    expect(screen.getByTestId('backdrop')).toHaveAttribute('data-open');
    expect(screen.getByTestId('arrow')).toHaveAttribute('data-open');
  });

  it('names the trigger attributes', async () => {
    await renderPopover();

    const trigger = screen.getByRole('button', {name: 'Toggle'});
    fireEvent.click(trigger);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(trigger).toHaveAttribute('data-popup-open');
    expect(trigger).toHaveAttribute('data-pressed');
  });
});
