import { describe, expect, it } from 'vitest';
import { Popover } from '@/popover';
import { createRenderer, describeConformance } from '#test-utils';
import { screen } from '#test-utils/rtl';

describe('<Popover.Description />', () => {
  const { render } = createRenderer();

  describeConformance(<Popover.Description />, () => ({
    // actview conformance 检查容器首元素（Root 的根 div）；
    // render-prop ref 传递是组件内部机制（Description 不转发 ref 给 render 函数）——跳过。
    refInstanceof: window.HTMLDivElement,
    skip: ['renderProp'],
    render: (node) =>
      render(Popover.Root, {
        open: true,
        children: (
          <>
            <Popover.Trigger>Trigger</Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup>{node}</Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </>
        ),
      }),
  }));

  it('describes the popup element with its id', async () => {
    await render(Popover.Root, {
      open: true,
      children: (
        <>
          <Popover.Trigger>Trigger</Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>
                <Popover.Description>Title</Popover.Description>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </>
      ),
    });

    const id = document.querySelector('p')?.id;
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby', id);
  });
});
