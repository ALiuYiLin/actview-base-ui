import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { usePreviewCardPositionerContext } from '../positioner/PreviewCardPositionerContext';
import { usePreviewCardRootContext } from '../root/PreviewCardRootContext';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import { popupStateMapping } from '@/utils/popupStateMapping';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * Displays an element positioned against the preview-card anchor.
 * Renders a `<div>` element.
 */
export function PreviewCardArrow(componentProps: PreviewCardArrow.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：getter 字段渲染期属性访问即追踪。
  const store = usePreviewCardRootContext(false)!;
  const positionerContext = usePreviewCardPositionerContext();
  const arrowRef = positionerContext?.arrowRef ?? {value: null as Element | null};
  const open = store.useState('open');

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
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

  const state = computed<PreviewCardArrowState>(() => ({
    open: open.value,
    side: positionerContext?.side ?? ('bottom' as Side),
    align: positionerContext?.align ?? ('center' as Align),
    uncentered: positionerContext?.arrowUncentered ?? false,
  }));

  // 根元素 props：arrow 定位样式 → 透传 → open state data-*。
  const rootProps = computed<Record<string, any>>(() => {
    const attributes: Record<string, string> = {};
    const mapping: any = popupStateMapping;
    const openAttr = mapping.open(open.value);
    if (openAttr) {
      Object.assign(attributes, openAttr);
    }
    return {
      style: positionerContext?.arrowStyles,
      'aria-hidden': true,
      ...elementProps.value,
      ...attributes,
    };
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          ref: useMergedRefs(
            (el: HTMLDivElement | null) => {
              arrowRef.value = el;
            },
            componentProps.ref as any,
          ),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface PreviewCardArrowState {
  /**
   * Whether the preview-card is currently open.
   */
  open: boolean;
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side;
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * Whether the arrow cannot be centered on the anchor.
   */
  uncentered: boolean;
}

export interface PreviewCardArrowProps extends BaseUIComponentProps<'div', PreviewCardArrowState> {
  children?: any;
  [key: string]: any;
}

export namespace PreviewCardArrow {
  export type State = PreviewCardArrowState;
  export type Props = PreviewCardArrowProps;
}
