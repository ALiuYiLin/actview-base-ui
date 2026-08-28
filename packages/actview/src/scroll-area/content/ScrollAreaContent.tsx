import {onMounted, onUnmounted, useRootElement, ref, toRefs, unrefs} from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { useScrollAreaViewportContext } from '../viewport/ScrollAreaViewportContext';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * The scroll area content.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaContent(componentProps: ScrollAreaContent.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootContextRef = useScrollAreaRootContext();
  const viewportContextRef = useScrollAreaViewportContext();
  const contentWrapperRef = useRootElementFragment();

  const computeOnInitialResizeRef = ref(rootContextRef.value.hasMeasuredScrollbar);

  // React 版 useIsoLayoutEffect：内容尺寸变化 → 重算 thumb
  let resizeObserver: ResizeObserver | null = null;
  let hasInitialized = false;

  onMounted(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const computeThumbPosition = viewportContextRef.value.computeThumbPosition;

    resizeObserver = new ResizeObserver(() => {
      if (!hasInitialized) {
        hasInitialized = true;

        // ResizeObserver fires once upon observing. Skip that initial call to avoid
        // double-calculating the thumb position on mount, unless the content mounted
        // after the viewport's initial measurement.
        if (!computeOnInitialResizeRef.value) {
          return;
        }
      }

      computeThumbPosition();
    });

    if (contentWrapperRef.value) {
      resizeObserver.observe(contentWrapperRef.value);
    }
  });

  onUnmounted(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
  });

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    state: () => rootContextRef.value.viewportState,
    stateAttributesMapping: scrollAreaStateAttributesMapping as any,
    className,
    style,
    render,
    refs: () => [contentWrapperRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ScrollAreaContentState {}

export interface ScrollAreaContentProps
  extends BaseUIComponentProps<'div', ScrollAreaContentState> {}

export namespace ScrollAreaContent {
  export type State = ScrollAreaContentState;
  export type Props = ScrollAreaContentProps;
}
