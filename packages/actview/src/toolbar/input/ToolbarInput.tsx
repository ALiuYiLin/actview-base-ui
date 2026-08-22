import { computed, defineComponent } from 'actview';
import { type BaseUIComponentProps, type HTMLProps } from '@/internals/types';
import { useFocusableWhenDisabled } from '@/utils/useFocusableWhenDisabled';
import type { ToolbarRoot, ToolbarRootState } from '@/toolbar/root/ToolbarRoot';
import { useToolbarRootContext } from '@/toolbar/root/ToolbarRootContext';
import { useToolbarGroupContext } from '@/toolbar/group/ToolbarGroupContext';
import { CompositeItem } from '@/internals/composite/item/CompositeItem';

/**
 * A native input element that integrates with Toolbar keyboard navigation.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export const ToolbarInput = defineComponent(function (componentProps: ToolbarInput.Props) {
  // context hooks 必须在 setup 顶层（AD-42）
  const rootContext = useToolbarRootContext();
  const groupContext = useToolbarGroupContext();

  const disabled = computed(
    () =>
      (rootContext.value.disabled ?? false) ||
      (groupContext.value?.disabled ?? false) ||
      (componentProps.disabled ?? false),
  );

  const focusableWhenDisabled = computed(() => componentProps.focusableWhenDisabled ?? true);

  const itemMetadata = computed<ToolbarRoot.ItemMetadata>(() => ({
    disabled: disabled.value,
    focusableWhenDisabled: focusableWhenDisabled.value,
  }));

  const { props: focusableWhenDisabledProps } = useFocusableWhenDisabled({
    composite: true,
    disabled,
    focusableWhenDisabled,
    isNativeButton: false,
  });

  const preventWhenDisabled = (event: Event) => {
    if (disabled.value) {
      event.preventDefault();
    }
  };

  return () => {
    const {
      className,
      disabled: _disabled, // setup computed 已接管
      focusableWhenDisabled: _focusableWhenDisabled, // setup computed 已接管
      render,
      style,
      ref: _ref, // 用户 ref：CompositeItem 内部 useRootElement 自取根，无需转发
      ...elementProps
    } = componentProps;

    const state: ToolbarInputState = {
      disabled: disabled.value,
      orientation: rootContext.value.orientation,
      focusable: focusableWhenDisabled.value,
    };

    const defaultProps: HTMLProps = {
      onClick: preventWhenDisabled,
      onPointerDown: preventWhenDisabled,
    };

    // ⚠️ 渲染期调用 getProps() 得对象：focusableWhenDisabledProps 是 getter 函数，
    // 直接传函数会被 mergePropsN 当 propsGetter（替换语义）冲掉 elementProps 的
    // 用户透传属性（data-testid 等）；渲染期求值对象则走普通合并路径
    const focusableProps = focusableWhenDisabledProps();

    return (
      <CompositeItem<ToolbarRoot.ItemMetadata, ToolbarInputState>
        tag="input"
        render={render}
        className={className}
        style={style}
        metadata={itemMetadata.value}
        state={state}
        props={[defaultProps, elementProps, focusableProps]}
      />
    );
  };
}) as (props: ToolbarInput.Props) => any;

export interface ToolbarInputState extends ToolbarRootState {
  /**
   * Whether the component is disabled.
   */
  disabled: boolean;
  /**
   * Whether the component remains focusable when disabled.
   */
  focusable: boolean;
}

export interface ToolbarInputProps extends BaseUIComponentProps<'input', ToolbarInputState> {
  /**
   * When `true` the item is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * When `true` the item remains focusable when disabled.
   * @default true
   */
  focusableWhenDisabled?: boolean | undefined;
  defaultValue?: JSX.IntrinsicElements['input']['value'] | undefined;
}

export namespace ToolbarInput {
  export type State = ToolbarInputState;
  export type Props = ToolbarInputProps;
}
