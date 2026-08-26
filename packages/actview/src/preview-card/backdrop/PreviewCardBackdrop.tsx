import { toRefs, unrefs } from 'actview';
import { usePreviewCardRootContext } from '../root/PreviewCardRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { REASONS } from '@/internals/reasons';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * An overlay displayed beneath the preview-card popup.
 * Renders a `<div>` element.
 */
export function PreviewCardBackdrop(componentProps: PreviewCardBackdrop.Props) {
  const store = usePreviewCardRootContext(false);
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');
  const lastOpenChangeReason = store.useState('openChangeReason');

  const state = (): PreviewCardBackdropState => ({
    open: open.value,
    transitionStatus: transitionStatus.value,
  });

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ref: refProp, ...elementProps} = toRefs(
    componentProps,
  );

  const {element} = useRenderElement({
    props: () => {
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

      const merged: any = {
        role: 'presentation',
        hidden: !mounted.value,
        style: {
          pointerEvents: lastOpenChangeReason.value === REASONS.triggerHover ? 'none' : undefined,
          userSelect: 'none',
          WebkitUserSelect: 'none',
        },
        ...unrefs(elementProps),
        ...attributes,
      };
      return [merged];
    },
    state,
    className,
    style,
    render,
    refs: () => [refProp as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface PreviewCardBackdropState {
  /**
   * Whether the preview-card is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface PreviewCardBackdropProps extends BaseUIComponentProps<'div', PreviewCardBackdropState> {
  children?: any;
  [key: string]: any;
}

export namespace PreviewCardBackdrop {
  export type State = PreviewCardBackdropState;
  export type Props = PreviewCardBackdropProps;
}
