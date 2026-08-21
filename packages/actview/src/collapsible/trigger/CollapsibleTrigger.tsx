import { computed, defineComponent } from 'actview';
import { triggerOpenStateMapping } from '../../utils/collapsibleOpenStateMapping';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { getStateAttributesProps } from '../../internals/getStateAttributesProps';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '../../internals/types';
import { useButton } from '../../internals/use-button';
import { useCollapsibleRootContext } from '../root/CollapsibleRootContext';
import { type CollapsibleRootState } from '../root/CollapsibleRoot';
import { mergePropsN } from '../../merge-props';

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
export const CollapsibleTrigger = defineComponent(function (componentProps: CollapsibleTrigger.Props) {
  // ================= setup（只执行一次） =================
  const context = useCollapsibleRootContext();

  const disabled = computed(() => componentProps.disabled ?? context.value.disabled);
  const nativeButton = computed(() => componentProps.nativeButton ?? true);

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled: true,
    native: nativeButton,
  });

  const state = computed(() => context.value.state);

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      disabled: _disabled,
      nativeButton: _nativeButton,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        'aria-controls': context.value.open ? context.value.panelId : undefined,
        'aria-expanded': context.value.open,
        onClick: context.value.handleTrigger,
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
      (p: HTMLProps) => getButtonProps(p),
    ]);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref: buttonRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={buttonRef} />;
    }
    return <button ref={buttonRef} {...merged} />;
  };
}) as (props: CollapsibleTrigger.Props) => any;

export interface CollapsibleTriggerState extends CollapsibleRootState {}

export interface CollapsibleTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', CollapsibleTriggerState> {}

export namespace CollapsibleTrigger {
  export type State = CollapsibleTriggerState;
  export type Props = CollapsibleTriggerProps;
}