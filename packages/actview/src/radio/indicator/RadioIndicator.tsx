import { computed, defineComponent, useRootElement, watch } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import type { RadioRootState } from '@/radio/root/RadioRoot';
import { useRadioRootContext } from '@/radio/root/RadioRootContext';
import { stateAttributesMapping } from '@/radio/utils/stateAttributesMapping';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { type TransitionStatus, useTransitionStatus } from '@/internals/useTransitionStatus';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { mergePropsN } from '@/merge-props';

/**
 * Indicates whether the radio button is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
export const RadioIndicator = defineComponent(function (componentProps: RadioIndicator.Props) {
  // ================= setup（只执行一次） =================
  const rootState = useRadioRootContext();

  const rendered = computed(() => rootState.value.checked);

  const { mounted, transitionStatus, setMounted } = useTransitionStatus(rendered);

  const state = computed<RadioIndicatorState>(() => ({
    ...rootState.value,
    transitionStatus: transitionStatus.value,
  }));

  // 根是元素（span）：useRootElement 推导绑定；indicatorRef 是手动 { current } 对象
  // （useOpenChangeComplete 读 .current 判断动画结束），用 watch 同步（案例 6）
  const rootRef = useRootElement();
  const indicatorRef = { current: null as HTMLSpanElement | null };
  watch(
    rootRef,
    (el) => {
      indicatorRef.current = el as HTMLSpanElement | null;
    },
    { immediate: true, flush: 'sync' },
  );

  useOpenChangeComplete({
    open: rendered,
    ref: indicatorRef,
    onComplete() {
      if (!rendered.value) {
        setMounted(false);
      }
    },
  });

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      keepMounted: _keepMounted,
      ref: _ref, // 用户 ref：根由 useRootElement 自取，不显式转发（对照 MeterRoot）
      ...elementProps
    } = componentProps;

    const shouldRender = (componentProps.keepMounted ?? false) || mounted.value;
    if (!shouldRender) {
      return null;
    }

    const stateAttributes = getStateAttributesProps(state.value, stateAttributesMapping);

    const merged = mergePropsN([
      elementProps,
      stateAttributes,
      {
        className: typeof className === 'function' ? className(state.value) : className,
        style: typeof style === 'function' ? style(state.value) : style,
      },
    ]);

    if (typeof render === 'function') {
      return render({ ...merged, ...state.value, ref: rootRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} />;
    }
    return <span {...merged} />;
  };
}) as (props: RadioIndicator.Props) => any;

export interface RadioIndicatorProps extends BaseUIComponentProps<'span', RadioIndicatorState> {
  /**
   * Whether to keep the HTML element in the DOM when the radio button is inactive.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export interface RadioIndicatorState extends RadioRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export namespace RadioIndicator {
  export type Props = RadioIndicatorProps;
  export type State = RadioIndicatorState;
}
