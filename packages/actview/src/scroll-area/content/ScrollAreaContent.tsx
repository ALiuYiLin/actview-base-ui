import { defineComponent, onMounted, onUnmounted, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { useScrollAreaViewportContext } from '../viewport/ScrollAreaViewportContext';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';

/**
 * The scroll area content.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export const ScrollAreaContent = defineComponent(function (componentProps: ScrollAreaContent.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootContextRef = useScrollAreaRootContext();
  const viewportContextRef = useScrollAreaViewportContext();
  const contentWrapperRef = useRootElement();

  const computeOnInitialResizeRef = {current: rootContextRef.value.hasMeasuredScrollbar};

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
        if (!computeOnInitialResizeRef.current) {
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

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;

    const {viewportState} = rootContextRef.value;

    const stateAttributes = getStateAttributesProps(viewportState, scrollAreaStateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, elementProps, stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(viewportState);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(viewportState);
    } else if (style !== undefined) {
      merged.style = style;
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...viewportState, ref: contentWrapperRef} as any);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={contentWrapperRef} />;
    }
    return <div {...merged} ref={contentWrapperRef}>{componentProps.children}</div>;
  };
}) as unknown as (props: ScrollAreaContent.Props) => JSX.Element;

export interface ScrollAreaContentState {}

export interface ScrollAreaContentProps
  extends BaseUIComponentProps<'div', ScrollAreaContentState> {}

export namespace ScrollAreaContent {
  export type State = ScrollAreaContentState;
  export type Props = ScrollAreaContentProps;
}
