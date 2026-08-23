import { describe, expect, it } from 'vitest';
import { Popover } from '@/popover';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function TestPopover(props: any = {}) {
  const {triggerProps = {}, popupProps = {}, rootProps = {}} = props;
  return (
    <Popover.Root {...rootProps}>
      <Popover.Trigger {...triggerProps} />
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Popup {...popupProps} />
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

describe('<Popover.Trigger />', () => {
  it('throws a descriptive error when rendered without a root or a handle', async () => {
    let error: Error | undefined;
    try {
      await render(<Popover.Trigger /> as any);
    } catch (e) {
      error = e as Error;
    }
    expect(error?.message).toMatch(/root|handle/i);
  });

  describe('prop: disabled', () => {
    it('disables the popover', async () => {
      await render(<TestPopover triggerProps={{disabled: true}} />);
      await settle();

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('disabled');
      expect(trigger).toHaveAttribute('data-disabled');

      fireEvent.click(trigger);
      await settle();
      await settle();
      expect(screen.queryByRole('dialog')).toBe(null);
    });

    it('custom element', async () => {
      await render(
        <TestPopover triggerProps={{disabled: true, nativeButton: false, render: <span />}} />,
      );
      await settle();

      const trigger = screen.getByRole('button');
      expect(trigger).not.toHaveAttribute('disabled');
      expect(trigger).toHaveAttribute('data-disabled');
      expect(trigger).toHaveAttribute('aria-disabled', 'true');

      fireEvent.click(trigger);
      await settle();
      await settle();
      expect(screen.queryByRole('dialog')).toBe(null);
    });
  });

  describe('style hooks', () => {
    it('should have the data-popup-open and data-pressed attributes when open by clicking', async () => {
      await render(<TestPopover />);
      await settle();

      const trigger = screen.getByRole('button');

      fireEvent.click(trigger);
      await settle();
      await settle();

      expect(trigger).toHaveAttribute('data-popup-open');
      expect(trigger).toHaveAttribute('data-pressed');
    });

    it('should have the data-popup-open but not the data-pressed attribute when open by hover', async () => {
      await render(<TestPopover triggerProps={{openOnHover: true, delay: 0}} />);
      await settle();

      const trigger = screen.getByRole('button');

      fireEvent.mouseEnter(trigger);
      await settle();
      await settle();

      expect(trigger).toHaveAttribute('data-popup-open');
      expect(trigger).not.toHaveAttribute('data-pressed');
    });

    it('should have the data-popup-open and data-pressed attributes when open by click when `openOnHover=true`', async () => {
      await render(<TestPopover triggerProps={{openOnHover: true}} />);
      await settle();

      const trigger = screen.getByRole('button');

      fireEvent.mouseEnter(trigger);
      await settle();
      await settle();

      fireEvent.click(trigger);
      await settle();
      await settle();

      expect(trigger).toHaveAttribute('data-popup-open');
      expect(trigger).toHaveAttribute('data-pressed');
    });
  });
});
