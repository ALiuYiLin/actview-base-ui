import { describe, expect, it, vi } from 'vitest';
import { Tooltip } from '@/tooltip';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function TestTooltip(props: any = {}) {
  const {triggerProps = {}, rootProps = {}, delay = 0} = props;
  return (
    <Tooltip.Root {...rootProps}>
      <Tooltip.Trigger {...triggerProps} delay={delay}>
        Trigger
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner>
          <Tooltip.Popup data-testid="popup">Tooltip content</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

describe('<Tooltip.Root />', () => {
  it('opens on hover and closes on mouse leave', async () => {
    await render(<TestTooltip />);
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);

    const trigger = screen.getByRole('button', {name: 'Trigger'});
    fireEvent.mouseEnter(trigger);
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);
    expect(trigger).toHaveAttribute('data-popup-open', '');

    fireEvent.mouseLeave(trigger);
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });

  it('does not open when disabled', async () => {
    await render(<TestTooltip rootProps={{disabled: true}} />);
    await settle();

    const trigger = screen.getByRole('button', {name: 'Trigger'});
    fireEvent.mouseEnter(trigger);
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });

  it('opens with defaultOpen', async () => {
    await render(<TestTooltip rootProps={{defaultOpen: true}} />);
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);
    expect(screen.getByText('Tooltip content')).not.toBe(null);
  });

  it('calls onOpenChange on hover open', async () => {
    const onOpenChange = vi.fn();
    await render(<TestTooltip rootProps={{onOpenChange}} />);
    await settle();

    fireEvent.mouseEnter(screen.getByRole('button', {name: 'Trigger'}));
    await settle();
    await settle();

    expect(onOpenChange.mock.lastCall?.[0]).toBe(true);
  });

  it('opens on keyboard focus', async () => {
    await render(<TestTooltip />);
    await settle();

    const trigger = screen.getByRole('button', {name: 'Trigger'});
    trigger.focus();
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);
  });

  it('does not open on click alone', async () => {
    await render(<TestTooltip />);
    await settle();

    fireEvent.click(screen.getByRole('button', {name: 'Trigger'}));
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });

  it('supports actionsRef close', async () => {
    const actionsRef = {value: null as any};
    await render(<TestTooltip rootProps={{defaultOpen: true, actionsRef}} />);
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);

    await act(async () => {
      actionsRef.value.close();
    });
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });
});
