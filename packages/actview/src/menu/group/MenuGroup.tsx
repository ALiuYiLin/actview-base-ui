import { computed, defineComponent, ref } from 'actview';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { MenuGroupContext } from './MenuGroupContext';
import { mergePropsN } from '../../merge-props';

/**
 * Groups related menu items with the corresponding label.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export const MenuGroup = defineComponent(function (componentProps: MenuGroup.Props) {
  // ================= setup（只执行一次） =================
  const labelId = ref<string | undefined>(undefined);

  const setLabelId: MenuGroupContext = (next) => {
    labelId.value =
      typeof next === 'function' ? (next as (current: string | undefined) => string | undefined)(labelId.value) : next;
  };

  const rootRef = ref<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(componentProps.ref, rootRef);

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const merged = mergePropsN([
      elementProps,
      {
        role: 'group',
        'aria-labelledby': labelId.value,
        className: typeof className === 'function' ? className({} as any) : className,
        style: typeof style === 'function' ? style({} as any) : style,
      },
    ]);

    const element = (() => {
      if (typeof render === 'function') {
        return render({ ...merged, ref: mergedRef });
      }
      if (render) {
        const Tag = render.type as any;
        return <Tag key={render.key} {...render.props} {...merged} ref={mergedRef} />;
      }
      return <div ref={mergedRef} {...merged} />;
    })();

    return (
      <MenuGroupContext.Provider value={setLabelId}>
        {element}
      </MenuGroupContext.Provider>
    );
  };
}) as (props: MenuGroup.Props) => any;

export interface MenuGroupProps extends BaseUIComponentProps<'div', MenuGroupState> {
  /**
   * The content of the component.
   */
  children?: any;
}

export interface MenuGroupState {}

export namespace MenuGroup {
  export type Props = MenuGroupProps;
  export type State = MenuGroupState;
}