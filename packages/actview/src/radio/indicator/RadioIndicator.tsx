import { computed, ref, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { RadioRootState } from '../root/RadioRoot';
import { useRadioRootContext } from '../root/RadioRootContext';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { type TransitionStatus, useTransitionStatus } from '@/internals/useTransitionStatus';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Indicates whether the radio button is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
export function RadioIndicator(componentProps: RadioIndicator.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：读字段即追踪。
  const rootState = useRadioRootContext();

  const keepMounted = computed(() => componentProps.keepMounted ?? false);

  const rendered = computed(() => rootState.checked);

  const {mounted, transitionStatus, setMounted} = useTransitionStatus(rendered);

  // 自持 ref：useOpenChangeComplete 需要元素 ref；经 params.ref 合并链透传。
  const rootRef = ref<HTMLElement | null>(null);

  useOpenChangeComplete({
    open: rendered,
    ref: rootRef,
    onComplete() {
      if (!rendered.value) {
        setMounted(false);
      }
    },
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
    return out;
  });
  const state = computed<RadioIndicatorState>(() => ({
    ...rootState,
    transitionStatus: transitionStatus.value,
  }));
  const stateAttributes = computed(() =>
    getStateAttributesProps(state.value, stateAttributesMapping),
  );

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 条件在渲染期求值（表达式内 .value 直读，无 IIFE）。
  return (
    <>
      {keepMounted.value || mounted.value
        ? useRenderElement(
            'span',
            {
              className: className?.value,
              render: render?.value,
              style: style?.value,
            },
            {
              state: state.value,
              stateAttributesMapping,
              ref: rootRef,
              props: {...elementProps.value, ...stateAttributes.value},
            },
          )
        : null}
    </>
  );
}

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
