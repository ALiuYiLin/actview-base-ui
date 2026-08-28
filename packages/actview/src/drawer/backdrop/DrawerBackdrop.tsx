import { toRefs, unrefs } from 'actview';
import { useDialogRootContext } from '@/dialog/root/DialogRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * An overlay displayed beneath the Drawer popup.
 * Renders a `<div>` element.
 */
export function DrawerBackdrop(componentProps: DrawerBackdrop.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = useDialogRootContext(false);
  const {render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');

  const {element} = useRenderElement({
    props: () => {
      const elementPropsValue = unrefs(elementProps);
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
            position: 'fixed',
            inset: 0,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            ...(elementPropsValue.style ?? {}),
          },
          ...elementPropsValue,
          ...attributes,
        },
      ];
    },
    state: () => ({open: open.value, transitionStatus: transitionStatus.value}),
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: HTMLDivElement | null) => {
          store.context.backdropRef.value = el;
        },
      ];
      if (componentProps.ref !== undefined) {
        refs.push(refProp);
      }
      return refs;
    },
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface DrawerBackdropState {
  /**
   * Whether the Drawer is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface DrawerBackdropProps extends BaseUIComponentProps<'div', DrawerBackdropState> {
  children?: any;
  [key: string]: any;
}

export namespace DrawerBackdrop {
  export type State = DrawerBackdropState;
  export type Props = DrawerBackdropProps;
}
