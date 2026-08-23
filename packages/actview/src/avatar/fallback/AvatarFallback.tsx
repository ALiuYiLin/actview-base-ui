import { defineComponent, onUnmounted, ref, toValue, useRootElement, watch } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { mergeClassNames, mergeStyles } from '@/utils/mergeClassNames';
import { useAvatarRootContext } from '../root/AvatarRootContext';
import type { AvatarRootState } from '../root/AvatarRoot';
import { avatarStateAttributesMapping } from '../root/stateAttributesMapping';

/**
 * Rendered when the image fails to load or when no image is provided.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
export const AvatarFallback = defineComponent(function (componentProps: AvatarFallback.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();
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

  // ============ render（每次渲染执行） ============
  return () => {
    const {className, render, delay = 0, style, ...elementProps} = componentProps;

    const imageLoadingStatus = context.value.imageLoadingStatus.value;

    if (imageLoadingStatus === 'loaded' || !(delay === 0 || delayPassed.value)) {
      return null;
    }

    const state: AvatarFallbackState = {
      imageLoadingStatus,
    };

    const stateAttributes = getStateAttributesProps(state, avatarStateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, elementProps, stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(state);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(state);
    } else if (style !== undefined) {
      merged.style = style;
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...state, ref: rootRef});
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className = mergeClassNames(merged.className, renderClassName);
      mergedRenderProps.style = mergeStyles(merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
    }
    return <span {...merged} ref={rootRef} />;
  };
}) as unknown as (props: AvatarFallback.Props) => JSX.Element;

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
