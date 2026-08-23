import { computed, ref, toValue, watch } from 'actview';
import type { MaybeRefOrGetter } from '@/internals/types';
import { AnimationFrame } from '@base-ui/actview-utils/useAnimationFrame';

export type TransitionStatus = 'starting' | 'ending' | 'idle' | undefined;

/**
 * Provides a status string for CSS animations.
 * (actview 转译版：React 的 render 期 setState 调整 + useIsoLayoutEffect +
 * AnimationFrame → watch + AnimationFrame。语义对齐 React 版：
 * - open 变 true：mounted=true、transitionStatus='starting'（下一帧转
 *   idle[enableIdleState] 或 undefined）
 * - open 变 false：transitionStatus='ending'（deferEndingState 时下一帧）
 * - 关闭动画完成后由调用方 setMounted(false)（useOpenChangeComplete）
 * )
 * @param open - a boolean that determines if the element is open.
 * @param enableIdleState - a boolean that enables the `'idle'` state between `'starting'` and `'ending'`
 */
export function useTransitionStatus(
  open: MaybeRefOrGetter<boolean>,
  enableIdleState: MaybeRefOrGetter<boolean> = false,
  deferEndingState: MaybeRefOrGetter<boolean> = false,
) {
  const isOpen = computed(() => toValue(open));
  const enableIdle = computed(() => toValue(enableIdleState));
  const deferEnding = computed(() => toValue(deferEndingState));

  const transitionStatus = ref<TransitionStatus>(
    isOpen.value && enableIdle.value ? 'idle' : undefined,
  );
  const mounted = ref(isOpen.value);
  const setMounted = (value: boolean) => {
    mounted.value = value;
  };

  // 同步状态转移（对齐 React 版 render 期调整）：open / deferEnding 变化时执行
  watch(
    () => [isOpen.value, deferEnding.value],
    ([isOpenValue, deferEndingValue]) => {
      if (isOpenValue && !mounted.value) {
        mounted.value = true;
        transitionStatus.value = 'starting';
      }

      if (!isOpenValue && mounted.value && transitionStatus.value !== 'ending' && !deferEndingValue) {
        transitionStatus.value = 'ending';
      }

      if (!isOpenValue && !mounted.value && transitionStatus.value === 'ending') {
        transitionStatus.value = undefined;
      }
    },
    {immediate: true},
  );

  // deferEndingState：关闭后下一帧才进入 'ending'
  watch(
    () => isOpen.value,
    (isOpenValue, _old, onCleanup) => {
      if (!isOpenValue && mounted.value && transitionStatus.value !== 'ending' && deferEnding.value) {
        const frame = AnimationFrame.request(() => {
          transitionStatus.value = 'ending';
        });
        onCleanup(() => {
          AnimationFrame.cancel(frame);
        });
      }
    },
    {immediate: true},
  );

  // 'starting' → 下一帧转 idle（enableIdleState）或 undefined（对齐 React 版
  // 两个 useIsoLayoutEffect 的 AnimationFrame 语义）。
  // 注意：actview 的 rAF 注册在微任务（watch 默认 flush pre），而 React 的
  // useIsoLayoutEffect 在 DOM 提交的宏任务内同步注册——两者相对「下一帧
  // 样式计算」的时机不同。实测单帧 rAF 在 headless Chromium 下偶发
  // transition 不触发（[data-starting-style] 在元素首次样式计算前被移除，
  // 起始 opacity 直接是终值，transition 从不运行）→ 这里保留两帧，
  // 确保 [data-starting-style] 至少被绘制一帧（opacity: 0 起始）。
  watch(
    () => transitionStatus.value,
    (status, _old, onCleanup) => {
      if (status !== 'starting') {
        return;
      }

      let frame2: number | null = null;
      const frame1 = AnimationFrame.request(() => {
        frame2 = AnimationFrame.request(() => {
          transitionStatus.value = enableIdle.value ? 'idle' : undefined;
        });
      });
      onCleanup(() => {
        AnimationFrame.cancel(frame1);
        if (frame2 !== null) {
          AnimationFrame.cancel(frame2);
        }
      });
    },
  );

  // enableIdleState：idle 期间 open 保持时，若因动画帧延迟仍停在 'starting'
  // 则补一发 'starting'（React effect3 的 open && mounted && status!=='idle' 分支）
  watch(
    () => [isOpen.value, mounted.value],
    ([isOpenValue, mountedValue]) => {
      if (
        enableIdle.value &&
        isOpenValue &&
        mountedValue &&
        transitionStatus.value !== 'idle' &&
        transitionStatus.value !== 'starting'
      ) {
        transitionStatus.value = 'starting';
      }
    },
    {immediate: true},
  );

  return {
    mounted: computed(() => mounted.value),
    setMounted,
    transitionStatus: computed(() => transitionStatus.value),
  };
}
