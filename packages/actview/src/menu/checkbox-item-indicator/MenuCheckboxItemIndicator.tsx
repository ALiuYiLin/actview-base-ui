import { computed, defineComponent, ref, toValue } from 'actview';
import { useMenuCheckboxItemContext } from '../checkbox-item/MenuCheckboxItemContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { itemMapping } from '../utils/stateAttributesMapping';
import { useTransitionStatus } from '@/internals/useTransitionStatus';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';

/**
 * Indicates whether the checkbox item is checked.
 * Renders a `<span>` element.
 */
export const MenuCheckboxItemIndicator = defineComponent(function MenuCheckboxItemIndicator(
  componentProps: MenuCheckboxItemIndicator.Props,
) {
  const {keepMounted = false} = componentProps as any;
  const children = toValue(componentProps.children);

  const item = useMenuCheckboxItemContext();

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

  return () => {
    const {render, className: cls, style: st, ...elementProps} = componentProps as any;

    if (!keepMounted && !mounted.value) {
      return null;
    }

    const state: MenuCheckboxItemIndicatorState = {
      checked: item.checked,
      disabled: item.disabled,
      highlighted: item.highlighted,
      transitionStatus: transitionStatus.value,
    };

    const merged: any = {
      'aria-hidden': true,
      ...elementProps,
    };

    if (state.checked) {
      merged[itemMapping.checkedKey] = '';
    } else {
      merged[itemMapping.uncheckedKey] = '';
    }

    const mergedRefs = (el: HTMLSpanElement | null) => {
      indicatorRef.value = el;
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        componentProps.ref.value = el;
      }
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...state, ref: mergedRefs} as any);
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
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{children}</Tag>;
    }
    return <span {...merged} ref={mergedRefs}>{children}</span>;
  };
});

export interface MenuCheckboxItemIndicatorState {
  /**
   * Whether the checkbox item is checked.
   */
  checked: boolean;
  /**
   * Whether the checkbox item is disabled.
   */
  disabled: boolean;
  /**
   * Whether the checkbox item is highlighted.
   */
  highlighted: boolean;
  /**
   * The transition status of the indicator.
   */
  transitionStatus: any;
}

export interface MenuCheckboxItemIndicatorProps extends BaseUIComponentProps<'span', any> {
  /**
   * Whether to keep the HTML element in the DOM when the checkbox item is not checked.
   * @default false
   */
  keepMounted?: boolean | undefined;
  [key: string]: any;
}

export namespace MenuCheckboxItemIndicator {
  export type State = MenuCheckboxItemIndicatorState;
  export type Props = MenuCheckboxItemIndicatorProps;
}
