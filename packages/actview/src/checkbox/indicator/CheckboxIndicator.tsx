import { computed, toValue, toRefs, unrefs } from 'actview';
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
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * Indicates whether the checkbox is ticked.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Checkbox](https://base-ui.com/react/components/checkbox)
 */
export function CheckboxIndicator(componentProps: CheckboxIndicator.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>` + 条件）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  const rootState = useCheckboxRootContext();

  const keepMounted = toValue(componentProps.keepMounted) ?? false;

  const rendered = computed(() => rootState.value!.checked || rootState.value!.indeterminate);

  const {mounted, transitionStatus, setMounted} = useTransitionStatus(rendered);

  const state = (): CheckboxIndicatorState => ({
    ...(rootState.value as CheckboxRootState),
    transitionStatus: transitionStatus.value,
  });

  useOpenChangeComplete({
    open: rendered,
    ref: rootRef,
    onComplete() {
      if (!rendered.value) {
        setMounted(false);
      }
    },
  });

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    // stateAttributesMapping 依赖渲染期 state（mapping 动态）——props getter
    // 里手动合并 data-* 属性（hook 的 stateAttributesMapping 仅支持静态对象）。
    props: () => {
      const stateValue = state();
      const baseStateAttributesMapping = getCheckboxStateAttributesMapping(stateValue);
      const mapping: StateAttributesMapping<CheckboxIndicatorState> = {
        ...baseStateAttributesMapping,
        ...transitionStatusMapping,
      };
      const stateAttributes = getStateAttributesProps(stateValue, mapping);
      return [{...unrefs(elementProps), ...stateAttributes}];
    },
    state,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'span',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{keepMounted || mounted.value ? element() : null}</>;
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
