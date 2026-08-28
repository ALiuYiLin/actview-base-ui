import { computed, ref, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useCheckboxRootContext } from '../root/CheckboxRootContext';
import { getCheckboxStateAttributesMapping } from '../utils/getCheckboxStateAttributesMapping';
import type { CheckboxRootState } from '../root/CheckboxRoot';
import type { BaseUIComponentProps } from '@/internals/types';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { type TransitionStatus, useTransitionStatus } from '@/internals/useTransitionStatus';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Indicates whether the checkbox is ticked.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Checkbox](https://base-ui.com/react/components/checkbox)
 */
export function CheckboxIndicator(componentProps: CheckboxIndicator.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：读字段即追踪（Root 侧为身份稳定载体）。
  const rootState = useCheckboxRootContext();

  const keepMounted = computed(() => componentProps.keepMounted ?? false);

  const rendered = computed(() => rootState.checked || rootState.indeterminate);

  const {mounted, transitionStatus, setMounted} = useTransitionStatus(rendered);

  // 自持 ref：useOpenChangeComplete 需要元素 ref；经 params.ref 合并链
  // 透传到最终渲染元素（不用 useRootElement / useRootElementFragment）。
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

  // ============ setup：值形 props toRefs 活引用；ref 形 props 直读本體 ============
  const {
    className,
    render,
    style,
    keepMounted: _keepMounted,
    ...elementRefs
  } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });
  const state = computed<CheckboxIndicatorState>(() => ({
    ...rootState,
    transitionStatus: transitionStatus.value,
  }));
  const stateAttributes = computed(() => {
    // state attrs 依赖渲染期 state（mapping 动态）——按当前 state 构建映射。
    const mapping: StateAttributesMapping<CheckboxIndicatorState> = {
      ...getCheckboxStateAttributesMapping(state.value),
      ...transitionStatusMapping,
    };
    return getStateAttributesProps(state.value, mapping);
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 条件在渲染期求值（表达式内 .value 直读）。
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
              ref: rootRef,
              props: {...elementProps.value, ...stateAttributes.value},
            },
          )
        : null}
    </>
  );
}

export interface CheckboxIndicatorState extends CheckboxRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface CheckboxIndicatorProps extends BaseUIComponentProps<'span', CheckboxIndicatorState> {
  /**
   * Whether to keep the element in the DOM when the checkbox is not checked.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace CheckboxIndicator {
  export type State = CheckboxIndicatorState;
  export type Props = CheckboxIndicatorProps;
}
