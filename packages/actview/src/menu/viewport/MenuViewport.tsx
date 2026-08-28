import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { usePopupViewport } from '@/utils/usePopupViewport';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A viewport for displaying content transitions.
 * This component is only required if one popup can be opened by multiple triggers, its content
 * changes based on the trigger, and switching between them is animated.
 * Renders a `<div>` element.
 */
export function MenuViewport(componentProps: MenuViewport.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：getter 字段渲染期属性访问即追踪。
  const {store} = useMenuRootContext();
  const positionerContext = useMenuPositionerContext(true);
  const side = positionerContext?.side;

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  const instantType = store.useState('instantType');

  // children 以 computed 传入（render 期求值 props）：payload 驱动的
  // viewport 内容在 trigger 切换后更新，setup 快照会停留首次渲染。
  // 函数型 children 无参调用（对齐原 toValue 语义）。
  const childrenRef = computed(() =>
    typeof componentProps.children === 'function'
      ? componentProps.children()
      : componentProps.children,
  );

  const {children: childrenToRender, state: viewportState} = usePopupViewport({
    store: store as any,
    side,
    children: childrenRef,
  });

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<MenuViewportState>(() => ({
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
          ref: componentProps.ref as any,
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface MenuViewportState {
  /**
   * The activation direction of the transitioned content.
   */
  activationDirection: string | undefined;
  /**
   * Whether the viewport is currently transitioning between contents.
   */
  transitioning: boolean;
  /**
   * Present if animations should be instant.
   */
  instant: 'dismiss' | 'click' | 'group' | 'trigger-change' | undefined;
}

export interface MenuViewportProps {
  /**
   * The content to render inside the transition container.
   */
  children?: any;
  [key: string]: any;
}

export namespace MenuViewport {
  export type State = MenuViewportState;
  export type Props = MenuViewportProps;
}
