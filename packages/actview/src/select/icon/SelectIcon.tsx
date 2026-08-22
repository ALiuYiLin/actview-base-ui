import { computed, defineComponent, useRootElement } from 'actview';
import type { HTMLProps } from '../../internals/types';
import { getStateAttributesProps } from '../../internals/getStateAttributesProps';
import type { BaseUIComponentProps } from '../../internals/types';
import { useSelectRootContext } from '../root/SelectRootContext';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import { mergePropsN } from '../../merge-props';

/**
 * An icon that indicates that the trigger button opens a select popup.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export const SelectIcon = defineComponent(function (componentProps: SelectIcon.Props) {
  // ================= setup（只执行一次） =================
  const rootRef = useRootElement();

  const rootContext = useSelectRootContext().value!;
  const { store } = rootContext;
  const open = store.useState('open');

  const state = computed<SelectIconState>(() => ({
    open: open.value,
  }));

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    const stateAttributes = getStateAttributesProps(stateValue, triggerOpenStateMapping);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        'aria-hidden': true,
        children: '▼',
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
    ]);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref: rootRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
    }
    return <span ref={rootRef} {...merged} />;
  };
}) as (props: SelectIcon.Props) => any;

export interface SelectIconState {
  /**
   * Whether the select popup is currently open.
   */
  open: boolean;
}

export interface SelectIconProps extends BaseUIComponentProps<'span', SelectIconState> {}

export namespace SelectIcon {
  export type State = SelectIconState;
  export type Props = SelectIconProps;
}