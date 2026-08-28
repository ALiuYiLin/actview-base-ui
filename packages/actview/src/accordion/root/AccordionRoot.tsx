import {computed, rawRef, toValue, useRootElement, watch, shallowRef, toRefs, unrefs} from 'actview';
import { useControlled } from '@/utils/useControlled';
import { EMPTY_ARRAY } from '@/internals/noop';
import type { BaseUIComponentProps, Orientation } from '@/internals/types';
import { CompositeList } from '@/internals/composite/list/CompositeList';
import { AccordionRootContext } from './AccordionRootContext';
import { type BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

const rootStateAttributesMapping = {
  value: () => null,
};

/**
 * Groups all parts of the accordion.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionRoot<Value = any>(componentProps: AccordionRoot.Props<Value>) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const [value, setValue] = useControlled({
    controlled: () => toValue(componentProps.value),
    default: () => toValue(componentProps.defaultValue) ?? EMPTY_ARRAY,
    name: 'Accordion',
    state: 'value',
  });

  const multiple = computed(() => toValue(componentProps.multiple) ?? false);
  const disabled = computed(() => toValue(componentProps.disabled) ?? false);
  const orientation = computed(() => toValue(componentProps.orientation) ?? 'vertical');
  const hiddenUntilFound = computed(() => toValue(componentProps.hiddenUntilFound) ?? false);
  const keepMounted = computed(() => toValue(componentProps.keepMounted) ?? false);

  // dev 警告：hiddenUntilFound 覆盖 keepMounted={false}
  if (process.env.NODE_ENV !== 'production') {
    watch(
      () => [toValue(componentProps.hiddenUntilFound), toValue(componentProps.keepMounted)],
      ([hiddenUntilFoundProp, keepMountedProp]) => {
        if (hiddenUntilFoundProp && keepMountedProp === false) {
          console.warn(
            'Base UI: The `keepMounted={false}` prop on `Accordion.Root` is ignored when ' +
              '`hiddenUntilFound` is enabled, since panels must remain mounted while closed.',
          );
        }
      },
      {immediate: true},
    );
  }

  const accordionItemRefs = shallowRef([] as (HTMLElement | null)[]);

  const handleValueChange = (
    newValue: any,
    nextOpen: boolean,
    details: AccordionRoot.ChangeEventDetails,
  ) => {
    const currentValue = toValue(value) as any[];
    if (!multiple.value) {
      const nextValue = currentValue[0] === newValue ? [] : [newValue];
      // onValueChange 是函数 prop——直接调用（toValue 会把它当 getter）
      componentProps.onValueChange?.(nextValue, details);
      if (details.isCanceled) {
        return;
      }
      setValue(nextValue);
    } else if (nextOpen) {
      const nextOpenValues = currentValue.slice();
      nextOpenValues.push(newValue);
      componentProps.onValueChange?.(nextOpenValues, details);
      if (details.isCanceled) {
        return;
      }
      setValue(nextOpenValues);
    } else {
      const nextOpenValues = currentValue.filter((v) => v !== newValue);
      componentProps.onValueChange?.(nextOpenValues, details);
      if (details.isCanceled) {
        return;
      }
      setValue(nextOpenValues);
    }
  };

  const state = computed<AccordionRoot.State<any>>(() => ({
    value: (toValue(value) as any[]) ?? [],
    disabled: disabled.value,
    orientation: orientation.value,
  }));

  const contextValue: AccordionRootContext<any> = {
    disabled,
    handleValueChange,
    hiddenUntilFound,
    keepMounted,
    state,
    value: value as any,
  };

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    state: () => toValue(state),
    stateAttributesMapping: rootStateAttributesMapping as any,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <AccordionRootContext.Provider value={contextValue}>
      <CompositeList elementsRef={rawRef(accordionItemRefs)}>{element()}</CompositeList>
    </AccordionRootContext.Provider>
  );
}

export type AccordionValue<Value = any> = Value[];

export interface AccordionRootState<Value = any> {
  /**
   * The current value.
   */
  value: AccordionValue<Value>;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * The component orientation.
   *
   * Deprecated following the [APG guidance update](https://github.com/w3c/aria-practices/pull/3434)
   * to remove roving focus.
   *
   * This state no longer affects keyboard focus behavior.
   * @deprecated
   */
  orientation: Orientation;
}

export interface AccordionRootProps<Value = any> extends BaseUIComponentProps<
  'div',
  AccordionRoot.State<Value>
> {
  /**
   * The controlled value of the item(s) that should be expanded.
   *
   * To render an uncontrolled accordion, use the `defaultValue` prop instead.
   */
  value?: AccordionValue<Value> | undefined;
  /**
   * The uncontrolled value of the item(s) that should be initially expanded.
   *
   * To render a controlled accordion, use the `value` prop instead.
   */
  defaultValue?: AccordionValue<Value> | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Allows the browser's built-in page search to find and expand the panel contents.
   *
   * Overrides the `keepMounted` prop and uses `hidden="until-found"`
   * to hide the element without removing it from the DOM.
   * @default false
   */
  hiddenUntilFound?: boolean | undefined;
  /**
   * Whether to keep the element in the DOM while the panel is closed.
   * This prop is ignored when `hiddenUntilFound` is used.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * Deprecated following the [APG guidance update](https://github.com/w3c/aria-practices/pull/3434)
   * to remove roving focus.
   *
   * This prop no longer affects keyboard focus behavior.
   * @deprecated
   */
  loopFocus?: boolean | undefined;
  /**
   * Event handler called when an accordion item is expanded or collapsed.
   * Provides the new value as an argument.
   */
  onValueChange?:
    | ((value: AccordionValue<Value>, eventDetails: AccordionRootChangeEventDetails) => void)
    | undefined;
  /**
   * Whether multiple items can be open at the same time.
   * @default false
   */
  multiple?: boolean | undefined;
  /**
   * Deprecated following the [APG guidance update](https://github.com/w3c/aria-practices/pull/3434)
   * to remove roving focus.
   *
   * This prop no longer affects keyboard focus behavior.
   * @default 'vertical'
   * @deprecated
   */
  orientation?: Orientation | undefined;
}

export type AccordionRootChangeEventReason = typeof REASONS.triggerPress | typeof REASONS.none;

export type AccordionRootChangeEventDetails =
  BaseUIChangeEventDetails<AccordionRoot.ChangeEventReason>;

export namespace AccordionRoot {
  export type Value<TValue = any> = AccordionValue<TValue>;
  export type State<TValue = any> = AccordionRootState<TValue>;
  export type Props<TValue = any> = AccordionRootProps<TValue>;
  export type ChangeEventReason = AccordionRootChangeEventReason;
  export type ChangeEventDetails = AccordionRootChangeEventDetails;
}


