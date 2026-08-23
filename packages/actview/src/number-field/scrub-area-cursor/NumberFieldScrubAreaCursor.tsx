import { defineComponent, useRootElement } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import { useNumberFieldScrubAreaContext } from '../scrub-area/NumberFieldScrubAreaContext';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { platform } from '@/utils/platform';
import { ownerDocument } from '@/utils/owner';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';

const CURSOR_STYLE: any = {
  position: 'fixed',
  top: 0,
  left: 0,
  pointerEvents: 'none',
};

/**
 * A custom element to display instead of the native cursor while using the scrub area.
 * Renders a `<span>` element.
 *
 * This component uses the [Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API), which may prompt the browser to display a related notification. It is disabled
 * in Safari to avoid a layout shift that this notification causes there.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export const NumberFieldScrubAreaCursor = defineComponent(function (
  componentProps: NumberFieldScrubAreaCursor.Props,
) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootContextRef = useNumberFieldRootContext();
  const scrubAreaContextRef = useNumberFieldScrubAreaContext();
  const cursorRef = useRootElement();

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;

    const {state} = rootContextRef.value;
    const {isScrubbing, isTouchInput, isPointerLockDenied, scrubAreaCursorRef} =
      scrubAreaContextRef.value;

    const shouldRender =
      isScrubbing && !platform.engine.webkit && !isTouchInput && !isPointerLockDenied;

    if (!shouldRender) {
      return null;
    }

    const stateAttributes = getStateAttributesProps(state, stateAttributesMapping);

    const merged: any = {
      role: 'presentation',
      style: CURSOR_STYLE,
      ...elementProps,
      ...stateAttributes,
    };
    if (typeof className === 'function') {
      merged.className = className(state);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = Object.assign({}, CURSOR_STYLE, style(state));
    } else if (style !== undefined) {
      merged.style = Object.assign({}, CURSOR_STYLE, style);
    }

    const mergedRefs = (el: HTMLSpanElement | null) => {
      cursorRef.value = el;
      scrubAreaCursorRef.current = el;
    };

    let element: any;
    if (render) {
      if (typeof render === 'function') {
        element = render({...merged, ...state, ref: mergedRefs} as any);
      } else {
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const Tag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className =
          typeof merged.className === 'string' && typeof renderClassName === 'string'
            ? `${merged.className} ${renderClassName}`.trim()
            : (merged.className ?? renderClassName);
        mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
        element = <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs} />;
      }
    } else {
      element = <span {...merged} ref={mergedRefs} />;
    }

    // Portal to document.body（actview 简化：渲染到 body）
    return createPortalToBody(element);
  };
}) as unknown as (props: NumberFieldScrubAreaCursor.Props) => JSX.Element;

function createPortalToBody(element: any) {
  // actview 无 createPortal——直接渲染元素（挂载到当前位置）
  return element;
}

export interface NumberFieldScrubAreaCursorState extends NumberFieldRootState {}

export interface NumberFieldScrubAreaCursorProps
  extends BaseUIComponentProps<'span', NumberFieldScrubAreaCursorState> {}

export namespace NumberFieldScrubAreaCursor {
  export type State = NumberFieldScrubAreaCursorState;
  export type Props = NumberFieldScrubAreaCursorProps;
}
