import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import { useNumberFieldScrubAreaContext } from '../scrub-area/NumberFieldScrubAreaContext';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { platform } from '@/utils/platform';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

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
export function NumberFieldScrubAreaCursor(componentProps: NumberFieldScrubAreaCursor.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootContextRef = useNumberFieldRootContext();
  const scrubAreaContextRef = useNumberFieldScrubAreaContext();
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const cursorRef = useRootElementFragment();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const stateValue = rootContextRef.value.state;
      const resolvedStyle =
        typeof style?.value === 'function' ? style.value(stateValue) : style?.value;
      const merged: any = {
        role: 'presentation',
        style: Object.assign({}, CURSOR_STYLE, resolvedStyle),
        ...unrefs(elementProps),
      };
      return [merged];
    },
    state: () => rootContextRef.value.state,
    stateAttributesMapping: stateAttributesMapping as any,
    className,
    render,
    refs: () => [cursorRef as any, scrubAreaContextRef.value.scrubAreaCursorRef as any],
    defaultTag: 'span',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // Portal to document.body（actview 简化：渲染到当前位置）
  return (
    <>
      {(() => {
        const {isScrubbing, isTouchInput, isPointerLockDenied} = scrubAreaContextRef.value;
        if (!isScrubbing || platform.engine.webkit || isTouchInput || isPointerLockDenied) {
          return null;
        }
        return element();
      })()}
    </>
  );
}

export interface NumberFieldScrubAreaCursorState extends NumberFieldRootState {}

export interface NumberFieldScrubAreaCursorProps
  extends BaseUIComponentProps<'span', NumberFieldScrubAreaCursorState> {}

export namespace NumberFieldScrubAreaCursor {
  export type State = NumberFieldScrubAreaCursorState;
  export type Props = NumberFieldScrubAreaCursorProps;
}
