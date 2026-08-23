import { defineComponent, ref } from '@actview/core';
import {
  FloatingFocusManager,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
} from '@floating-ui/actview';
import './ComplexGrid.css?scoped';
import { gridNavigationWithColumns } from './gridNavigationWithColumns';

interface Props {
  orientation?: 'horizontal' | 'both';
  loopFocus?: boolean;
  rtl?: boolean;
}

/*
 * Grid diagram for reference:
 * Disabled indices marked with ()
 */

/** @internal */
export const Main = defineComponent(function (props: Props) {
  const open = ref(false);
  const activeIndex = ref<number | null>(null);

  const listRef = ref<Array<HTMLElement | null>>([]);

  const { floatingStyles, refs, context } = useFloating({
    open,
    onOpenChange: (o: boolean) => {
      open.value = o;
    },
    placement: 'bottom-start',
  });

  const disabledIndices = [0, 1, 2, 3, 4, 5, 6, 9, 14, 23, 35];

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    useClick(context),
    useListNavigation(context, {
      listRef,
      activeIndex,
      onNavigate: (i) => {
        activeIndex.value = i;
      },
      grid: gridNavigationWithColumns(7),
      orientation: props.orientation ?? 'horizontal',
      loop: props.loopFocus ?? false,
      rtl: props.rtl ?? false,
      openOnArrowKeyDown: false,
      disabledIndices,
    }),
    useDismiss(context),
  ]);

  return () => (
    <>
      <h1>Complex Grid</h1>
      <div className="Container">
        <button ref={refs.setReference} type="button" {...getReferenceProps()}>
          Reference
        </button>
        {open.value && (
          <FloatingFocusManager context={context}>
            <div
              ref={refs.setFloating}
              data-testid="floating"
              className="Grid"
              style={{
                ...floatingStyles.value,
                display: 'grid',
                gridTemplateColumns: '100px 100px 100px 100px 100px 100px 100px',
                zIndex: 999,
              }}
              {...getFloatingProps()}
            >
              {[...Array(37)].map((_, index) => (
                <button
                  type="button"
                  role="option"
                  key={index}
                  aria-selected={activeIndex.value === index}
                  tabIndex={activeIndex.value === index ? 0 : -1}
                  disabled={disabledIndices.includes(index)}
                  ref={(node: HTMLElement | null) => {
                    listRef.value[index] = node;
                  }}
                  className="Item"
                  {...getItemProps()}
                >
                  Item {index}
                </button>
              ))}
            </div>
          </FloatingFocusManager>
        )}
      </div>
    </>
  );
});
