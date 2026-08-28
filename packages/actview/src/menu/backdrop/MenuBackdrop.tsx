import { toRefs, unrefs } from 'actview';
import { useMenuRootContext } from '../root/MenuRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { useContextMenuRootContext } from '@/context-menu/root/ContextMenuRootContext';
import { REASONS } from '@/internals/reasons';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * An overlay displayed beneath the menu popup.
 * Renders a `<div>` element.
 */
export function MenuBackdrop(componentProps: MenuBackdrop.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {render, className, style, children, ref, ...elementProps} = toRefs(componentProps);

  const {store} = useMenuRootContext();
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');

  const contextMenuContext = useContextMenuRootContext();

  const {element} = useRenderElement({
    props: () => {
      const attributes: Record<string, string> = {};
      if (open.value) {
        attributes['data-open'] = '';
      } else {
        attributes['data-closed'] = '';
      }
      if (transitionStatus.value === 'starting') {
        attributes['data-starting-style'] = '';
      } else if (transitionStatus.value === 'ending') {
        attributes['data-ending-style'] = '';
      }
      return [
        {
          role: 'presentation',
          hidden: !mounted.value,
          style: {
            pointerEvents:
              lastOpenChangeReason.value === REASONS.triggerHover ? 'none' : undefined,
            userSelect: 'none',
            WebkitUserSelect: 'none',
          },
          ...attributes,
        },
        unrefs(elementProps),
      ];
    },
    state: (): MenuBackdropState => ({
      open: open.value,
      transitionStatus: transitionStatus.value,
    }),
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: HTMLDivElement | null) => {
          if (contextMenuContext?.backdropRef) {
            contextMenuContext.backdropRef.value = el;
          }
        },
      ];
      if (componentProps.ref !== undefined) {
        refs.push(ref);
      }
      return refs;
    },
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
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
