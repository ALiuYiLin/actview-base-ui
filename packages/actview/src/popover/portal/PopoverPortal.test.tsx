import { describe, expect, it } from 'vitest';
import { Popover } from '@/popover';
import { createRenderer } from '#test-utils';
import { screen } from '#test-utils/rtl';

// Portal 不产生 DOM 根（children 由子树渲染）——conformance 的容器首元素
// 检查不适用；直接验证渲染行为。
describe('<Popover.Portal />', () => {
  const { render } = createRenderer();

  it('renders its children', async () => {
    await render(Popover.Root, {
      open: true,
      children: <Popover.Portal>Content</Popover.Portal>,
    });

    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
