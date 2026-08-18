# actview select: SelectStore class 设计建议

## 问题
packages/actview/src/select/store.ts 已有 State 和 selectors，但还没有 SelectStore class（extends ActviewStore）。参照 menu/store/MenuStore.ts、popover/store/PopoverStore.ts 的模式应该怎么写？select 的 State 不是 PopupStoreState（无 payload/activeTriggerId/triggerElements）——需要 context 吗？react 版 SelectRoot 用 ReactStore<State> 直接 new，actview 版是否也应直接 new SelectStore(initialState) 而不要 PopupTriggerMap？

## 结论（Evidence level: S6 — 全源码分析）
**是的：直接 `new SelectStore(initialState)`，不要 PopupTriggerMap，context 可空。** 纯单 trigger 组件，store 无需交互方法，refs/回调都放在组件层 `SelectRootContext`。建议给出一个无 context、无 PopupTriggerMap、无 NullStore 的极简 `SelectStore extends ActviewStore<Readonly<State>, {}, Selectors>` 子类，配 `createInitialState` 补全省略字段默认值（与 react `new ReactStore<State>({...})` 对齐）。若日后需要，可在 context 里只放 `onOpenChange`/`onOpenChangeComplete`。

## 依据
1. **Menu/Popover 为何需要 PopupTriggerMap + context**：它们的 State extends `PopupStoreState`（popups/store.ts:12-81），包含多 trigger 基础设施：`payload`、`activeTriggerId`、`activeTriggerElement`、`triggerCount`、`triggerIdProp`、`activeTriggerProps`、`inactiveTriggerProps`、`floatingRootContext`，且 `PopupStoreContext.triggerElements: PopupTriggerMap`（store.ts:119-136）。`PopupTriggerMap` 是**多个 trigger 元素的注册表**，被 `floating-ui-actview` 的交互 hooks（useHover、useDismiss、useFocus、useHoverReferenceInteraction 等，用 `hasElement/getById/entries`）消费。createInitialPopupStoreState 也产出这些。
2. **select 是单 trigger**：其 State（actview store.ts:10-47）只有单个 `triggerElement: HTMLElement | null`（38），没有 `payload/activeTriggerId/triggerElements`，也不 extends `PopupStoreState`。它是 react 版 select State（react store.ts:9-46）的近似拷贝。
3. **react 版就是直接 new**：`SelectStore = ReactStore<State>`（react store.ts:48），SelectRoot 里 `new ReactStore<StoreState>({ ...30 个字段全部给默认值... })`（react SelectRoot.tsx:137-163）。无子类、无 context、无 PopupTriggerMap。select 只有一个 trigger。
4. **actview 的 refs/回调在组件层，不在 store**：actview `SelectRootContext`（SelectRootContext.ts:9-40）已承载 listRef、popupRef、scrollHandlerRef、valueRef、valuesRef、labelsRef、typingRef、selectionRef、firstItemTextRef、selectedItemTextRef、alignItemWithTriggerActiveRef、initialValueRef、setValue、setOpen、onOpenChangeComplete、validation —— 与 react 一致（refs 在组件，不进 store）。故 store 不需要 context 存放这些，也不需要 setOpen/setValue 方法。这也正是 react `ReactStore<State>` 无方法的原因。
5. **对比 MenuStore/PopoverStore**：它们的 `setOpen` 需要 `context.triggerElements.getById(activeTriggerId)`（PopoverStore.ts:107-119）解析“是哪个 trigger 打开/关闭的”，并需要 `onOpenChange` 事件、`stickIfOpenTimeout`、focus 守卫 refs 等 —— 这些全来自多 trigger + 事件管线。select 没有这些需求。

## 建议结构（packages/actview/src/select/store.ts）
```ts
import { ActviewStore } from '@base-ui/actview-utils/store';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import type { HTMLProps } from '../internals/types';

// ... 现有 State / selectors 保持不变 ...

type Selectors = typeof selectors;
type SelectStoreContext = Record<string, never>; // 可在需要时扩展为 { onOpenChange?...; onOpenChangeComplete?... }

export class SelectStore extends ActviewStore<Readonly<State>, SelectStoreContext, Selectors> {
  constructor(initialState?: Partial<State>) {
    super(createInitialState(initialState), {} as SelectStoreContext, selectors);
  }
}

function createInitialState(initialState?: Partial<State>): State {
  return {
    id: undefined,
    labelId: undefined,
    modal: false,
    multiple: false,
    items: undefined,
    itemToStringLabel: undefined,
    itemToStringValue: undefined,
    isItemEqualToValue: (a, b) => a === b,
    value: undefined,
    open: false,
    mounted: false,
    forceMount: false,
    transitionStatus: undefined,
    openMethod: null,
    activeIndex: null,
    selectedIndex: null,
    popupProps: EMPTY_OBJECT as HTMLProps,
    triggerProps: EMPTY_OBJECT as HTMLProps,
    triggerElement: null,
    positionerElement: null,
    listElement: null,
    popupSide: null,
    scrollUpArrowVisible: false,
    scrollDownArrowVisible: false,
    hasScrollArrows: false,
    ...initialState,
  };
}
```
注意：把旧的 `export type SelectStore = ActviewStore<State>;`（actview store.ts:49）改为 `export class SelectStore ...`，`SelectStore` 仍可作为类型用于 SelectRootContext.ts:10、SelectItemContext、SelectPositionerContext。用 `Readonly<State>` 与 Menu/Popover 保持一致。setValue/setOpen 由组件层 SelectRootContext 提供，不写进 store。

## 文件证据
- packages/actview/src/select/store.ts:10-47 (State), :49 (type alias), :51-119 (selectors)
- packages/actview/src/utils/popups/store.ts:12-81 (PopupStoreState), :83-117 (createInitialPopupStoreState), :119-136 (PopupStoreContext/triggerElements)
- packages/actview/src/utils/popups/popupTriggerMap.ts:28 (class PopupTriggerMap)
- packages/actview/src/menu/store/MenuStore.ts:113-166 (class, 构造里 new PopupTriggerMap + createInitialContext)
- packages/actview/src/popover/store/PopoverStore.ts:74-165 (class), :107-119 (setOpen 用 triggerElements 解析 trigger)
- packages/actview/src/select/root/SelectRootContext.ts:9-40 (select 的 refs/回调全在组件层 context)
- packages/actview/src/internals下的 useHover/useDismiss 等不再复述（floating hooks 消费 triggerElements）
- packages/react/src/select/store.ts:48 (SelectStore = ReactStore<State>)
- packages/react/src/select/root/SelectRoot.tsx:137-163 (new ReactStore<StoreState>({...}))
- packages/actview-utils/src/store/ActviewStore.ts:11-27 (构造 signature)
