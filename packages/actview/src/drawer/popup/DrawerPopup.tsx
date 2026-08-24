import { defineComponent, computed, ref, toValue } from 'actview';
import { FloatingFocusManager } from '@/floating-ui-react';
import { useDialogRootContext } from '@/dialog/root/DialogRootContext';
import { useDialogPortalContext } from '../portal/DrawerPortalContext';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { COMPOSITE_KEYS } from '@/internals/composite/composite';
import { getDisabledMountTransitionStyles } from '@/internals/getDisabledMountTransitionStyles';
import { mergePropsN } from '@/merge-props';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import type { Ref } from 'actview';

/**
 * A container for the Drawer contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/Drawer)
 */
export const DrawerPopup = defineComponent(function DrawerPopup(
  componentProps: DrawerPopup.Props,
) {
  const {finalFocus, initialFocus} = componentProps;
  const children = toValue(componentProps.children);

  const store = useDialogRootContext(false);
  useDialogPortalContext();

  const descriptionElementId = store.useState('descriptionElementId');
  const floatingRootContext = store.useState('floatingRootContext');
  const rootPopupProps = store.useState('popupProps');
  const modal = store.useState('modal');
  const mounted = store.useState('mounted');
  const nestedOpenDrawerCount = store.useState('nestedOpenDrawerCount');
  const open = store.useState('open');
  const openMethod = store.useState('openMethod');
  const titleElementId = store.useState('titleElementId');
  const transitionStatus = store.useState('transitionStatus');
  const role = store.useState('role');
  const floatingId = (floatingRootContext.value as any)?.useState('floatingId');

  useOpenChangeComplete({
    open,
    ref: store.context.popupRef,
    onComplete() {
      if (open.value) {
        store.context.onOpenChangeComplete?.(true);
      }
    },
  });

  const setPopupElement = store.useStateSetter('popupElement');

  // actview 版：floatingElement 通过 useSyncedValue 同步（与 useFloating 相同链），
  // 保证 FFM 的 focus-on-open watch 能观察到 floatingElement 变化。
  const localFloatingElement = ref<HTMLElement | null | undefined>(undefined);
  const syncedFloatingElement = computed(() =>
    localFloatingElement.value === undefined ? null : localFloatingElement.value,
  );
  (floatingRootContext.value as any)?.useSyncedValue?.('floatingElement', syncedFloatingElement as any);

  const state = (): DrawerPopupState => ({
    open: open.value,
    nested: (store.useState('nested') as any).value,
    transitionStatus: transitionStatus.value,
    nestedDrawerOpen: nestedOpenDrawerCount.value > 0,
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
      rootPopupProps.value,
      {
        id: floatingId?.value,
        'aria-labelledby': titleElementId.value,
        'aria-describedby': descriptionElementId.value,
        'aria-modal': modal.value !== false ? 'true' : undefined,
        role: role.value,
        tabIndex: -1,
        hidden: !mounted.value,
        onKeyDown(event: any) {
          if (COMPOSITE_KEYS.has(event.key)) {
            event.stopPropagation();
          }
        },
        style: {
          '--nested-Drawers': nestedOpenDrawerCount.value,
        },
      },
      getDisabledMountTransitionStyles(transitionStatus.value),
      elementProps,
    ]);
    Object.assign(merged, attributes);

    const mergedRefs = (el: HTMLElement | null) => {
      store.context.popupRef.value = el;
      setPopupElement(el);
      localFloatingElement.value = el;
      (floatingRootContext.value as any)?.update?.({floatingElement: el});
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
        context={floatingRootContext.value as any}
        openInteractionType={openMethod.value as any}
        disabled={!mounted.value}
        closeOnFocusOut
        initialFocus={
          (initialFocus === undefined ? true : initialFocus) as any
        }
        returnFocus={finalFocus === undefined ? true : finalFocus}
        modal={modal.value !== false}
        restoreFocus="popup"
      >
        {element}
      </FocusManager>
    );
  };
});

export interface DrawerPopupState {
  /**
   * Whether the Drawer is currently open.
   */
  open: boolean;
  /**
   * Whether the component is nested.
   */
  nested: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * Whether there are any open nested Drawers.
   */
  nestedDrawerOpen: boolean;
}

export interface DrawerPopupProps extends BaseUIComponentProps<'div', DrawerPopupState> {
  children?: any;
  /**
   * Determines the element to focus when the Drawer is closed.
   */
  finalFocus?:
    | boolean
    | Ref<HTMLElement | null>
    | {value: HTMLElement | null}
    | ((closeType: any) => boolean | HTMLElement | null | void)
    | undefined;
  /**
   * Determines the element to focus when the Drawer is opened.
   */
  initialFocus?:
    | boolean
    | HTMLElement
    | Ref<HTMLElement | null>
    | {value: HTMLElement | null}
    | ((interactionType: any) => boolean | HTMLElement | null | void)
    | undefined;
  [key: string]: any;
}

export namespace DrawerPopup {
  export type Props = DrawerPopupProps;
  export type State = DrawerPopupState;
}
