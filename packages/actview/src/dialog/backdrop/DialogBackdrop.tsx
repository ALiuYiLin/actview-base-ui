import { toRefs, unrefs } from 'actview';
import { useDialogRootContext } from '../root/DialogRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * An overlay displayed beneath the dialog popup.
 * Renders a `<div>` element.
 */
export function DialogBackdrop(componentProps: DialogBackdrop.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = useDialogRootContext(false);
  const {forceRender = false} = componentProps as any;
  const {render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const nested = store.useState('nested');
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
    state: () => ({
      open: open.value,
      transitionStatus: transitionStatus.value,
    }),
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
  // 嵌套对话框只渲染 root backdrop（除非 forceRender）——对齐 React 语义。
  return <>{!forceRender && nested.value ? null : element()}</>;
}

export interface DialogBackdropState {
  /**
   * Whether the dialog is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface DialogBackdropProps extends BaseUIComponentProps<'div', DialogBackdropState> {
  /**
   * Whether the backdrop is forced to render even when nested.
   * @default false
   */
  forceRender?: boolean | undefined;
  children?: any;
  [key: string]: any;
}

export namespace DialogBackdrop {
  export type State = DialogBackdropState;
  export type Props = DialogBackdropProps;
}
