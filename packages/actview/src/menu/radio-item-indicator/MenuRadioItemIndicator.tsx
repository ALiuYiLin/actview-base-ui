import { computed, ref, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useMenuRadioItemContext } from '../radio-item/MenuRadioItemContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { itemMapping } from '../utils/stateAttributesMapping';
import { useTransitionStatus } from '@/internals/useTransitionStatus';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * Indicates whether the radio item is selected.
 * Renders a `<span>` element.
 */
export function MenuRadioItemIndicator(componentProps: MenuRadioItemIndicator.Props) {
  // ============ setup（只执行一次）：值形 props toRefs 活引用 ============
  // children 不解构、随 elementRefs 流入渲染元素；keepMounted 为组件自定义
  // props，单独持有。
  const { keepMounted, className, render, style, ...elementRefs } = toRefs(
    componentProps,
  ) as Record<string, Ref<any>>;

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

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // 根元素 props：checked/unchecked data-* 映射 → 透传。
  const rootProps = computed<Record<string, any>>(() => {
    const merged: any = {
      'aria-hidden': true,
      ...elementProps.value,
    };
    if (item.checked) {
      merged[itemMapping.checkedKey] = '';
    } else {
      merged[itemMapping.uncheckedKey] = '';
    }
    return merged;
  });

  const state = computed<MenuRadioItemIndicatorState>(() => ({
    checked: item.checked,
    disabled: item.disabled,
    highlighted: item.highlighted,
    transitionStatus: transitionStatus.value,
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {!keepMounted?.value && !mounted.value
        ? null
        : useRenderElement(
            'span',
            {
              className: className?.value,
              render: render?.value,
              style: style?.value,
            },
            {
              state: state.value,
              ref: useMergedRefs(
                (el: HTMLSpanElement | null) => {
                  indicatorRef.value = el;
                },
                componentProps.ref as any,
              ),
              props: rootProps.value,
            },
          )}
    </>
  );
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
