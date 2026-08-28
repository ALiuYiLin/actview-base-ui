import { onUnmounted, ref, toValue, toRefs, unrefs, watch } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useAvatarRootContext } from '../root/AvatarRootContext';
import type { AvatarRootState } from '../root/AvatarRoot';
import { avatarStateAttributesMapping } from '../root/stateAttributesMapping';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Rendered when the image fails to load or when no image is provided.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
export function AvatarFallback(componentProps: AvatarFallback.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：读 imageLoadingStatus 字段即追踪。
  const context = useAvatarRootContext();

  const delayPassed = ref(toValue(componentProps.delay) === 0);

  // React 版 useTimeout(delay)：delay > 0 时延时显示，否则立即显示。
  // 初始逻辑放 setup 直接执行（actview watch 的 immediate 首次回调在
  // 首次值为 undefined 时因 hasChanged 守卫不触发——见 core/watch.ts），
  // watch 只处理后续 prop 变化。
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const clearDelayTimeout = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const initialDelay = toValue(componentProps.delay) ?? 0;
  if (initialDelay > 0) {
    timeoutId = setTimeout(() => {
      delayPassed.value = true;
    }, initialDelay);
  } else {
    // Once the fallback is shown without a delay, keep it visible. Otherwise a later
    // change from no delay to a number would re-hide an already-visible fallback.
    delayPassed.value = true;
  }

  watch(
    () => toValue(componentProps.delay),
    (delay) => {
      clearDelayTimeout();
      if (delay > 0) {
        timeoutId = setTimeout(() => {
          delayPassed.value = true;
        }, delay);
      } else {
        delayPassed.value = true;
      }
    },
  );
  onUnmounted(clearDelayTimeout);

  // ============ setup：值形 props toRefs 活引用；ref 形 props 直读本體 ============
  const { className, render, style, ...elementProps } = toRefs(componentProps);

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 条件（delay/imageLoadingStatus）在渲染期求值——读 reactive 字段即追踪。
  return (
    <>
      {(() => {
        const delay = toValue(componentProps.delay) ?? 0;
        const imageLoadingStatus = context.imageLoadingStatus;
        return imageLoadingStatus === 'loaded' || !(delay === 0 || delayPassed.value)
          ? null
          : useRenderElement(
              'span',
              {
                className: className?.value,
                render: render?.value,
                style: style?.value,
              },
              {
                state: { imageLoadingStatus },
                ref: componentProps.ref,
                props: [unrefs(elementProps)],
              },
            );
      })()}
    </>
  );
}

export interface AvatarFallbackState extends AvatarRootState {}

export interface AvatarFallbackProps extends BaseUIComponentProps<'span', AvatarFallbackState> {
  /**
   * How long to wait before showing the fallback. Specified in milliseconds.
   *
   * @default 0
   */
  delay?: number | undefined;
}

export namespace AvatarFallback {
  export type State = AvatarFallbackState;
  export type Props = AvatarFallbackProps;
}
