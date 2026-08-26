import { computed, defineComponent, nextTick, ref, watch } from '@actview/core';
import { arrow, flip, offset, type Placement } from '@floating-ui/dom';
import {
  FloatingFocusManager,
  FloatingPortal,
  useClick,
  useDismiss,
  useFloating,
  useId,
  useInteractions,
  useListNavigation,
} from '@actview/floating-ui';
import { Button } from './Button';
import { gridNavigationWithColumns } from './gridNavigationWithColumns';
import './EmojiPicker.css?scoped';

const emojis = [
  { name: 'apple', emoji: '🍎' },
  { name: 'orange', emoji: '🍊' },
  { name: 'watermelon', emoji: '🍉' },
  { name: 'strawberry', emoji: '🍓' },
  { name: 'pear', emoji: '🍐' },
  { name: 'banana', emoji: '🍌' },
  { name: 'pineapple', emoji: '🍍' },
  { name: 'cherry', emoji: '🍒' },
  { name: 'peach', emoji: '🍑' },
];

/** @internal */
const Option = defineComponent(function (
  props: {
    name: string;
    active: boolean;
    selected: boolean;
    children?: any;
  } & any,
) {
  const id = useId();
  return () => (
    <button
      {...props}
      ref={props.ref}
      id={id.value}
      role="option"
      className={`Option${props.selected && !props.active ? ' OptionSelected' : ''}${
        props.active ? ' OptionActive' : ''
      }${props.name === 'orange' ? ' OptionDisabled' : ''}`}
      aria-selected={props.selected}
      disabled={props.name === 'orange'}
      aria-label={props.name}
      tabIndex={-1}
      data-active={props.active ? '' : undefined}
      type="button"
    >
      {props.children}
    </button>
  );
});

/** @internal */
export const Main = defineComponent(function () {
  const open = ref(false);
  const search = ref('');
  const selectedEmoji = ref<string | null>(null);
  const activeIndex = ref<number | null>(null);
  const placement = ref<Placement | null>(null);

  const arrowRef = ref<SVGSVGElement | null>(null);

  const listRef = ref<Array<HTMLElement | null>>([]);

  const noResultsId = useId();

  const { floatingStyles, refs, context, placement: resultantPlacement } =
    useFloating({
      placement: placement.value ?? 'bottom-start',
      open,
      onOpenChange: (o: boolean) => {
        open.value = o;
      },
      // We don't want flipping to occur while searching, as the floating element
      // will resize and cause disorientation.
      middleware: [
        offset(8),
        ...(placement.value ? [] : [flip()]),
        // actview Ref 无 getBoundingClientRect；传 .value（初始 null 时 arrow
        // 中间件跳过，不报错）。
        arrow({
          element: arrowRef.value as unknown as Element,
          padding: 20,
        }),
      ],
    });

  // Handles opening the floating element via the Choose Emoji button.
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useDismiss(context),
  ]);

  // Handles the list navigation where the reference is the inner input, not
  // the button that opens the floating element.
  const {
    getReferenceProps: getInputProps,
    getFloatingProps: getListFloatingProps,
    getItemProps,
  } = useInteractions([
    useListNavigation(context, {
      listRef,
      onNavigate: (i) => {
        activeIndex.value = i;
      },
      activeIndex,
      orientation: 'horizontal',
      loop: true,
      focusItemOnOpen: false,
      virtual: true,
      allowEscape: true,
      grid: gridNavigationWithColumns(3),
    }),
  ]);

  watch(open, (o) => {
    if (o) {
      placement.value = resultantPlacement.value;
    } else {
      search.value = '';
      activeIndex.value = null;
      placement.value = null;
    }
  });

  const filteredEmojis = computed(() =>
    emojis.filter(({ name }) =>
      name.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()),
    ),
  );

  const handleEmojiClick = () => {
    if (activeIndex.value !== null) {
      selectedEmoji.value = filteredEmojis.value[activeIndex.value].emoji;
      open.value = false;
    }
  };

  const handleKeyDown = (event: any) => {
    if (event.key === 'Enter') {
      handleEmojiClick();
    }
  };

  const handleInputChange = (event: any) => {
    activeIndex.value = null;
    search.value = event.target.value;
  };

  // React 版 Option 的 ref 回调在每次渲染调用（先 null 后 node），重渲染后
  // listRef 反映最新列表；actview 的 ref 回调仅在挂载/卸载时调用，filtered
  // 变化后复用节点不会重设 listRef。渲染后按 DOM 顺序重建 listRef。
  watch(filteredEmojis, async () => {
    await nextTick();
    listRef.value = Array.from(
      document.querySelectorAll('[role="option"]'),
    ) as Array<HTMLElement | null>;
  });

  return () => {
    const filtered = filteredEmojis.value;

    return (
      <>
        <h1 className="Heading">Emoji Picker</h1>
        <div className="Container">
          <div className="text-center">
            <Button
              ref={refs.setReference}
              className="Trigger"
              aria-label="Choose emoji"
              aria-describedby="emoji-label"
              data-open={open.value ? '' : undefined}
              {...getReferenceProps()}
            >
              ☻
            </Button>
            <br />
            {selectedEmoji.value && (
              <span id="emoji-label">
                <span
                  style={{ fontSize: 30 }}
                  aria-label={
                    emojis.find(({ emoji }) => emoji === selectedEmoji.value)
                      ?.name
                  }
                >
                  {selectedEmoji.value}
                </span>{' '}
                selected
              </span>
            )}
            <FloatingPortal>
              {open.value && (
                <FloatingFocusManager context={context} modal={false}>
                  <div
                    ref={refs.setFloating}
                    className="Floating"
                    style={floatingStyles.value}
                    {...getFloatingProps(getListFloatingProps())}
                  >
                    <span className="Label">Emoji Picker</span>
                    <input
                      className="Input"
                      placeholder="Search emoji"
                      value={search.value}
                      aria-controls={
                        filtered.length === 0 ? noResultsId.value : undefined
                      }
                      {...getInputProps({
                        onChange: handleInputChange,
                        onKeyDown: handleKeyDown,
                      })}
                    />
                    {filtered.length === 0 && (
                      <p
                        key={search.value}
                        id={noResultsId.value}
                        role="region"
                        aria-atomic="true"
                        aria-live="assertive"
                      >
                        No results.
                      </p>
                    )}
                    {filtered.length > 0 && (
                      <div className="Listbox" role="listbox">
                        {filtered.map(({ name, emoji }, index) => (
                          <Option
                            key={name}
                            name={name}
                            ref={(node: any) => {
                              listRef.value[index] = node;
                            }}
                            selected={selectedEmoji.value === emoji}
                            active={activeIndex.value === index}
                            {...getItemProps({
                              onClick: handleEmojiClick,
                            })}
                          >
                            {emoji}
                          </Option>
                        ))}
                      </div>
                    )}
                    <span
                      data-testid="emoji-picker-active-index"
                      data-active-index={activeIndex.value ?? ''}
                      style={{ display: 'none' }}
                    />
                  </div>
                </FloatingFocusManager>
              )}
            </FloatingPortal>
          </div>
        </div>
      </>
    );
  };
});
