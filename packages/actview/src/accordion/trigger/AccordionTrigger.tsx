import { defineComponent, onUnmounted, toValue, useRootElement, watch } from 'actview';
import { triggerOpenStateMapping } from '@/utils/collapsibleOpenStateMapping';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useButton } from '@/internals/use-button';
import { useCollapsibleRootContext } from '@/collapsible/root/CollapsibleRootContext';
import { useAccordionItemContext } from '../item/AccordionItemContext';
import { mergeProps } from '@/merge-props';

/**
 * A button that opens and closes the corresponding panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export const AccordionTrigger = defineComponent(function (componentProps: AccordionTrigger.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();
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
  const latestRegisteredId = {current: undefined as string | undefined};
  watch(
    () => toValue(componentProps.id),
    (registeredId, _old, onCleanup) => {
      latestRegisteredId.current = registeredId || undefined;
      setTriggerId((currentId: string | null | undefined) =>
        latestRegisteredId.current ?? (currentId === null ? undefined : currentId),
      );
      onCleanup(() => {
        setTriggerId((currentId: string | null | undefined) =>
          currentId === latestRegisteredId.current ? null : currentId,
        );
      });
    },
    {flush: 'post', immediate: true},
  );
  onUnmounted(() => {
    setTriggerId((currentId: string | null | undefined) =>
      currentId === latestRegisteredId.current ? null : currentId,
    );
  });

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {
      disabled: _disabled,
      className,
      id: _idProp,
      render,
      nativeButton: _nativeButton,
      style,
      ...elementProps
    } = componentProps;

    const stateValue = toValue(state);

    const props = {
      'aria-controls': toValue(open) ? toValue(panelId) : undefined,
      'aria-expanded': toValue(open),
      id: toValue(triggerId),
      onClick: handleTrigger,
    };

    const stateAttributes = getStateAttributesProps(stateValue, triggerOpenStateMapping as any);

    const merged: HTMLProps = mergeProps(props, elementProps, stateAttributes, getButtonProps);

    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(stateValue);
    } else if (style !== undefined) {
      merged.style = style;
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...stateValue, ref: rootRef});
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
    }
    return <button {...merged} ref={rootRef} />;
  };
}) as unknown as (props: AccordionTrigger.Props) => JSX.Element;

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
