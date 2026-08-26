import { describe } from 'vitest';
import { Dialog } from '@/dialog';
import { createRenderer, describeConformance } from '#test-utils';

describe('<Dialog.Description />', () => {
  const { render } = createRenderer();

  describeConformance(<Dialog.Description />, () => ({
    // actview conformance 检查容器首元素（Root 的根 div）；
    // render-prop ref 传递是组件内部机制——跳过。
    refInstanceof: window.HTMLDivElement,
    skip: ['renderProp'],
    render: (node) =>
      render(Dialog.Root, {
        open: true,
        modal: false,
        children: (
          <Dialog.Portal>
            <Dialog.Popup>{node}</Dialog.Popup>
          </Dialog.Portal>
        ),
      }),
  }));
});
