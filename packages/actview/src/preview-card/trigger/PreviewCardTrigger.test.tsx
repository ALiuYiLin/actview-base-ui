import { describe, expect, it } from 'vitest';
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

describe('<PreviewCard.Trigger />', () => {
  it('does not open on click alone', async () => {
    await render(<TestPreviewCard />);
    await settle();

    // PreviewCard.Trigger 默认渲染 <a>（无 href → 无 link role，M2-原语-7）。
    fireEvent.click(document.querySelector('a')!);
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });
});
