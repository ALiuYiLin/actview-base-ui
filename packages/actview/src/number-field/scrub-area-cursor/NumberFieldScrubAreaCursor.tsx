import { computed, ref, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import { useNumberFieldScrubAreaContext } from '../scrub-area/NumberFieldScrubAreaContext';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { platform } from '@/utils/platform';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

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
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElementFragment）。
  const cursorRef = ref(null as HTMLSpanElement | null);

  const rootContext = useNumberFieldRootContext();
  const scrubAreaContext = useNumberFieldScrubAreaContext();

  // ============ setup：值形 props toRefs 活引用 ============
  // children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // 根元素 props：presentation 语义 + 固定 cursor 样式 → 透传。
  const rootProps = computed<Record<string, any>>(() => {
    const stateValue = rootContext.state;
    const resolvedStyle =
      typeof style?.value === 'function' ? style.value(stateValue) : style?.value;
    return {
      role: 'presentation',
      style: Object.assign({}, CURSOR_STYLE, resolvedStyle),
      ...elementProps.value,
    };
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // Portal to document.body（actview 简化：渲染到当前位置）
  return (
    <>
      {scrubAreaContext && scrubAreaContext.isScrubbing && !platform.engine.webkit && !scrubAreaContext.isTouchInput && !scrubAreaContext.isPointerLockDenied
        ? useRenderElement(
            'span',
            {
              className: className?.value,
              render: render?.value,
            },
            {
              state: rootContext.state,
              stateAttributesMapping: stateAttributesMapping as any,
              ref: useMergedRefs(cursorRef, scrubAreaContext?.scrubAreaCursorRef as any),
              props: rootProps.value,
            },
          )
        : null}
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
