import { defineComponent, toValue } from 'actview';
import { useDialogRootContext } from '../root/DialogRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { popupTransitionStateMapping } from '@/utils/popupStateMapping';
import type { TransitionStatus } from '@/internals/useTransitionStatus';

/**
 * An overlay displayed beneath the dialog popup.
 * Renders a `<div>` element.
 */
export const DialogBackdrop = defineComponent(function DialogBackdrop(
  componentProps: DialogBackdrop.Props,
) {
  const children = toValue(componentProps.children);

  const store = useDialogRootContext(false);
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const nested = store.useState('nested');
  const transitionStatus = store.useState('transitionStatus');

  return () => {
    const {forceRender = false, render, className, style, ...elementProps} = componentProps as any;

    // 嵌套对话框只渲染 root backdrop（除非 forceRender）——对齐 React 语义。
    if (!forceRender && nested.value) {
      return null;
    }

    const state: DialogBackdropState = {
      open: open.value,
      transitionStatus: transitionStatus.value,
    };

    const attributes: Record<string, string> = {};
    if (state.open) {
      attributes['data-open'] = '';
    } else {
      attributes['data-closed'] = '';
    }
    if (state.transitionStatus === 'starting') {
      attributes['data-starting-style'] = '';
    } else if (state.transitionStatus === 'ending') {
      attributes['data-ending-style'] = '';
    }

    const merged: any = {
      role: 'presentation',
      hidden: !mounted.value,
      style: {
        position: 'fixed',
        inset: 0,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        ...(elementProps.style ?? {}),
      },
      ...elementProps,
      ...attributes,
    };

    const mergedRefs = (el: HTMLDivElement | null) => {
      store.context.backdropRef.value = el;
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        (componentProps.ref as any).value = el;
        
      }
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...state, ref: mergedRefs} as any);
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
  };
});

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
