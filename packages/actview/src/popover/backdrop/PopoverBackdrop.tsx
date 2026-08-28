import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { REASONS } from '@/internals/reasons';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * An overlay displayed beneath the popover popup.
 * Renders a `<div>` element.
 */
export function PopoverBackdrop(componentProps: PopoverBackdrop.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：store 的 useState 字段渲染期 `.value` 求值。
  const store = usePopoverRootContext(false)!;
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');
  const lastOpenChangeReason = store.useState('openChangeReason');

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<PopoverBackdropState>(() => ({
    open: open.value,
    transitionStatus: transitionStatus.value,
  }));

  // 根元素 props：role/hidden/pointer-events 样式 → 透传 → open/transition
  // data-*。
  const rootProps = computed<Record<string, any>>(() => {
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
    return {
      role: 'presentation',
      hidden: !mounted.value,
      style: {
        pointerEvents:
          lastOpenChangeReason.value === REASONS.triggerHover ? 'none' : undefined,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      },
      ...elementProps.value,
      ...attributes,
    };
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          ref: componentProps.ref as any,
          props: rootProps.value,
        },
      )}
    </>
  );
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
