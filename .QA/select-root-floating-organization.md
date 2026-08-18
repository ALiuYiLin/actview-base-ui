# actview Select 弹层 Root 组织：useFloatingRootContext / interaction hooks / mergeProps 建议

## 问题
actview 版 select 的 Root 应如何组织？useFloatingRootContext 返回的 FloatingRootStore 塞进 store state 还是 SelectRootContext？useClick/useDismiss/useListNavigation/useTypeahead 返回的 ElementProps 是否要用 mergeProps（getter 保事件链）合并进 store 的 triggerProps/popupProps？useListNavigation 的 onNavigate 如何把 activeIndex 写进 SelectStore？useTypeahead 的 disabledIndices 用 isElementDisabled 怎么写？

## 结论（Evidence level: S6 — 全源码分析）
**floatingContext 不进 store，放 SelectRootContext**（与 react 一致，因 select 的 State 无 `floatingRootContext` 字段，且 actview 的 SelectRootContext.ts:11 已有 `floatingContext: FloatingRootContext` 字段）。open 通过 `useSyncedValues` 同步进 SelectStore。interaction hooks 在第一层用「普通 mergeProps」合并各自 reference/floating/item 给 store 的 triggerProps/popupProps；第二层在子组件（SelectTrigger/SelectPopup 的 useRenderElement）用 **getter `(prev) => mergeProps(prev, storeProps)` 保事件链**（同 PopoverPopup.tsx:95）。activeIndex 通过 `onNavigate` 里 `store.set('activeIndex', next)`；typeahead 的 `disabledIndices` 用 `(index) => isElementDisabled(listRef.current[index])`（attribute-only，取自 `@base-ui/actview-utils/isElementDisabled`）。

## 关键源码事实
- **floatingContext 类型**：`FloatingRootContext = FloatingRootStore`（floating-ui-actview/types.ts:124）。`useFloatingRootContext` 返回该 store（useFloatingRootContext.ts:26,41-54），创建时 `syncOnly: false`（:51）并把 `onOpenChange: options.onOpenChange` 挂到 context（:46,88）。于是各 interaction hooks 内部 `store.setOpen` → `dispatchOpenChange` + `context.onOpenChange`（FloatingRootStore.ts:127-136）→ 回到 Root 传入的 `onOpenChange: setOpen`。react 完全一致（react SelectRoot.tsx:320-327）。
- **hooks 第一参就是该 store，返回 `ElementProps { reference, floating, item, trigger }`**（types.ts:166-171）：useClick（useClick.ts:57-60）、useDismiss、useListNavigation（useListNavigation.ts:223-226）、useTypeahead（useTypeahead.ts:69-72）。
- **两层 mergeProps（关键决策）**：
  - 第 1 层（Root 内）用**普通 `mergeProps(...)` 一次性合并**（react SelectRoot.tsx:377-414 同款）：trigger/引用、popup/floating、item 各自合并后 `store.update/store.useSyncedValues` 存进 store。
  - 第 2 层（SelectTrigger/SelectPopup 的 useRenderElement）用 **getter `(prev) => mergeProps(prev, storeProps.value)` 保事件链**，同 PopoverPopup.tsx:47,95 / PopoverTrigger.tsx:108。原因是 mergeProps 的 getter 整体替换且不自动连事件链（详见 merge-props-actview-semantics.md）。select 的 State 已含 triggerProps/popupProps（store.ts:36-37）。
- **onNavigate 写 activeIndex**：`onNavigate(next){ if(next===null && !open) return; store.set('activeIndex', next) }`（react SelectRoot.tsx:342-349）。
- **typeahead disabledIndices**：`(index) => isElementDisabled(listRef.current[index])`，attribute-only 避免 force-mounted 隐藏项被 elementsRef/visibility 过滤（react SelectRoot.tsx:353-363）；actview 同款在 `@base-ui/actview-utils/isElementDisabled`（isElementDisabled.ts:1-7）。
- actview state 更新同步；`store.useSyncedValues` 接受精确 state 子集（ActviewStore.ts:90-107；PopoverRoot.tsx:79 用法）。

