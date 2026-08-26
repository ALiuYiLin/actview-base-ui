import { describe, expect, it, vi } from 'vitest';
import { PreviewCard } from '@/preview-card';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function TestPreviewCard(props: any = {}) {
  const {triggerProps = {}, rootProps = {}} = props;
  return (
    <PreviewCard.Root {...rootProps}>
      <PreviewCard.Trigger {...triggerProps}>Trigger</PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner>
          <PreviewCard.Popup data-testid="popup">Preview content</PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}

describe('<PreviewCard.Root />', () => {
  it('opens on hover and closes on mouse leave', async () => {
    await render(<TestPreviewCard />);
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

  it('opens on keyboard focus', async () => {
    await render(<TestPreviewCard />);
    await settle();

    const trigger = screen.getByRole('button', {name: 'Trigger'});
    trigger.focus();
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);
  });

  it('does not open when disabled', async () => {
    await render(<TestPreviewCard rootProps={{disabled: true}} />);
    await settle();

    fireEvent.mouseEnter(screen.getByRole('button', {name: 'Trigger'}));
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });

  it('renders with defaultOpen', async () => {
    await render(<TestPreviewCard rootProps={{defaultOpen: true}} />);
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);
    expect(screen.getByText('Preview content')).not.toBe(null);
  });

  it('calls onOpenChange on hover open', async () => {
    const onOpenChange = vi.fn();
    await render(<TestPreviewCard rootProps={{onOpenChange}} />);
    await settle();

    fireEvent.mouseEnter(screen.getByRole('button', {name: 'Trigger'}));
    await settle();
    await settle();

    expect(onOpenChange.mock.lastCall?.[0]).toBe(true);
  });

  it('closes on Escape', async () => {
    await render(<TestPreviewCard rootProps={{defaultOpen: true}} />);
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);

    fireEvent.keyDown(document, {key: 'Escape'});
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });
});
