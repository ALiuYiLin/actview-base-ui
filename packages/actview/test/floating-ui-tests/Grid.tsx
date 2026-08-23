import { defineComponent, ref } from '@actview/core';
import {
  FloatingFocusManager,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
} from '@floating-ui/actview';

// 样式隔离：import 带 ?scoped 即开启（@actview/plugin-scoped），本文件所有
// JSX 元素自动注入 data-v-<hash>，Grid.css 选择器同步追加属性选择器。
import './Grid.css?scoped';
import { gridNavigationWithColumns } from './gridNavigationWithColumns';

interface Props {
  orientation?: 'horizontal' | 'both';
  loopFocus?: boolean;
}

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

  const disabledIndices = [0, 1, 2, 3, 4, 5, 6, 7, 10, 15, 45, 48];

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    useClick(context),
    useListNavigation(context, {
      listRef,
      activeIndex,
      onNavigate: (i) => {
        activeIndex.value = i;
      },
      grid: gridNavigationWithColumns(5),
      orientation: props.orientation ?? 'horizontal',
      loop: props.loopFocus ?? false,
      openOnArrowKeyDown: false,
      disabledIndices,
    }),
    useDismiss(context),
  ]);

  return () => (
    <>
      <h1>Grid</h1>
      <div className="Container">
        <button ref={refs.setReference} type="button" {...getReferenceProps()}>
          Reference
        </button>
        {open.value && (
          <FloatingFocusManager context={context}>
            <div
              role="menu"
              ref={refs.setFloating}
              data-testid="floating"
              className="Grid"
              style={{
                ...floatingStyles.value,
                gridTemplateColumns: '100px 100px 100px 100px 100px',
                zIndex: 999,
              }}
              {...getFloatingProps()}
            >
              {[...Array(49)].map((_, index) => (
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
