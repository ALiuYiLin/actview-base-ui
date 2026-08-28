import {computed, toRefs} from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { ToolbarRootState } from '../root/ToolbarRoot';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { useToolbarGroupContext } from '../group/ToolbarGroupContext';
import { CompositeItem } from '@/internals/composite/item/CompositeItem';
import { useFocusableWhenDisabled } from '@/utils/useFocusableWhenDisabled';

/**
 * A text input that can be used in the toolbar.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarInput(componentProps: ToolbarInput.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：getter 字段渲染期属性访问即追踪。
  const rootContext = useToolbarRootContext();
  const groupContext = useToolbarGroupContext();

  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const disabled = computed(
    () =>
      rootContext.disabled ||
      (groupContext?.disabled ?? false) ||
      (componentProps.disabled ?? false),
  );
  const focusableWhenDisabled = computed(
    () => componentProps.focusableWhenDisabled ?? true,
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

  const itemMetadata = computed(() => ({
    disabled: disabled.value,
    focusableWhenDisabled: focusableWhenDisabled.value,
  }));

  const {props: focusableWhenDisabledProps} = useFocusableWhenDisabled({
    composite: true,
    disabled,
    focusableWhenDisabled,
    isNativeButton: false,
  });

  const state = computed<ToolbarInputState>(() => ({
    disabled: disabled.value,
    orientation: rootContext.orientation,
    focusable: focusableWhenDisabled.value,
  }));

  // 事件 handler：setup 闭包读 computed——事件触发时拿到实时值。
  const preventWhenDisabled = (event: any) => {
    if (disabled.value) {
      event.preventDefault();
    }
  };

  const rootProps = computed<Record<string, any>>(() => ({
    onClick: preventWhenDisabled,
    onPointerDown: preventWhenDisabled,
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <CompositeItem
      tag="input"
      render={render as any}
      className={className as any}
      style={style as any}
      metadata={itemMetadata.value as any}
      state={state.value as any}
      refs={[]}
      props={[rootProps.value, elementProps.value, focusableWhenDisabledProps.value]}
    />
  );
}

export interface ToolbarInputState extends ToolbarRootState {
  /**
   * Whether the component is disabled.
   */
  disabled: boolean;
  /**
   * Whether the component remains focusable when disabled.
   */
  focusable: boolean;
}

export interface ToolbarInputProps extends BaseUIComponentProps<'input', ToolbarInputState> {
  /**
   * When `true` the item is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * When `true` the item remains focusable when disabled.
   * @default true
   */
  focusableWhenDisabled?: boolean | undefined;
}

export namespace ToolbarInput {
  export type State = ToolbarInputState;
  export type Props = ToolbarInputProps;
}
