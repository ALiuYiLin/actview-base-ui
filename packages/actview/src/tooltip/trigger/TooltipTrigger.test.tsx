import { describe, expect, it } from 'vitest';
import { defineComponent, ref } from 'actview';
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

  // 受控 open + preventUnmountOnClose：mouseLeave 关闭后 popup DOM 保留
  // （keepMounted 语义），但 trigger 的 data-popup-open 需随 open 移除。
  it('removes `data-popup-open` as soon as `open` becomes false', async () => {
    const openRef = ref(false);

    const TooltipWithPreventedUnmount = defineComponent(function Test() {
      return () => (
        <Tooltip.Root
          open={openRef.value}
          onOpenChange={(nextOpen: boolean, eventDetails: any) => {
            if (!nextOpen) {
              eventDetails.preventUnmountOnClose();
            }
            openRef.value = nextOpen;
          }}
        >
          <Tooltip.Trigger data-testid="trigger" delay={0} closeDelay={0}>
            Trigger
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner>
              <Tooltip.Popup>Content</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      );
    });

    await render(<TooltipWithPreventedUnmount />);
    await settle();

    const trigger = screen.getByTestId('trigger');

    fireEvent.mouseEnter(trigger);
    fireEvent.mouseMove(trigger);
    await settle();
    await settle();

    expect(trigger).toHaveAttribute('data-popup-open');
    expect(screen.getByText('Content')).not.toBe(null);

    fireEvent.mouseLeave(trigger);
    await settle();
    await settle();

    expect(trigger).not.toHaveAttribute('data-popup-open');
    expect(screen.getByText('Content')).not.toBe(null);
  });

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
