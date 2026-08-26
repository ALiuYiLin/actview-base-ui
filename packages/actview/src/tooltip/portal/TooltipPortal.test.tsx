import { describe, expect, it } from 'vitest';
import { Tooltip } from '@/tooltip';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function ClosedTooltip(props: any) {
  const {keepMounted} = props;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger>Trigger</Tooltip.Trigger>
      <Tooltip.Portal keepMounted={keepMounted}>
        <p data-testid="content-p">Content</p>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// Portal 不产生 DOM 根（children 由子树渲染）——conformance 的容器首元素
// 检查不适用；直接验证渲染行为。
describe('<Tooltip.Portal />', () => {
  it('renders its children', async () => {
    await render(
      <Tooltip.Root open>
        <Tooltip.Portal>Content</Tooltip.Portal>
      </Tooltip.Root>,
    );
    await settle();

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders the closed content as hidden instead of unmounting it with keepMounted', async () => {
    await render(<ClosedTooltip keepMounted />);
    await settle();

    expect(screen.getByTestId('content-p')).toBeInTheDocument();
  });

  it('unmounts the closed content by default', async () => {
    await render(<ClosedTooltip />);
    await settle();

    expect(screen.queryByTestId('content-p')).toBe(null);
  });
});
