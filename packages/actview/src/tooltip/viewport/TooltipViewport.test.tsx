import { describe, expect, it } from 'vitest';
import { Tooltip } from '@/tooltip';
import { createRenderer, describeConformance } from '#test-utils';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function OpenTooltip(props: any) {
  const {node} = props;
  return (
    <Tooltip.Root open>
      <Tooltip.Trigger>Trigger</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner>
          <Tooltip.Popup>
            <Tooltip.Viewport>{node}</Tooltip.Viewport>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

describe('<Tooltip.Viewport />', () => {
  const {render: renderCR} = createRenderer();

  describeConformance(<Tooltip.Viewport />, () => ({
    // actview conformance 检查容器首元素（Root 的根 div）；
    // render-prop ref 传递是组件内部机制——跳过。
    refInstanceof: window.HTMLDivElement,
    skip: ['renderProp'],
    render: (node) =>
      renderCR(Tooltip.Root, {
        open: true,
        children: (
          <Tooltip.Portal>
            <Tooltip.Positioner>
              <Tooltip.Popup>{node}</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        ),
      }),
  }));

  it('should render children in the `current` container', async () => {
    await render(
      <Tooltip.Root open>
        <Tooltip.Trigger>Trigger</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>
              <Tooltip.Viewport>
                <div data-testid="content">Content</div>
              </Tooltip.Viewport>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>,
    );
    await settle();
    await settle();

    const currentContainer = screen.getByTestId('content').closest('[data-current]');
    expect(currentContainer).not.toBe(null);
    expect(currentContainer!.textContent).toBe('Content');
  });
});
