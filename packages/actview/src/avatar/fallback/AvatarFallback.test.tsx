import { expect, vi } from 'vitest';
import { defineComponent, nextTick, ref } from '@actview/core';
import { Avatar } from '@/avatar';
import { AvatarRootContext } from '@/avatar/root/AvatarRootContext';
import { waitFor, screen } from '#test-utils/rtl';
import { describeConformance, createRenderer } from '#test-utils';
import { isJSDOM } from '@floating-ui/actview/utils';

// React 版用 vi.mock(useImageLoadingStatus) + <Avatar.Image /> 驱动状态；
// actview 版直接注入 AvatarRootContext（AccordionHeader 测试范式），不依赖
// 尚未迁移的 Avatar.Image——status 可独立驱动 Fallback 的全部逻辑。
function renderFallbackWithStatus(
  status: 'idle' | 'loading' | 'loaded' | 'error',
  fallback: any = <Avatar.Fallback data-testid="fallback">AC</Avatar.Fallback>,
) {
  const Wrapper = defineComponent(function () {
    const ctx = {
      imageLoadingStatus: ref(status),
      setImageLoadingStatus: () => {},
    };
    return () => (
      <AvatarRootContext.Provider value={ctx}>{fallback}</AvatarRootContext.Provider>
    );
  });
  return Wrapper;
}