## 建议的 actview SelectRoot 结构
```ts
// packages/actview/src/select/root/SelectRoot.tsx（示意）
const store = /* new SelectStore({...initialProps}) 见上一条 QA */;

const open = store.useState('open');              // 或由 useOpenStateTransitions 派生
const mounted = store.useState('mounted');
const transitionStatus = store.useState('transitionStatus');
const activeIndex = store.useState('activeIndex');
const selectedIndex = store.useState('selectedIndex');
const triggerElement = store.useState('triggerElement');
const positionerElement = store.useState('positionerElement');

store.useControlledProp('open', computed(() => componentProps.open)); // 受控

const setOpen = (nextOpen: boolean, details: SelectRoot.ChangeEventDetails) => {
  componentProps.onOpenChange?.(nextOpen, details);
  if (details.isCanceled) return;
  store.update({ open: nextOpen }); // 同步打标机，具体由 open 状态机接管
};

// floatingContext 放 context，不进 store —— 与 react 一致
const floatingContext = useFloatingRootContext({
  open,
  onOpenChange: setOpen,
  elements: { reference: triggerElement, floating: positionerElement },
});

const click        = useClick(floatingContext, { enabled: !readOnly && !disabled, event: 'mousedown' });
const dismiss      = useDismiss(floatingContext);
const listNav      = useListNavigation(floatingContext, {
  enabled: !readOnly && !disabled,
  listRef,
  activeIndex,
  selectedIndex,
  disabledIndices: EMPTY_ARRAY,                       // 或按需 (i)=>isElementDisabled(listRef.current[i])
  onNavigate(next) { if (next === null && !open.value) return; store.set('activeIndex', next); },
  focusItemOnHover: highlightItemOnHover,
});
const typeahead    = useTypeahead(floatingContext, {
  enabled: !readOnly && !disabled && (open.value || !multiple),
  listRef: labelsRef,
  activeIndex, selectedIndex,
  disabledIndices: (index) => isElementDisabled(listRef.current[index]),  // attribute-only
  onMatch(index) { if (open.value) store.set('activeIndex', index); else setValue(valuesRef.current[index], createChangeEventDetails(REASONS.none)); },
});

// 第 1 层：普通 mergeProps 一次性合并（每类 props 各自存 store 字段）
const mergedTriggerProps = mergeProps(typeahead.reference, listNav.reference, dismiss.reference, click.reference, interactionTypeProps);
const mergedPopupProps   = mergeProps(FOCUSABLE_POPUP_PROPS, typeahead.floating, listNav.floating, dismiss.floating);
const itemProps          = listNav.item ?? EMPTY_OBJECT;

store.useSyncedValues({
  open, mounted, transitionStatus,
  popupProps: mergedPopupProps,
  triggerProps: mergedTriggerProps,
  items, itemToStringLabel, itemToStringValue, isItemEqualToValue,
  multiple, modal, value, openMethod,
});

// 第 2 层（在 SelectTrigger/SelectPopup 的 useRenderElement 里，保事件链）：
// (prev) => mergeProps(prev, storeTriggerProps.value)   // 同 PopoverPopup.tsx:95
// (prev) => mergeProps(prev, storePopupProps.value)
```

## 文件证据
- packages/actview/src/floating-ui-actview/types.ts:124 (FloatingRootContext=FloatingRootStore), :166-171 (ElementProps)
- packages/actview/src/floating-ui-actview/hooks/useFloatingRootContext.ts:26-54 (:51 syncOnly:false)
- packages/actview/src/floating-ui-actview/components/FloatingRootStore.ts:127-136 (setOpen→onOpenChange)
- packages/actview/src/floating-ui-actview/hooks/useListNavigation.ts:223-226, :342-349 (react onNavigate), :587-599 (onNavigate(event))
- packages/actview/src/floating-ui-actview/hooks/useTypeahead.ts:69-72, :41 disabledIndices
- packages/actview/src/popover/popup/PopoverPopup.tsx:47, :95 (store popupProps + getter mergeProps(prev, ...))
- packages/actview/src/popover/trigger/PopoverTrigger.tsx:108 (读 store 'triggerProps')
- packages/actview/src/popover/root/PopoverRoot.tsx:79 (useSyncedValues({modal}))
- packages/react/src/select/root/SelectRoot.tsx:320-327, :336-351, :353-374, :377-414, :416-431, :433-477
- packages/actview-utils/src/isElementDisabled.ts:1-7 (attribute-only)
- packages/actview-utils/src/store/ActviewStore.ts:90-107 (useSyncedValues)
- packages/actview/src/select/store.ts:33-41 (State 有 triggerProps/popupProps/activeIndex)
- packages/actview/src/select/root/SelectRootContext.ts:11 (floatingContext 字段)
