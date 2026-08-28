import { toRefs, unrefs } from 'actview';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { useTooltipPositionerContext } from '../positioner/TooltipPositionerContext';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { useHoverFloatingInteraction } from '@/floating-ui-react';
import { getDisabledMountTransitionStyles } from '@/internals/getDisabledMountTransitionStyles';
import { mergePropsN } from '@/merge-props';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * A container for the tooltip contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipPopup(componentProps: TooltipPopup.Props) {
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

  const state = (): TooltipPopupState => ({
    open: open.value,
    side: positionerContext?.side ?? ('bottom' as Side),
    align: positionerContext?.align ?? ('start' as Align),
    instant: instantType.value as any,
    transitionStatus: transitionStatus.value,
  });

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const stateValue = state();
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
        {...unrefs(elementProps)},
      ]);
      Object.assign(merged, attributes);
      return [merged];
    },
    state,
    className,
    style,
    render,
    refs: () => [
      store.context.popupRef as any,
      setPopupElement as any,
      (el: any) => (floatingContext.value as any)?.update?.({floatingElement: el}),
    ],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
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
