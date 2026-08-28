import {computed, onUnmounted, ref, toRefs, watch} from 'actview';
import type { Ref } from 'actview';
import { triggerOpenStateMapping } from '@/utils/collapsibleOpenStateMapping';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useButton } from '@/internals/use-button';
import { mergePropsN } from '@/merge-props';
import { useCollapsibleRootContext } from '@/collapsible/root/CollapsibleRootContext';
import { useAccordionItemContext } from '../item/AccordionItemContext';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A button that opens and closes the corresponding panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionTrigger(componentProps: AccordionTrigger.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）。⚠️ state/disabled 是 getter——不解构，
  // 经属性访问路由到 computed。
  const collapsibleContext = useCollapsibleRootContext();
  const {panelId, open, handleTrigger} = collapsibleContext;
  const disabled = computed(
    () => (componentProps.disabled ?? false) || collapsibleContext.disabled,
  );

  const itemContext = useAccordionItemContext();
  const state = computed(() => itemContext.state.value);
  const triggerId = computed(() => itemContext.triggerId.value);

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    focusableWhenDisabled: true,
    native: () => componentProps.nativeButton ?? true,
  });

  // 注册 trigger id 到 AccordionItem（id 变化时先注销旧值，再注册新值；
  // React 版 useIsoLayoutEffect cleanup 的等价物）。组件卸载时 watch 的
  // onCleanup 不保证执行——用 onUnmounted 显式注销。
  const latestRegisteredId = ref(undefined as string | undefined);
  watch(
    () => componentProps.id,
    (registeredId, _old, onCleanup) => {
      latestRegisteredId.value = registeredId || undefined;
      itemContext.setTriggerId((currentId: string | null | undefined) =>
        latestRegisteredId.value ?? (currentId === null ? undefined : currentId),
      );
      onCleanup(() => {
        itemContext.setTriggerId((currentId: string | null | undefined) =>
          currentId === latestRegisteredId.value ? null : currentId,
        );
      });
    },
    {flush: 'post', immediate: true},
  );
  onUnmounted(() => {
    itemContext.setTriggerId((currentId: string | null | undefined) =>
      currentId === latestRegisteredId.value ? null : currentId,
    );
  });

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  // id 由 AccordionItemContext 的 triggerId 管理——从 elementProps 排除。
  const { className, render, style, id: _idProp, ...elementRefs } = toRefs(
    componentProps,
  ) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // 根元素 props：aria/trigger/id → 透传 → getButtonProps 链。
  const rootProps = computed(() =>
    mergePropsFn([
      {
        'aria-controls': open.value ? panelId.value : undefined,
        'aria-expanded': open.value,
        id: triggerId.value,
        onClick: handleTrigger,
      },
      elementProps.value,
      getButtonProps,
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
          stateAttributesMapping: triggerOpenStateMapping,
          ref: buttonRef,
          props: rootProps.value,
        },
      )}
    </>
  );
}

// mergeProps 局部别名：getter 消费 prev，右覆盖左，事件链右→左。
// mergeProps 3 参上限内安全——此处恒 3 项。
function mergePropsFn(inputs: any[]): Record<string, any> {
  return mergePropsN(inputs);
}

export interface AccordionTriggerState {}

export interface AccordionTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', AccordionTriggerState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace AccordionTrigger {
  export type State = AccordionTriggerState;
  export type Props = AccordionTriggerProps;
}
