import {onUnmounted, toValue, watch, ref, toRefs, unrefs} from 'actview';
import { triggerOpenStateMapping } from '@/utils/collapsibleOpenStateMapping';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useButton } from '@/internals/use-button';
import { useCollapsibleRootContext } from '@/collapsible/root/CollapsibleRootContext';
import { useAccordionItemContext } from '../item/AccordionItemContext';
import { mergeProps } from '@/merge-props';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * A button that opens and closes the corresponding panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionTrigger(componentProps: AccordionTrigger.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();
  const {panelId, open, handleTrigger, disabled: contextDisabled} = toValue(
    useCollapsibleRootContext(),
  );
  const {state, setTriggerId, triggerId} = toValue(useAccordionItemContext());

  const disabled = () => toValue(componentProps.disabled) || toValue(contextDisabled);

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    focusableWhenDisabled: true,
    native: () => toValue(componentProps.nativeButton) ?? true,
  });

  // rootRef → buttonRef（同 CollapsibleTrigger 模式）
  watch(
    rootRef,
    (el) => {
      buttonRef(el as HTMLElement | null);
    },
    {flush: 'post', immediate: true},
  );

  // 注册 trigger id 到 AccordionItem（id 变化时先注销旧值，再注册新值；
  // React 版 useIsoLayoutEffect cleanup 的等价物）。组件卸载时 watch 的
  // onCleanup 不保证执行——用 onUnmounted 显式注销。
  const latestRegisteredId = ref(undefined as string | undefined);
  watch(
    () => toValue(componentProps.id),
    (registeredId, _old, onCleanup) => {
      latestRegisteredId.value = registeredId || undefined;
      setTriggerId((currentId: string | null | undefined) =>
        latestRegisteredId.value ?? (currentId === null ? undefined : currentId),
      );
      onCleanup(() => {
        setTriggerId((currentId: string | null | undefined) =>
          currentId === latestRegisteredId.value ? null : currentId,
        );
      });
    },
    {flush: 'post', immediate: true},
  );
  onUnmounted(() => {
    setTriggerId((currentId: string | null | undefined) =>
      currentId === latestRegisteredId.value ? null : currentId,
    );
  });

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  // id 由 AccordionItemContext 的 triggerId 管理——从 elementProps 排除
  const {className, render, style, children, id: _idProp, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [
      {
        'aria-controls': toValue(open) ? toValue(panelId) : undefined,
        'aria-expanded': toValue(open),
        id: toValue(triggerId),
        onClick: handleTrigger,
      },
      unrefs(elementProps),
      getButtonProps,
    ],
    state: () => toValue(state),
    stateAttributesMapping: triggerOpenStateMapping as any,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'button',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
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
