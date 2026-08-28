import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { useTooltipPositionerContext } from '../positioner/TooltipPositionerContext';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { useHoverFloatingInteraction } from '@/floating-ui-react';
import { getDisabledMountTransitionStyles } from '@/internals/getDisabledMountTransitionStyles';
import { mergePropsN } from '@/merge-props';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A container for the tooltip contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipPopup(componentProps: TooltipPopup.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：store 的 useState 字段渲染期 `.value` 求值。
  const store = useTooltipRootContext(false);
  const positionerContext = useTooltipPositionerContext(false);

  const open = store.useState('open');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const popupProps = store.useState('popupProps');
  const floatingContext = store.useState('floatingRootContext');
  const disabled = store.useState('disabled');
  const closeDelay = store.useState('closeDelay');

  useOpenChangeComplete({
    open,
    ref: store.context.popupRef,
    onComplete() {
      if (open.value) {
        store.context.onOpenChangeComplete?.(true);
      }
    },
  });

  useHoverFloatingInteraction(floatingContext.value as any, {
    enabled: !disabled.value,
    closeDelay: closeDelay.value,
  });

  const setPopupElement = store.useStateSetter('popupElement');

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

  const state = computed<TooltipPopupState>(() => ({
    open: open.value,
    side: positionerContext?.side ?? ('bottom' as Side),
    align: positionerContext?.align ?? ('start' as Align),
    instant: instantType.value as any,
    transitionStatus: transitionStatus.value,
  }));

  // 根元素 props：tabIndex → store popupProps → 挂载过渡样式 → 透传 → open/
  // transition data-*。
  const rootProps = computed<Record<string, any>>(() => {
    const stateValue = state.value;
    const attributes: Record<string, string> = {};
    if (stateValue.open) {
      attributes['data-open'] = '';
    } else {
      attributes['data-closed'] = '';
    }
    if (stateValue.transitionStatus === 'starting') {
      attributes['data-starting-style'] = '';
    } else if (stateValue.transitionStatus === 'ending') {
      attributes['data-ending-style'] = '';
    }

    const merged: any = mergePropsN<any>([
      {
        tabIndex: -1,
      },
      popupProps.value,
      getDisabledMountTransitionStyles(transitionStatus.value),
      elementProps.value,
    ]);
    Object.assign(merged, attributes);
    return merged;
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
            store.context.popupRef as any,
            setPopupElement as any,
            (el: any) => (floatingContext.value as any)?.update?.({floatingElement: el}),
            componentProps.ref as any,
          ),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface TooltipPopupState {
  /**
   * Whether the tooltip is currently open.
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
   * Whether transitions should be skipped.
   */
  instant: string | undefined;
  /**
   * The transition status of the component.
   */
  transitionStatus: any;
}

export interface TooltipPopupProps extends BaseUIComponentProps<'div', TooltipPopupState> {
  children?: any;
  [key: string]: any;
}

export namespace TooltipPopup {
  export type Props = TooltipPopupProps;
  export type State = TooltipPopupState;
}
