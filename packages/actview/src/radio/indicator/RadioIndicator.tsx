import { computed, toValue, toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { RadioRootState } from '../root/RadioRoot';
import { useRadioRootContext } from '../root/RadioRootContext';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { type TransitionStatus, useTransitionStatus } from '@/internals/useTransitionStatus';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * Indicates whether the radio button is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
export function RadioIndicator(componentProps: RadioIndicator.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>` + 条件）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  const rootState = useRadioRootContext();

  const keepMounted = toValue(componentProps.keepMounted) ?? false;

  const rendered = computed(() => rootState.value!.checked);

  const {mounted, transitionStatus, setMounted} = useTransitionStatus(rendered);

  const state = (): RadioIndicatorState => ({
    ...(rootState.value as RadioRootState),
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
    props: () => {
      const stateValue = state();
      const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);
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
