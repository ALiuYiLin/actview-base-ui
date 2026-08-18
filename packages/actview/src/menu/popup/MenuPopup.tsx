import { computed, watch } from 'actview';
import type { VNode } from '@actview/jsx';
import type { InteractionType } from '@base-ui/actview-utils/useEnhancedClickHandler';
import { FloatingFocusManager, useHoverFloatingInteraction } from '../../floating-ui-actview';
import { useMenuRootContext } from '../root/MenuRootContext';
import type { MenuRoot } from '../root/MenuRoot';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import type { Side, Align } from '../../internals/useAnchorPositioning';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { popupTransitionStateMapping } from '../../utils/popupStateMapping';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useToolbarRootContext } from '../../toolbar/root/ToolbarRootContext';
import { COMPOSITE_KEYS } from '../../internals/composite/composite';
import { getDisabledMountTransitionStyles } from '../../internals/getDisabledMountTransitionStyles';
import { mergeProps } from '../../merge-props';

/**
 * A container for the menu items.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuPopup(componentProps: MenuPopup.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    finalFocus,
    ...elementProps
  } = componentProps;

  const rootContext = useMenuRootContext();
  const store = rootContext.value!.store;
  const positionerContext = useMenuPositionerContext();
  const insideToolbar = useToolbarRootContext(true).value != null;

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

  const isContextMenu = computed(() => parent.value.type === 'context-menu');

  useOpenChangeComplete({
    open,
    ref: store.context.popupRef,
    onComplete() {
      if (open.value) {
        store.context.onOpenChangeComplete?.(true);
      }
    },
  });

  watch(
    () => floatingTreeRoot.value,
    () => {
      function handleClose(event: {
        domEvent: Event | undefined;
        reason: MenuRoot.ChangeEventReason;
      }) {
        store.setOpen(false, createChangeEventDetails(event.reason, event.domEvent));
      }

      floatingTreeRoot.value.events.on('close', handleClose);

      return () => {
        floatingTreeRoot.value.events.off('close', handleClose);
      };
    },
    { immediate: true },
  );

  useHoverFloatingInteraction(floatingContext.value, {
    enabled: computed(
      () =>
        hoverEnabled.value &&
        !disabled.value &&
        !isContextMenu.value &&
        parent.value.type !== 'menubar',
    ) as unknown as boolean,
    closeDelay: () => closeDelay.value,
  });

  const setPopupElement = store.useStateSetter('popupElement');

  const state = computed<MenuPopupState>(() => ({
    transitionStatus: transitionStatus.value,
    side: positionerContext.value.side.value,
    align: positionerContext.value.align.value,
    open: open.value,
    nested: parent.value.type === 'menu',
    instant: instantType.value,
  }));

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: [componentProps.ref, store.context.popupRef, setPopupElement],
    stateAttributesMapping: popupTransitionStateMapping,
    props: [
      // Merge (not spread) so `popupProps`'s handlers (keyboard relay etc.) chain with later
      // props (AD-20/AD-27).
      (prev: any) => mergeProps(prev, popupProps.value) as HTMLProps,
      // Must merge, not spread, or `popupProps`'s `onKeyDown` (keyboard relay) would be replaced
      // (getters replace prev without event chaining — AD-20).
      (prev: any) =>
        mergeProps(prev, {
          onKeyDown(event: KeyboardEvent) {
            if (insideToolbar && COMPOSITE_KEYS.has(event.key)) {
              event.stopPropagation();
            }
          },
        }) as HTMLProps,
      (prev: any) => ({
        ...prev,
        ...getDisabledMountTransitionStyles(transitionStatus.value),
      }),
      elementProps,
      { 'data-rootownerid': rootId.value } as HTMLProps,
    ],
  });

  const returnFocus = computed(() => {
    let shouldReturnFocus = parent.value.type === undefined || isContextMenu.value;
    if (
      activeTriggerElement.value ||
      (parent.value.type === 'menubar' && lastOpenChangeReason.value !== REASONS.outsidePress)
    ) {
      shouldReturnFocus = true;
    }
    return shouldReturnFocus;
  });

  const resolvedFinalFocus = computed(() => (finalFocus === undefined ? returnFocus.value : finalFocus));

  // The focus manager's `disabled` is a mount-time snapshot in the ActView port, so it must be
  // conditionally mounted only while the popup is mounted (plantform-diff.md AD-28).
  const shouldRenderFocusManager = computed(() => mounted.value);

  return (
    <>
      {shouldRenderFocusManager.value ? (
        <FloatingFocusManager
          context={floatingContext.value}
          openInteractionType={openMethod.value}
          modal={isContextMenu.value}
          disabled={false}
          returnFocus={resolvedFinalFocus.value}
          initialFocus={parent.value.type !== 'menu'}
          restoreFocus
          externalTree={parent.value.type !== 'menubar' ? floatingTreeRoot.value : undefined}
          previousFocusableElement={activeTriggerElement.value as HTMLElement | null}
          nextFocusableElement={
            parent.value.type === undefined ? store.context.triggerFocusTargetRef : undefined
          }
          beforeContentFocusGuardRef={
            parent.value.type === undefined ? store.context.beforeContentFocusGuardRef : undefined
          }
        >
          {getElement() as VNode}
        </FloatingFocusManager>
      ) : (
        getElement()
      )}
    </>
  );
}

export interface MenuPopupProps extends BaseUIComponentProps<'div', MenuPopupState> {
  children?: any;
  /**
   * @ignore
   */
  id?: string | undefined;
  /**
   * Determines the element to focus when the menu is closed.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (trigger or previously focused element).
   * - `RefObject`: Move focus to the ref element.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, or `false`/`undefined` to do nothing.
   */
  finalFocus?:
    | boolean
    | { current: HTMLElement | null; value?: HTMLElement | null }
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
  side: Side;
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
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
