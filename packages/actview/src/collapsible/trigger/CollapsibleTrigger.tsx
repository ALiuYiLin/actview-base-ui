import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { triggerOpenStateMapping } from '@/utils/collapsibleOpenStateMapping';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';
import { mergePropsN } from '@/merge-props';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useButton } from '@/internals/use-button';
import { useCollapsibleRootContext } from '../root/CollapsibleRootContext';
import { type CollapsibleRootState } from '../root/CollapsibleRoot';
import { useRenderElement } from '@/internals/useRenderElement';

const stateAttributesMapping: StateAttributesMapping<CollapsibleRootState> = {
  ...triggerOpenStateMapping,
  ...transitionStatusMapping,
};

/**
 * A button that opens and closes the collapsible panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export function CollapsibleTrigger(componentProps: CollapsibleTrigger.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）。⚠️ state/disabled 是 Root 侧 getter——
  // 解构会捕获快照，经属性访问路由（getter 每次读取重算）。
  const rootContext = useCollapsibleRootContext();
  const {panelId, open, handleTrigger} = rootContext;
  const state = computed(() => rootContext.state);
  const disabled = computed(() => rootContext.disabled);

  const {getButtonProps, buttonRef} = useButton({
    disabled: () => (componentProps.disabled ?? false) || disabled.value,
    focusableWhenDisabled: true,
    native: () => componentProps.nativeButton ?? true,
  });

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    // disabled/nativeButton 由 getButtonProps 承担——透传排除。
    delete out.disabled;
    delete out.nativeButton;
    return out;
  });

  // 根元素 props：aria/trigger → 透传 → getButtonProps 链（disabled 拦截）。
  const rootProps = computed(() =>
    mergePropsN([
      {
        'aria-controls': open.value ? panelId.value : undefined,
        'aria-expanded': open.value,
        onClick: handleTrigger,
      },
      elementProps.value,
      (prev: any) => getButtonProps(prev),
    ]),
  );

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'button',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          stateAttributesMapping,
          ref: buttonRef,
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface CollapsibleTriggerState extends CollapsibleRootState {}

export interface CollapsibleTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', CollapsibleTriggerState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace CollapsibleTrigger {
  export type State = CollapsibleTriggerState;
  export type Props = CollapsibleTriggerProps;
}
