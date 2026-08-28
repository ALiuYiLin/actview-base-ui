import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useDialogRootContext } from '../root/DialogRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * An overlay displayed beneath the dialog popup.
 * Renders a `<div>` element.
 */
export function DialogBackdrop(componentProps: DialogBackdrop.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：store 的 useState 字段渲染期 `.value` 求值。
  const store = useDialogRootContext(false)!;
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const nested = store.useState('nested');
  const transitionStatus = store.useState('transitionStatus');

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

  const state = computed<DialogBackdropState>(() => ({
    open: open.value,
    transitionStatus: transitionStatus.value,
  }));

  // 根元素 props：role/hidden/fixed 样式 → 透传 → open/transition data-*。
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
        position: 'fixed',
        inset: 0,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        ...(elementProps.value.style ?? {}),
      },
      ...elementProps.value,
      ...attributes,
    };
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 嵌套对话框只渲染 root backdrop（除非 forceRender）——对齐 React 语义。
  // 条件在渲染期求值（表达式内 .value 直读，无 IIFE）。
  return (
    <>
      {!(componentProps.forceRender ?? false) && nested.value
        ? null
        : useRenderElement(
            'div',
            {
              className: className?.value,
              render: render?.value,
              style: style?.value,
            },
            {
              state: state.value,
              ref: useMergedRefs(
                (el: HTMLDivElement | null) => {
                  store.context.backdropRef.value = el;
                },
                componentProps.ref as any,
              ),
              props: rootProps.value,
            },
          )}
    </>
  );
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
