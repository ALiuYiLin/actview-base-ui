import { toRefs, unrefs } from 'actview';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { REASONS } from '@/internals/reasons';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * An overlay displayed beneath the popover popup.
 * Renders a `<div>` element.
 */
export function PopoverBackdrop(componentProps: PopoverBackdrop.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = usePopoverRootContext(false);
  const {render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');
  const lastOpenChangeReason = store.useState('openChangeReason');

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
        },
        unrefs(elementProps),
        attributes,
      ];
    },
    state: () => ({
      open: open.value,
      transitionStatus: transitionStatus.value,
    }),
    className,
    style,
    render,
    refs: () => (componentProps.ref !== undefined ? [refProp as any] : []),
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface PopoverBackdropState {
  /**
   * Whether the popover is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface PopoverBackdropProps extends BaseUIComponentProps<'div', PopoverBackdropState> {
  children?: any;
  [key: string]: any;
}

export namespace PopoverBackdrop {
  export type State = PopoverBackdropState;
  export type Props = PopoverBackdropProps;
}
