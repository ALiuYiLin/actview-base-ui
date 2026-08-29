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
      {/* href="#" 使 <a> 可聚焦（对齐 React 参考测试用法；组件本身无 href 时
          不可 Tab 聚焦——M2-原语-7）。 */}
      <PreviewCard.Trigger href="#" {...triggerProps}>Trigger</PreviewCard.Trigger>
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

    // PreviewCard.Trigger 默认渲染 <a>（无 href，M2-原语-7）
    const trigger = document.querySelector('a') as HTMLElement;
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

    // PreviewCard.Trigger 默认渲染 <a>（无 href，M2-原语-7）
    const trigger = document.querySelector('a') as HTMLElement;
    trigger.focus();
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);
  });

  it('does not open when disabled', async () => {
    await render(<TestPreviewCard rootProps={{disabled: true}} />);
    await settle();

    fireEvent.mouseEnter(document.querySelector('a') as HTMLElement);
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

    fireEvent.mouseEnter(document.querySelector('a') as HTMLElement);
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
