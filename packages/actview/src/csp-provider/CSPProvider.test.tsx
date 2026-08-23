import { expect } from 'vitest';
import { defineComponent } from '@actview/core';
import { CSPProvider } from '@/csp-provider';
import { useCSPContext } from '@/internals/csp-context/CSPContext';
import { createRenderer } from '#test-utils';

describe('<CSPProvider />', () => {
  const { render } = createRenderer();

  // 消费组件：render 里读 csp.value 建立追踪（Provider value 变化自动重渲染）
  const Consumer = defineComponent(function () {
    const csp = useCSPContext();
    return () => (
      <div
        data-testid="consumer"
        data-nonce={csp.value.nonce ?? ''}
        data-disabled={String(csp.value.disableStyleElements ?? false)}
      />
    );
  });

  it('falls back to the default context value without a provider', async () => {
    const { getByTestId } = await render(Consumer);

    const consumer = getByTestId('consumer');
    expect(consumer).toHaveAttribute('data-nonce', '');
    expect(consumer).toHaveAttribute('data-disabled', 'false');
  });

  it('provides nonce and disableStyleElements to consumers', async () => {
    const { getByTestId } = await render(
      defineComponent(function () {
        return () => (
          <CSPProvider nonce="abc123" disableStyleElements>
            <Consumer />
          </CSPProvider>
        );
      }),
    );

    const consumer = getByTestId('consumer');
    expect(consumer).toHaveAttribute('data-nonce', 'abc123');
    expect(consumer).toHaveAttribute('data-disabled', 'true');
  });

  it('updates consumers when provider props change', async () => {
    const Test = defineComponent(function (props: {nonce?: string}) {
      return () => (
        <CSPProvider nonce={props.nonce} disableStyleElements>
          <Consumer />
        </CSPProvider>
      );
    });

    const result = await render(Test, {nonce: 'first'});

    expect(result.getByTestId('consumer')).toHaveAttribute('data-nonce', 'first');

    // 模拟 React 版 rerender(cloneElement)：CSPProvider 换新 props
    await result.setProps({nonce: 'second'});

    expect(result.getByTestId('consumer')).toHaveAttribute('data-nonce', 'second');
    expect(result.getByTestId('consumer')).toHaveAttribute('data-disabled', 'true');
  });

  // React 版核心用例（disableStyleElements 时不渲染 inline style 标签）依赖
  // ScrollArea/Select（尚未迁移）——待这两个组件迁移完补充：
  //   it('does not render inline style tags when disableStyleElements is true', ...)
  //   it('does not render Select inline style tags when disableStyleElements is true', ...)
});
