import { describe, it } from 'vitest';
import { Popover } from '@/popover';
import { render, act } from '#test-utils/rtl';

describe('<Popover.Arrow />', () => {
  // 注：#test-utils（不带 /rtl）会解析到 React 版 conformance，对 actview
  // 组件 + Fragment 根（M2-1 后 Popover 根无 DOM 包装）不适用——改用 actview
  // 渲染测试（React 参考 conformance 不覆盖此场景）。

  it('renders within an open popup', async () => {
    await render(
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              <Popover.Arrow />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await act(async () => {});
  });
});
