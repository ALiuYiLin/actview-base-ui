import { describe, expect, it } from 'vitest';
import { Tooltip } from '@/tooltip';
import { createRenderer, describeConformance } from '#test-utils';
import { screen } from '#test-utils/rtl';

describe('<Tooltip.Arrow />', () => {
  const { render } = createRenderer();

  describeConformance(<Tooltip.Arrow />, () => ({
    // actview conformance 检查容器首元素（Root 的根 div）；
    // render-prop ref 传递是组件内部机制——跳过。
    refInstanceof: window.HTMLDivElement,
    skip: ['renderProp'],
    render: (node) =>
      render(Tooltip.Root, {
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

  it('is hidden from assistive technology and marks the open state', async () => {
    await render(
      Tooltip.Root, {
        open: true,
        children: (
          <>
            <Tooltip.Trigger>Trigger</Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner>
                <Tooltip.Popup>
                  <Tooltip.Arrow data-testid="arrow" />
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </>
        ),
      },
    );

    const arrow = screen.getByTestId('arrow');
    expect(arrow).toHaveAttribute('aria-hidden', 'true');
    expect(arrow).toHaveAttribute('data-open');
  });
});
