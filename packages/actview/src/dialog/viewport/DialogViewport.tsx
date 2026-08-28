import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useDialogRootContext } from '../root/DialogRootContext';
import { usePopupViewport } from '@/utils/usePopupViewport';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A viewport for displaying content transitions.
 * Renders a `<div>` element.
 */
export function DialogViewport(componentProps: DialogViewport.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：store 的 useState 字段渲染期 `.value` 求值。
  const store = useDialogRootContext(false)!;
  const instantType = store.useState('instantType');

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  const {children: childrenToRender, state: viewportState} = usePopupViewport({
    store: store as any,
    side: undefined as any,
    children: componentProps.children,
  });

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<DialogViewportState>(() => ({
    activationDirection: viewportState.activationDirection,
    transitioning: viewportState.transitioning,
    instant: instantType.value as any,
  }));

  // 根元素 props：透传 + activation-direction data-*；children 用 viewport
  // 的 morphing 容器覆盖。
  const rootProps = computed<Record<string, any>>(() => {
    const merged: Record<string, any> = {...elementProps.value};
    if (state.value.activationDirection) {
      merged['data-activation-direction'] = state.value.activationDirection;
    }
    merged.children = childrenToRender.value;
    return merged;
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
          ref: useMergedRefs(
            (el: HTMLDivElement | null) => {
              store.state.viewportElement = el;
            },
            componentProps.ref as any,
          ),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface DialogViewportState {
  /**
   * The direction of the content transition.
   */
  activationDirection: string | undefined;
  /**
   * Whether the content is currently transitioning.
   */
  transitioning: boolean;
  /**
   * Whether transitions should be skipped.
   */
  instant: string | undefined;
}

export interface DialogViewportProps extends BaseUIComponentProps<'div', DialogViewportState> {
  children?: any;
  [key: string]: any;
}

export namespace DialogViewport {
  export type State = DialogViewportState;
  export type Props = DialogViewportProps;
}
