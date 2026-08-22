import { computed } from 'actview';
import { useMenuRootContext } from '@/menu/root/MenuRootContext';
import { useRenderElement } from '@/internals/useRenderElement';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { popupTransitionStateMapping } from '@/utils/popupStateMapping';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { useContextMenuRootContext } from '@/context-menu/root/ContextMenuRootContext';
import { REASONS } from '@/internals/reasons';
import { mergeProps } from '@/merge-props';

/**
 * An overlay displayed beneath the menu popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuBackdrop(componentProps: MenuBackdrop.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const rootContext = useMenuRootContext();
  const store = rootContext.value!.store;
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');

  const contextMenuContext = useContextMenuRootContext();

  const state = computed<MenuBackdropState>(() => ({
    open: open.value,
    transitionStatus: transitionStatus.value,
  }));

  const getElement = useRenderElement('div', componentProps, {
    ref: contextMenuContext.value?.backdropRef
      ? [componentProps.ref, contextMenuContext.value.backdropRef]
      : componentProps.ref,
    state,
    stateAttributesMapping: popupTransitionStateMapping,
    props: [
      (prev: any) =>
        mergeProps(prev, {
          role: 'presentation',
          hidden: !mounted.value,
          style: {
            pointerEvents: lastOpenChangeReason.value === REASONS.triggerHover ? 'none' : undefined,
            userSelect: 'none',
            WebkitUserSelect: 'none',
          },
        }) as HTMLProps,
      (prev: any) => mergeProps(prev, elementProps) as HTMLProps,
    ],
  });

  return <>{getElement()}</>;
}

export interface MenuBackdropState {
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface MenuBackdropProps extends BaseUIComponentProps<'div', MenuBackdropState> {}

export namespace MenuBackdrop {
  export type State = MenuBackdropState;
  export type Props = MenuBackdropProps;
}
