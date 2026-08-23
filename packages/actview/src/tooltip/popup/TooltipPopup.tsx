import { defineComponent, toValue } from 'actview';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { useTooltipPositionerContext } from '../positioner/TooltipPositionerContext';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import { popupTransitionStateMapping } from '@/utils/popupStateMapping';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { useHoverFloatingInteraction } from '@/floating-ui-react';
import { getDisabledMountTransitionStyles } from '@/internals/getDisabledMountTransitionStyles';
import { mergePropsN } from '@/merge-props';

/**
 * A container for the tooltip contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export const TooltipPopup = defineComponent(function TooltipPopup(
  componentProps: TooltipPopup.Props,
) {
  const children = toValue(componentProps.children);

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

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;

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
      elementProps,
    ]);
    Object.assign(merged, attributes);

    const mergedRefs = (el: HTMLElement | null) => {
      store.context.popupRef.value = el;
      setPopupElement(el);
      (floatingContext.value as any)?.update?.({floatingElement: el});
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...stateValue, ref: mergedRefs} as any);
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
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{children}</Tag>;
    }
    return <div {...merged} ref={mergedRefs}>{children}</div>;
  };
});

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
