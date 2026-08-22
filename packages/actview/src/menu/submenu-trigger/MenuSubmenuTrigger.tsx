import { computed } from 'actview';
import { platform } from '@base-ui/actview-utils/platform';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import { safePolygon, useClick, useHoverReferenceInteraction } from '@/floating-ui-actview';
import type { BaseUIComponentProps, HTMLProps, NonNativeButtonProps } from '@/internals/types';
import { useMenuRootContext } from '@/menu/root/MenuRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { triggerOpenStateMapping } from '@/utils/popupStateMapping';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { useMenuItem } from '@/menu/item/useMenuItem';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMenuPositionerContext } from '@/menu/positioner/MenuPositionerContext';
import { useTriggerRegistration } from '@/utils/popups';
import { useMenuSubmenuRootContext } from '@/menu/submenu-root/MenuSubmenuRootContext';
import { REASONS } from '@/internals/reasons';
import { mergeProps } from '@/merge-props';

const VOICE_OVER_EXPANDED_PROPS = { 'aria-expanded': undefined };

/**
 * A menu item that opens a submenu.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuSubmenuTrigger(componentProps: MenuSubmenuTrigger.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    label,
    id: idProp,
    nativeButton = false,
    openOnHover = true,
    delay = 100,
    closeDelay = 0,
    disabled: disabledProp = false,
    ...elementProps
  } = componentProps;

  const submenuRootContext = useMenuSubmenuRootContext();
  if (!submenuRootContext.value?.parentMenu) {
    throw new Error('Base UI: <Menu.SubmenuTrigger> must be placed in <Menu.SubmenuRoot>.');
  }

  const listItem = useCompositeListItem({ guess: true, label });
  const menuPositionerContext = useMenuPositionerContext();

  const rootContext = useMenuRootContext();
  const store = rootContext.value!.store;

  const thisTriggerId = useBaseUiId(idProp);
  const open = store.useState('open');
  const floatingRootContext = store.useState('floatingRootContext');
  const floatingTreeRoot = store.useState('floatingTreeRoot');
  const popupId = store.useState('triggerPopupId', thisTriggerId);

  const baseRegisterTrigger = useTriggerRegistration(thisTriggerId, store);
  // Stable, so the merged ref on the rendered element keeps its identity for the trigger's whole
  // lifetime; the latest `closeDelay` is read when it runs.
  const registerTrigger = (element: Element | null) => {
    baseRegisterTrigger(element);

    if (element !== null && store.select('open') && store.select('activeTriggerId') == null) {
      store.update({
        activeTriggerId: thisTriggerId ?? null,
        activeTriggerElement: element,
        closeDelay,
      });
    }
  };

  const triggerElementRef = { current: null as HTMLElement | null };
  const handleTriggerElementRef = (el: HTMLElement | null) => {
    triggerElementRef.current = el;
    store.set('activeTriggerElement', el);
  };

  // A stable ref does not re-fire when the id changes, so register the rendered element here
  // instead. On React 17 the id also starts out `undefined`, so this is what registers the trigger
  // at all.
  useIsoLayoutEffect(() => {
    registerTrigger(triggerElementRef.current);
    return () => registerTrigger(null);
  });

  store.useSyncedValue('closeDelay', closeDelay);

  const parentMenuStore = submenuRootContext.value.parentMenu;
  const rootDisabled = store.useState('disabled');
  const parentDisabled = parentMenuStore.useState('disabled');
  const disabled = computed(() => disabledProp || rootDisabled.value || parentDisabled.value);

  const itemProps = parentMenuStore.useState('itemProps');
  const highlighted = parentMenuStore.useState('isActive', listItem.index.value);

  const itemMetadata = {
    type: 'submenu-trigger' as const,
    setActive() {
      if (parentMenuStore.select('highlightItemOnHover')) {
        parentMenuStore.set('activeIndex', listItem.index.value);
      }
    },
  };

  const nodeId = () => menuPositionerContext.value?.context.nodeId;

  const { getItemProps, itemRef } = useMenuItem({
    closeOnClick: false,
    disabled: () => disabled.value,
    highlighted: () => highlighted.value,
    id: thisTriggerId,
    store,
    typingRef: parentMenuStore.context.typingRef,
    nativeButton,
    itemMetadata,
    nodeId,
  });

  const hoverEnabled = store.useState('hoverEnabled');

  const hoverProps = useHoverReferenceInteraction(floatingRootContext.value, {
    enabled: computed(() => hoverEnabled.value && openOnHover && !disabled.value) as unknown as boolean,
    handleClose: safePolygon({ blockPointerEvents: true }),
    mouseOnly: true,
    move: true,
    restMs: delay,
    delay: { open: delay, close: closeDelay },
    shouldOpen: delay > 0 ? () => parentMenuStore.select('allowMouseEnter') : undefined,
    triggerElementRef,
    externalTree: floatingTreeRoot.value,
    isClosing: () => store.select('transitionStatus') === 'ending',
    // Chrome can drop the trigger's `mouseleave` during a fast pointer sweep,
    // leaving a stale submenu open (see #5152) — cancel from `mouseout` too.
    guardStaleOpen: true,
  });

  const click = useClick(floatingRootContext.value, {
    enabled: !disabled.value,
    event: 'mousedown',
    toggle: !openOnHover,
    ignoreMouse: openOnHover,
    stickIfOpen: false,
  });

  const localInteractionProps = click.reference ?? {};

  const rootTriggerProps = store.useState('triggerProps', true);

  const state = computed<MenuSubmenuTriggerState>(() => ({
    disabled: disabled.value,
    highlighted: highlighted.value,
    open: open.value,
  }));

  const openMethod = store.useState('openMethod');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  // Arrow keys open the submenu through list navigation without dispatching a click, so
  // `openMethod` stays null there; Enter and Space do dispatch one and report `keyboard`.
  const openedByKeyboard = computed(
    () => lastOpenChangeReason.value === REASONS.listNavigation || openMethod.value === 'keyboard',
  );
  const shouldOmitExpanded = computed(
    () => open.value && openedByKeyboard.value && platform.screenReader.voiceOver,
  );

  const getElement = useRenderElement('div', componentProps, {
    state,
    stateAttributesMapping: triggerOpenStateMapping,
    props: [
      localInteractionProps,
      hoverProps,
      (prev: any) => {
        const { id: _id, ...rest } = rootTriggerProps.value;
        // Merge (not spread) so the trigger's own `onMouseDown`/`onClick` from `click.reference`
        // survive — spreading would replace them (getters replace prev without event chaining).
        return mergeProps(prev, rest) as HTMLProps;
      },
      (prev: any) => mergeProps(prev, itemProps.value) as HTMLProps,
      // Opening a submenu changes the trigger's expanded state while the trigger still holds
      // focus, and VoiceOver announces that state change instead of the submenu item that focus
      // moves to a moment later, so the first item is never announced. Dropping the state while
      // the submenu is open avoids the announcement without claiming the submenu is collapsed;
      // `aria-haspopup` still conveys that the item opens a submenu.
      (prev: any) => (shouldOmitExpanded.value ? { ...prev, ...VOICE_OVER_EXPANDED_PROPS } : prev),
      (prev: any) =>
        mergeProps(prev, {
          'aria-controls': popupId.value,
          tabIndex: open.value || highlighted.value ? 0 : -1,
          onBlur() {
            if (highlighted.value) {
              parentMenuStore.set('activeIndex', null);
            }
          },
        }) as HTMLProps,
      elementProps,
      getItemProps,
    ],
    ref: [componentProps.ref, listItem.ref, itemRef, registerTrigger, handleTriggerElementRef],
  });

  return <>{getElement()}</>;
}

export interface MenuSubmenuTriggerState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
}

export interface MenuSubmenuTriggerProps
  extends NonNativeButtonProps, BaseUIComponentProps<'div', MenuSubmenuTriggerState> {
  onClick?: BaseUIComponentProps<'div', MenuSubmenuTriggerState>['onClick'] | undefined;
  /**
   * Overrides the text label to use when the item is matched during keyboard text navigation.
   */
  label?: string | undefined;
  /**
   * @ignore
   */
  id?: string | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * How long to wait before the menu may be opened on hover. Specified in milliseconds.
   *
   * Requires the `openOnHover` prop.
   * @default 100
   */
  delay?: number | undefined;
  /**
   * How long to wait before closing the menu that was opened on hover.
   * Specified in milliseconds.
   *
   * Requires the `openOnHover` prop.
   * @default 0
   */
  closeDelay?: number | undefined;
  /**
   * Whether the menu should also open when the trigger is hovered.
   */
  openOnHover?: boolean | undefined;
}

export namespace MenuSubmenuTrigger {
  export type Props = MenuSubmenuTriggerProps;
  export type State = MenuSubmenuTriggerState;
}
