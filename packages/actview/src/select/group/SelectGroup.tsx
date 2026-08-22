import { computed, defineComponent, ref } from 'actview';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { SelectGroupContext } from '@/select/group/SelectGroupContext';
import { mergePropsN } from '@/merge-props';

/**
 * Groups related select items with the corresponding label.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export const SelectGroup = defineComponent(function (componentProps: SelectGroup.Props) {
  // ================= setup（只执行一次） =================
  const labelId = ref<string | undefined>(undefined);
  const setLabelId: SelectGroupContext['setLabelId'] = (id) => {
    labelId.value = typeof id === 'function' ? (id as (prev: string | undefined) => string | undefined)(labelId.value) : id;
  };

  const contextValue = computed<SelectGroupContext>(() => ({
    labelId: labelId.value,
    setLabelId,
  }));

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
      <SelectGroupContext.Provider value={contextValue.value}>
        {element}
      </SelectGroupContext.Provider>
    );
  };
}) as (props: SelectGroup.Props) => any;

export interface SelectGroupState {}

export interface SelectGroupProps extends BaseUIComponentProps<'div', SelectGroupState> {}

export namespace SelectGroup {
  export type State = SelectGroupState;
  export type Props = SelectGroupProps;
}