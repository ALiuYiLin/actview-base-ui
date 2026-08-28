import { toValue, toRefs, unrefs, watch } from 'actview';
import { triggerOpenStateMapping } from '@/utils/collapsibleOpenStateMapping';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';
import { mergePropsN } from '@/merge-props';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useButton } from '@/internals/use-button';
import { useCollapsibleRootContext } from '../root/CollapsibleRootContext';
import { type CollapsibleRootState } from '../root/CollapsibleRoot';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

const stateAttributesMapping: StateAttributesMapping<CollapsibleRootState> = {
  ...triggerOpenStateMapping,
  ...transitionStatusMapping,
};

/**
 * A button that opens and closes the collapsible panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export function CollapsibleTrigger(componentProps: CollapsibleTrigger.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();
  const {panelId, open, handleTrigger, state, disabled: contextDisabled} = toValue(
    useCollapsibleRootContext(),
  );

  const {getButtonProps, buttonRef} = useButton({
    disabled: () => toValue(componentProps.disabled) ?? toValue(contextDisabled),
    focusableWhenDisabled: true,
    native: () => toValue(componentProps.nativeButton) ?? true,
  });

  // rootRef → buttonRef（actview JSX ref 只能绑一个——watch 桥接，同 Button 模式）
  watch(
    rootRef,
    (el) => {
      buttonRef(el as HTMLButtonElement | null);
    },
    {flush: 'post', immediate: true},
  );

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const {
        disabled: _disabled,
        nativeButton: _nativeButton,
        ...restElementProps
      } = unrefs(elementProps);
      return [
        {
          'aria-controls': toValue(open) ? toValue(panelId) : undefined,
          'aria-expanded': toValue(open),
          onClick: handleTrigger,
        },
        restElementProps,
        // props getter：接收之前合并的 props 作为 externalProps，handleTrigger
        // 成为 useButton 的 externalOnClick——disabled 时 preventDefault 且不调用
        getButtonProps,
      ];
    },
    state: () => toValue(state) as any,
    stateAttributesMapping: stateAttributesMapping as any,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'button',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface CollapsibleTriggerState extends CollapsibleRootState {}

export interface CollapsibleTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', CollapsibleTriggerState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace CollapsibleTrigger {
  export type State = CollapsibleTriggerState;
  export type Props = CollapsibleTriggerProps;
}
