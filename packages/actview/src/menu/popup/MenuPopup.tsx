import { defineComponent, toValue } from 'actview';
import type { InteractionType } from '@/utils/useEnhancedClickHandler';
import { FloatingFocusManager, useHoverFloatingInteraction } from '@/floating-ui-react';
import { useMenuRootContext } from '../root/MenuRootContext';
import type { MenuRoot } from '../root/MenuRoot';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { popupTransitionStateMapping } from '@/utils/popupStateMapping';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { COMPOSITE_KEYS } from '@/internals/composite/composite';
import { getDisabledMountTransitionStyles } from '@/internals/getDisabledMountTransitionStyles';

/**
 * A container for the menu items.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export const MenuPopup = defineComponent(function MenuPopup(componentProps: MenuPopup.Props) {
  const {finalFocus} = componentProps;

  const children = toValue(componentProps.children);

  const {store} = useMenuRootContext();
  const positionerContext = useMenuPositionerContext();
  const {side, align} = positionerContext.value ?? {
    side: 'bottom' as const,
    align: 'start' as const,
  };

  const open = store.useState('open');
  const transitionStatus = store.useState('transitionStatus');
  const popupProps = store.useState('popupProps');
  const mounted = store.useState('mounted');
  const instantType = store.useState('instantType');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const parent = store.useState('parent');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const rootId = store.useState('rootId');
  const floatingContext = store.useState('floatingRootContext');
  const floatingTreeRoot = store.useState('floatingTreeRoot');
  const closeDelay = store.useState('closeDelay');
  const hoverEnabled = store.useState('hoverEnabled');
  const disabled = store.useState('disabled');
  const openMethod = store.useState('openMethod');

  const isContextMenu = parent.value.type === 'context-menu';

  useOpenChangeComplete({
    open,
    ref: store.context.popupRef,
    onComplete() {
      if (open.value) {
        store.context.onOpenChangeComplete?.(true);
      }
    },
  });

  const handleCloseEvent = (event: any) => {
    store.setOpen(false, createChangeEventDetails(event.reason, event.domEvent));
  };

  useHoverFloatingInteraction(floatingContext.value as any, {
    enabled:
      hoverEnabled.value &&
      !disabled.value &&
      !isContextMenu &&
      parent.value.type !== 'menubar',
    closeDelay: closeDelay.value,
  });

  const setPopupElement = store.useStateSetter('popupElement');

  const state = (): MenuPopupState => ({
    transitionStatus: transitionStatus.value,
    side: side as any,
    align: align as any,
    open: open.value,
    nested: parent.value.type === 'menu',
    instant: instantType.value as any,
  });

  // 订阅 floating tree 的 close 事件
  useTreeCloseEvents(floatingTreeRoot, handleCloseEvent);

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;

    const stateValue = state();
    const stateAttributes = popupTransitionStateMapping as any;
    const attributes: Record<string, string> = {};
    const openAttr = stateValue.open ? {'data-open': ''} : {'data-closed': ''};
    Object.assign(attributes, openAttr);
    if (stateValue.transitionStatus === 'starting') {
      attributes['data-starting-style'] = '';
    } else if (stateValue.transitionStatus === 'ending') {
      attributes['data-ending-style'] = '';
    }

    const merged: any = {};
    for (const prop of [
      popupProps.value,
      {
        onKeyDown(event: any) {
          if (insideToolbar && COMPOSITE_KEYS.has(event.key)) {
            event.stopPropagation();
          }
        },
      },
      getDisabledMountTransitionStyles(transitionStatus.value),
      elementProps,
      {'data-rootownerid': rootId.value},
    ]) {
      const resolved = typeof prop === 'function' ? prop(merged) : prop;
      Object.assign(merged, resolved);
    }
    Object.assign(merged, attributes);

    const mergedRefs = (el: HTMLElement | null) => {
      store.context.popupRef.value = el;
      setPopupElement(el);
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

    let returnFocus = parent.value.type === undefined || isContextMenu;
    if (
      activeTriggerElement.value ||
      (parent.value.type === 'menubar' && lastOpenChangeReason.value !== REASONS.outsidePress)
    ) {
      returnFocus = true;
    }

    const FocusManager = FloatingFocusManager as any;
    return (
      <FocusManager
        context={floatingContext.value as any}
        openInteractionType={openMethod.value as any}
        modal={isContextMenu}
        disabled={!mounted.value}
        returnFocus={finalFocus === undefined ? returnFocus : (finalFocus as any)}
        initialFocus={parent.value.type !== 'menu'}
        restoreFocus
        externalTree={parent.value.type !== 'menubar' ? floatingTreeRoot.value : undefined}
        previousFocusableElement={activeTriggerElement.value as HTMLElement | null}
        nextFocusableElement={
          parent.value.type === undefined
            ? (store.context.triggerFocusTargetRef as any)
            : undefined
        }
        beforeContentFocusGuardRef={
          parent.value.type === undefined
            ? (store.context.beforeContentFocusGuardRef as any)
            : undefined
        }
      >
        {element}
      </FocusManager>
    );
  };
});

// 简化：actview 无 useToolbarRootContext 的 menubar 场景，insideToolbar 恒 false
const insideToolbar = false;

import { useTreeCloseEvents } from './useTreeCloseEvents';

export interface MenuPopupProps extends BaseUIComponentProps<'div', MenuPopupState> {
  children?: any;
  /**
   * @ignore
   */
  id?: string | undefined;
  /**
   * Determines the element to focus when the menu is closed.
   */
  finalFocus?:
    | boolean
    | {current: HTMLElement | null}
    | ((closeType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
}

export interface MenuPopupState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * The side of the anchor the component is placed on.
   */
  side: 'top' | 'bottom' | 'left' | 'right' | 'inline-end' | 'inline-start';
  /**
   * The alignment of the component relative to the anchor.
   */
  align: 'start' | 'center' | 'end';
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
  /**
   * Whether the component is nested.
   */
  nested: boolean;
  /**
   * Whether transitions should be skipped.
   */
  instant: 'dismiss' | 'click' | 'group' | 'trigger-change' | undefined;
}

export namespace MenuPopup {
  export type Props = MenuPopupProps;
  export type State = MenuPopupState;
}
