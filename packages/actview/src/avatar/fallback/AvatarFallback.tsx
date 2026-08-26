import { onUnmounted, ref, toValue, toRefs, unrefs, watch } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useAvatarRootContext } from '../root/AvatarRootContext';
import type { AvatarRootState } from '../root/AvatarRoot';
import { avatarStateAttributesMapping } from '../root/stateAttributesMapping';
import { useRenderElement } from '@/internals/useRenderElement';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * Rendered when the image fails to load or when no image is provided.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
export function AvatarFallback(componentProps: AvatarFallback.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>` + 条件）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();
  // setup 期读 context（AD-42）——返回 Ref，render 里 .value 取最新
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

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const stateFn = (): AvatarFallbackState => ({
    imageLoadingStatus: context.value.imageLoadingStatus.value,
  });

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    state: stateFn,
    stateAttributesMapping: avatarStateAttributesMapping as any,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'span',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 条件（delay/imageLoadingStatus）必须在渲染期求值（PD-15）——IIFE 内读取。
  return (
    <>
      {(() => {
        const delay = toValue(componentProps.delay) ?? 0;
        const imageLoadingStatus = context.value.imageLoadingStatus.value;
        return imageLoadingStatus === 'loaded' || !(delay === 0 || delayPassed.value)
          ? null
          : element();
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
