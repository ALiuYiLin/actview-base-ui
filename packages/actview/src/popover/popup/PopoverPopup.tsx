import { defineComponent, toValue } from 'actview';
import type { InteractionType } from '@/utils/useEnhancedClickHandler';
import { FloatingFocusManager, useHoverFloatingInteraction } from '@/floating-ui-react';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { usePopoverPositionerContext } from '../positioner/PopoverPositionerContext';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { popupTransitionStateMapping } from '@/utils/popupStateMapping';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { REASONS } from '@/internals/reasons';
import { getDisabledMountTransitionStyles } from '@/internals/getDisabledMountTransitionStyles';
import { mergePropsN } from '@/merge-props';

/**
 * A container for the popover contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export const PopoverPopup = defineComponent(function PopoverPopup(
  componentProps: PopoverPopup.Props,
) {
  const {finalFocus, initialFocus} = componentProps;
  const children = toValue(componentProps.children);

  const store = usePopoverRootContext(false);
  const positioner = usePopoverPositionerContext();

  const open = store.useState('open');
  const openMethod = store.useState('openMethod');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const popupProps = store.useState('popupProps');
  const titleId = store.useState('titleElementId');
  const descriptionId = store.useState('descriptionElementId');
  const modal = store.useState('modal');
  const mounted = store.useState('mounted');
  const openReason = store.useState('openChangeReason');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const floatingContext = store.useState('floatingRootContext');
  const floatingId = (floatingContext.value as any)?.useState('floatingId');
  const disabled = store.useState('disabled');
  const openOnHover = store.useState('openOnHover');
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
    enabled: openOnHover.value && !disabled.value,
    closeDelay: closeDelay.value,
  });

  // actview 简化：modal 焦点管理不要求渲染 Popover.Close（react 版通过
  // ClosePartContext 计数决定 focusManagerModal）。
  const focusManagerModal = modal.value !== false;

  const setPopupElement = store.useStateSetter('popupElement');

  const state = (): PopoverPopupState => ({
    open: open.value,
    side: positioner?.side ?? ('bottom' as Side),
    align: positioner?.align ?? ('start' as Align),
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
      popupProps.value,
      {
        id: floatingId?.value,
        role: 'dialog',
        tabIndex: -1,
        'aria-labelledby': titleId.value,
        'aria-describedby': descriptionId.value,
      },
      getDisabledMountTransitionStyles(transitionStatus.value),
      elementProps,
    ]);
    Object.assign(merged, attributes);

    const mergedRefs = (el: HTMLElement | null) => {
      store.context.popupRef.value = el;
      setPopupElement(el);
      (floatingContext.value as any)?.update?.({floatingElement: el});
    };

    const element = (() => {
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
    })();

    const FocusManager = FloatingFocusManager as any;
    return (
      <FocusManager
        context={floatingContext.value as any}
        openInteractionType={openMethod.value as any}
        modal={focusManagerModal}
        disabled={!mounted.value || openReason.value === REASONS.triggerHover}
        initialFocus={(initialFocus === undefined ? true : initialFocus) as any}
        returnFocus={finalFocus === undefined ? true : finalFocus}
        restoreFocus="popup"
        previousFocusableElement={activeTriggerElement.value as HTMLElement | null}
        nextFocusableElement={store.context.triggerFocusTargetRef}
        beforeContentFocusGuardRef={store.context.beforeContentFocusGuardRef}
      >
        {element}
      </FocusManager>
    );
  };
});

export interface PopoverPopupState {
  /**
   * Whether the popover is currently open.
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
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * Whether transitions should be skipped.
   */
  instant: 'dismiss' | 'click' | 'focus' | 'trigger-change' | undefined;
}

export interface PopoverPopupProps extends BaseUIComponentProps<'div', PopoverPopupState> {
  children?: any;
  /**
   * Determines the element to focus when the popover is closed.
   */
  finalFocus?:
    | boolean
    | {current: HTMLElement | null}
    | {value: HTMLElement | null}
    | ((closeType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
  [key: string]: any;
}

export namespace PopoverPopup {
  export type Props = PopoverPopupProps;
  export type State = PopoverPopupState;
}
