import { computed, defineComponent, ref } from 'actview';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { ComboboxGroupContext } from './ComboboxGroupContext';
import { GroupCollectionProvider } from '../collection/GroupCollectionContext';
import { mergePropsN } from '../../merge-props';

/**
 * Groups related items with the corresponding label.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export const ComboboxGroup = defineComponent(function (componentProps: ComboboxGroup.Props) {
  // ================= setup（只执行一次） =================
  const labelId = ref<string | undefined>(undefined);
  const setLabelId: ComboboxGroupContext['setLabelId'] = (next) => {
    labelId.value = typeof next === 'function' ? next(labelId.value) : next;
  };

  const contextValue = computed<ComboboxGroupContext>(() => ({
    labelId: labelId.value,
    setLabelId,
    items: componentProps.items,
  }));

  const rootRef = ref<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(componentProps.ref, rootRef);

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      items: _items,
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

    const wrappedElement = (
      <ComboboxGroupContext.Provider value={contextValue.value}>
        {element}
      </ComboboxGroupContext.Provider>
    );

    if (componentProps.items) {
      return <GroupCollectionProvider items={componentProps.items}>{wrappedElement}</GroupCollectionProvider>;
    }

    return <>{wrappedElement}</>;
  };
}) as (props: ComboboxGroup.Props) => any;

export interface ComboboxGroupState {}

export interface ComboboxGroupProps extends BaseUIComponentProps<'div', ComboboxGroupState> {
  /**
   * Items to be rendered within this group.
   * When provided, child `Collection` components will use these items.
   */
  items?: readonly any[] | undefined;
}

export namespace ComboboxGroup {
  export type State = ComboboxGroupState;
  export type Props = ComboboxGroupProps;
}