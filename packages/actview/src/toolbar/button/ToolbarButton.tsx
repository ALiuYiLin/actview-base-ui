import {computed, toRefs} from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useButton } from '@/internals/use-button/useButton';
import type { ToolbarRootState } from '../root/ToolbarRoot';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { useToolbarGroupContext } from '../group/ToolbarGroupContext';
import { CompositeItem } from '@/internals/composite/item/CompositeItem';
import { EMPTY_OBJECT } from '@/utils/empty';

/**
 * A button that can be used as-is or as a trigger for other components.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarButton(componentProps: ToolbarButton.Props) {
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
  const nativeButton = computed(() => componentProps.nativeButton);

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

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    focusableWhenDisabled: focusableWhenDisabled.value,
    native: nativeButton.value,
  });

  const state = computed<ToolbarButtonState>(() => ({
    disabled: disabled.value,
    orientation: rootContext.orientation,
    focusable: focusableWhenDisabled.value,
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <CompositeItem
      tag="button"
      render={render as any}
      className={className as any}
      style={style as any}
      metadata={itemMetadata.value as any}
      state={state.value as any}
      refs={[buttonRef as any]}
      props={[
        elementProps.value,
        // When a render prop is provided (typically another Base UI component
        // like Menu.Trigger), forward `disabled` so the rendered component can
        // derive its own disabled state. For the default toolbar button, avoid
        // forwarding a React `disabled` prop so focusable disabled buttons remain
        // hoverable for interactions like tooltips.
        // TODO: follow up after https://github.com/mui/base-ui/issues/1976#issuecomment-2916905663
        render?.value ? {disabled: disabled.value} : EMPTY_OBJECT,
        getButtonProps,
      ]}
    />
  );
}

export interface ToolbarButtonState extends ToolbarRootState {
  /**
   * Whether the component is disabled.
   */
  disabled: boolean;
  /**
   * Whether the component remains focusable when disabled.
   */
  focusable: boolean;
}

export interface ToolbarButtonProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ToolbarButtonState> {
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

export namespace ToolbarButton {
  export type State = ToolbarButtonState;
  export type Props = ToolbarButtonProps;
}
