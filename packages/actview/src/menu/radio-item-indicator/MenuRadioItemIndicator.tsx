import { computed, ref, toRefs, unrefs } from 'actview';
import { useMenuRadioItemContext } from '../radio-item/MenuRadioItemContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { itemMapping } from '../utils/stateAttributesMapping';
import { useTransitionStatus } from '@/internals/useTransitionStatus';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * Indicates whether the radio item is selected.
 * Renders a `<span>` element.
 */
export function MenuRadioItemIndicator(componentProps: MenuRadioItemIndicator.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {keepMounted, render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);

  const item = useMenuRadioItemContext();

  const indicatorRef = ref(null as HTMLSpanElement | null);

  const {transitionStatus, mounted, setMounted} = useTransitionStatus(
    computed(() => item.checked),
  );

  useOpenChangeComplete({
    open: computed(() => item.checked),
    ref: indicatorRef,
    onComplete() {
      if (!item.checked) {
        setMounted(false);
      }
    },
  });

  const {element} = useRenderElement({
    props: () => {
      const merged: any = {
        'aria-hidden': true,
        ...unrefs(elementProps),
      };
      if (item.checked) {
        merged[itemMapping.checkedKey] = '';
      } else {
        merged[itemMapping.uncheckedKey] = '';
      }
      return [merged];
    },
    state: (): MenuRadioItemIndicatorState => ({
      checked: item.checked,
      disabled: item.disabled,
      highlighted: item.highlighted,
      transitionStatus: transitionStatus.value,
    }),
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: HTMLSpanElement | null) => {
          indicatorRef.value = el;
        },
      ];
      if (componentProps.ref !== undefined) {
        refs.push(refProp);
      }
      return refs;
    },
    children,
    defaultTag: 'span',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{!keepMounted?.value && !mounted.value ? null : element()}</>;
}

export interface MenuRadioItemIndicatorState {
  /**
   * Whether the radio item is selected.
   */
  checked: boolean;
  /**
   * Whether the radio item is disabled.
   */
  disabled: boolean;
  /**
   * Whether the radio item is highlighted.
   */
  highlighted: boolean;
  /**
   * The transition status of the indicator.
   */
  transitionStatus: any;
}

export interface MenuRadioItemIndicatorProps extends BaseUIComponentProps<'span', any> {
  /**
   * Whether to keep the HTML element in the DOM when the radio item is not selected.
   * @default false
   */
  keepMounted?: boolean | undefined;
  [key: string]: any;
}

export namespace MenuRadioItemIndicator {
  export type State = MenuRadioItemIndicatorState;
  export type Props = MenuRadioItemIndicatorProps;
}
