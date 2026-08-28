import {computed, ref, toRefs} from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { ToolbarGroupContext } from './ToolbarGroupContext';
import type { ToolbarRootState } from '../root/ToolbarRoot';

/**
 * A container for grouping a set of toolbar controls.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarGroup(componentProps: ToolbarGroup.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElement）。
  const rootRef = ref(null as HTMLElement | null);

  // context 载体直取（store-as-is）：getter 字段渲染期属性访问即追踪。
  const rootContext = useToolbarRootContext();

  // 渲染期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const disabled = computed(
    () => rootContext.disabled || (componentProps.disabled ?? false),
  );

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

  const state = computed<ToolbarRootState>(() => ({
    disabled: disabled.value,
    orientation: rootContext.orientation,
  }));

  const rootProps = computed<Record<string, any>>(() => ({role: 'group'}));

  // store-as-is 载体：身份稳定的 getter 对象——disabled 渲染期求值。
  const contextValue: ToolbarGroupContext = {
    get disabled() {
      return disabled.value;
    },
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <ToolbarGroupContext.Provider value={contextValue}>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          stateAttributesMapping: {},
          ref: useMergedRefs(rootRef, componentProps.ref as any),
          props: [rootProps.value, elementProps.value],
        },
      )}
    </ToolbarGroupContext.Provider>
  );
}

export interface ToolbarGroupState extends ToolbarRootState {}

export interface ToolbarGroupProps extends BaseUIComponentProps<'div', ToolbarGroupState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace ToolbarGroup {
  export type State = ToolbarGroupState;
  export type Props = ToolbarGroupProps;
}
