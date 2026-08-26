import { describe } from 'vitest';
import { Popover } from '@/popover';
import { createRenderer, describeConformance } from '#test-utils';

describe('<Popover.Arrow />', () => {
  const { render } = createRenderer();

  describeConformance(<Popover.Arrow />, () => ({
    // actview conformance 检查容器首元素（Root 的根 div）；
    // render-prop ref 传递是组件内部机制（Arrow 不转发 ref 给 render 函数）——跳过。
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
});