describe('<Avatar.Fallback />', () => {
  const { render } = createRenderer();

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describeConformance(<Avatar.Fallback />, () => ({
    // createRenderer 的 render 收 (Component, props)——conformance 传 VNode，
    // 映射为 Root + children（Provider 提供 context）
    render: (node) => render(Avatar.Root, { children: node }),
    refInstanceof: window.HTMLSpanElement,
  }));

  it.skipIf(!isJSDOM())('should not render the children if the image loaded', async () => {
    await render(renderFallbackWithStatus('loaded'));

    await waitFor(() => {
      expect(screen.queryByTestId('fallback')).toBe(null);
    });
  });

  it.skipIf(!isJSDOM())('should render the fallback if the image fails to load', async () => {
    await render(renderFallbackWithStatus('error'));

    await waitFor(() => {
      expect(screen.queryByText('AC')).not.toBe(null);
    });
  });

  it.skipIf(!isJSDOM())('shows the fallback when a loaded image is unmounted', async () => {
    // React 版语义：Avatar.Image 卸载时 setImageLoadingStatus('idle')（useIsoLayoutEffect
    // cleanup）→ Root 状态变化 → Fallback 显示。actview 版用 status ref 模拟同一行为。
    function Test() {
      const showImage = ref(true);
      const status = ref<'idle' | 'loaded'>('loaded');
      const setImageLoadingStatus = (s: 'idle' | 'loaded') => {
        status.value = s;
      };
      return () => (
        <div>
          <button
            onClick={() => {
              showImage.value = false;
              setImageLoadingStatus('idle');
            }}
          >
            Hide image
          </button>
          <AvatarRootContext.Provider
            value={{
              imageLoadingStatus: status as any,
              setImageLoadingStatus: setImageLoadingStatus as any,
            }}
          >
            {showImage.value && <span data-testid="image">img</span>}
            <Avatar.Fallback data-testid="fallback">AC</Avatar.Fallback>
          </AvatarRootContext.Provider>
        </div>
      );
    }

    const user = await import('@testing-library/user-event').then((m) => m.default.setup());
    await render(Test);

    await waitFor(() => {
      expect(screen.queryByTestId('fallback')).toBe(null);
    });
    expect(screen.getByTestId('image')).not.toBe(null);

    await user.click(screen.getByText('Hide image'));

    await waitFor(() => {
      expect(screen.getByTestId('fallback')).not.toBe(null);
    });
    expect(screen.queryByTestId('image')).toBe(null);
  });

  describe.skipIf(!isJSDOM())('prop: delay', () => {
    it('shows the fallback when the delay has elapsed', async () => {
      vi.useFakeTimers();
      await render(renderFallbackWithStatus('error', <Avatar.Fallback delay={100}>AC</Avatar.Fallback>));

      expect(screen.queryByText('AC')).toBe(null);

      vi.advanceTimersByTime(100);
      await nextTick();

      expect(screen.queryByText('AC')).not.toBe(null);
    });

    it('shows the fallback immediately when delay is 0', async () => {
      vi.useFakeTimers();
      await render(renderFallbackWithStatus('error', <Avatar.Fallback delay={0}>AC</Avatar.Fallback>));

      // No timers are advanced: `delay={0}` must render synchronously on mount.
      expect(screen.queryByText('AC')).not.toBe(null);
    });

    it('shows the fallback when delay changes to 0', async () => {
      vi.useFakeTimers();
      const Test = defineComponent(function (props: { delay?: number }) {
        return () => (
          <AvatarRootContext.Provider
            value={{
              imageLoadingStatus: ref('error'),
              setImageLoadingStatus: () => {},
            }}
          >
            <Avatar.Fallback delay={props.delay}>AC</Avatar.Fallback>
          </AvatarRootContext.Provider>
        );
      });

      const { setProps } = await render(Test, { delay: 100 });

      expect(screen.queryByText('AC')).toBe(null);

      await setProps({ delay: 0 });

      expect(screen.queryByText('AC')).not.toBe(null);
    });

    it('keeps the fallback visible when delay changes from undefined to a number', async () => {
      vi.useFakeTimers();
      const Test = defineComponent(function (props: { delay?: number }) {
        return () => (
          <AvatarRootContext.Provider
            value={{
              imageLoadingStatus: ref('error'),
              setImageLoadingStatus: () => {},
            }}
          >
            <Avatar.Fallback delay={props.delay}>AC</Avatar.Fallback>
          </AvatarRootContext.Provider>
        );
      });

      const { setProps } = await render(Test, { delay: undefined });

      expect(screen.queryByText('AC')).not.toBe(null);

      await setProps({ delay: 100 });

      expect(screen.queryByText('AC')).not.toBe(null);
    });

    it('keeps the fallback visible across a number -> undefined -> number delay change', async () => {
      vi.useFakeTimers();
      const Test = defineComponent(function (props: { delay?: number }) {
        return () => (
          <AvatarRootContext.Provider
            value={{
              imageLoadingStatus: ref('error'),
              setImageLoadingStatus: () => {},
            }}
          >
            <Avatar.Fallback delay={props.delay}>AC</Avatar.Fallback>
          </AvatarRootContext.Provider>
        );
      });

      const { setProps } = await render(Test, { delay: 100 });

      // Fallback is hidden until the delay elapses.
      expect(screen.queryByText('AC')).toBe(null);

      // Removing the delay before it elapses shows the fallback immediately.
      await setProps({ delay: undefined });
      expect(screen.queryByText('AC')).not.toBe(null);

      // Restoring the delay must not re-hide the already-visible fallback.
      await setProps({ delay: 100 });
      expect(screen.queryByText('AC')).not.toBe(null);
    });
  });

  it.skipIf(!isJSDOM())(
    'keeps fallback mounted and image unmounted while the image is loading',
    async () => {
      function Test() {
        const showImage = ref(false);
        return () => (
          <div>
            <button onClick={() => (showImage.value = true)}>Show image</button>
            <AvatarRootContext.Provider
              value={{
                imageLoadingStatus: ref('loading'),
                setImageLoadingStatus: () => {},
              }}
            >
              {showImage.value && <span data-testid="image">img</span>}
              <Avatar.Fallback data-testid="fallback">AC</Avatar.Fallback>
            </AvatarRootContext.Provider>
          </div>
        );
      }

      const user = await import('@testing-library/user-event').then((m) => m.default.setup());
      await render(Test);

      expect(screen.queryByTestId('image')).toBe(null);
      expect(screen.getByTestId('fallback')).not.toBe(null);

      await user.click(screen.getByText('Show image'));

      await waitFor(() => {
        expect(screen.queryByTestId('image')).not.toBe(null);
        expect(screen.getByTestId('fallback')).not.toBe(null);
      });
    },
  );
});
