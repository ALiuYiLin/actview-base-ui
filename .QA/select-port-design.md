# actview select 移植：SelectStore 设计 + Root 弹层组织 + 10 项基建清单（三篇合并）

> 合并自 select-selectstore-class-design / select-root-floating-organization / actview-select-infra-item-checklist。select 17/17 测试过。select 是单 trigger 组件，是后续 combobox/menu/autocomplete 的结构参照。

## 1. SelectStore class 设计
- **结论**：直接 `new SelectStore(initialState)`，**不要 PopupTriggerMap，context 可空**。extend `ActviewStore<Readonly<State>, {}, Selectors>` + `createInitialState` 补全省略字段（与 react `new ReactStore<State>({...})` 对齐）；旧 `type SelectStore = ActviewStore<State>` 改 class 后仍可作类型用。
- **为何 Menu/Popover 需要 PopupTriggerMap+context**：其 State extends `PopupStoreState`（popups/store.ts:12-81）有 payload/activeTriggerId/triggerElements/floatingRootContext 等多 trigger 基建，`triggerElements: PopupTriggerMap` 被 useHover/useDismiss 等消费（`hasElement/getById/entries`）。**select 单 trigger，State 只有单个 `triggerElement`**，不需要。
- **actview 的 refs/回调在组件层**：SelectRootContext（SelectRootContext.ts:9-40）已承载 listRef/popupRef/scrollHandlerRef/valueRef/valuesRef/labelsRef/typingRef/selectionRef/setValue/setOpen/onOpenChangeComplete/validation —— store 不需要这些方法（同 react ReactStore 无方法）。
- 若日后需要，context 里只放 `onOpenChange`/`onOpenChangeComplete`。

## 2. Root 弹层组织（floatingContext / 两层 mergeProps / onNavigate / typeahead）
- **floatingContext 不进 store，放 SelectRootContext**（react 一致；select State 无 floatingRootContext 字段，SelectRootContext.ts:11 已有该字段）。open 经 `useSyncedValues` 同步进 store。
- **两层 mergeProps（关键决策）**：
  - 第 1 层（Root 内）`mergeProps(typeahead.reference, listNav.reference, dismiss.reference, click.reference, interactionTypeProps)` **一次性普通合并**，结果经 `store.useSyncedValues({ popupProps, triggerProps, ... })` 存 store。
  - 第 2 层（SelectTrigger/SelectPopup 的 useRenderElement）用 **getter `(prev) => mergeProps(prev, storeProps.value)` 保事件链**（同 PopoverPopup.tsx:47,95 / PopoverTrigger.tsx:108）——因为 getter 整体替换且不自动连事件链（见 mergeprops-getter-chain.md）。
- **useClistNavigation 接线**：activeIndex 写 `store.set('activeIndex', next)`；`onNavigate(next){ if(next===null && !open) return; store.set('activeIndex', next) }`。typeahead `disabledIndices = (i) => isElementDisabled(listRef.current[i])`（attribute-only，避免 force-mounted 隐藏项被过滤；来自 `@base-ui/actview-utils/isElementDisabled`）。
- floatingContext 内部 `onOpenChange: setOpen`（FloatingRootStore.ts:127-136 setOpen→dispatchOpenChange→context.onOpenChange）；hooks 返回 `ElementProps {reference, floating, item, trigger}`（types.ts:166-171）。

## 3. 需要的 10 项基建（存在性 / 导入路径 / API 速查）
1. **COLLISION_AVOIDANCE**：`internals/constants` 的 `DROPDOWN_COLLISION_AVOIDANCE={fallbackAxisSide:'none'}`（:18-20）与 `POPUP_COLLISION_AVOIDANCE={fallbackAxisSide:'end'}`（:26-28）**两个都有**。
2. **COMPOSITE_KEYS**：在 `internals/composite/composite.ts:22`（`new Set([ArrowUp,ArrowDown,ArrowLeft,ArrowRight,Home,End])`）；composite/constants.ts 只有 `ACTIVE_COMPOSITE_ITEM='data-composite-item-active'`；composite/index.ts **不** re-export。导入 `../../internals/composite/composite`。
3. **LabelableContext/useLabelableContext**：`internals/labelable-provider/LabelableContext`（:5-44）；`useLabelableContext()` 返回 `.use()`；用法例 `lc.value.registerControlId(...)`（CheckboxRoot.tsx:50）。
4. **useDirection**：`internals/direction-context/DirectionContext` 或公开 `@base-ui/actview/direction-provider`；返回 `computed(() => DirectionContext.use().value?.direction ?? 'ltr')`（ComputedRef，读 `.value`）。（**注意 AD-42**：`use()` 须 setup 顶层调、computed 内只读 `.value`，见 combobox-context-render-reactivity.md）
5. **stateAttributesMapping/transitionStatusMapping**：共享 `transitionStatusMapping`（`internals/stateAttributesMapping.ts:18-28`）+ `getStateAttributesProps(state, customMapping)`；**没有全局 stateAttributesMapping 常量**——每组件自建同名变量；select popup 应复用 `popupTransitionStateMapping`（`utils/popupStateMapping.ts:108-115`）。
6. **InteractionType**：`@base-ui/actview-utils/useEnhancedClickHandler`（`'mouse'|'touch'|'pen'|'keyboard'|''`）。
7. **isVirtualClick**：`floating-ui-actview/utils/event` → 桶 `.../floating-ui-actview/utils` 可见。
8. **getFloatingFocusElement/contains/activeElement**：`floating-ui-actview/utils/element`（getFloatingFocusElement :82 原地；contains/activeElement/getTarget re-export 自 `@base-ui/actview-utils/shadowDom`）。
9. **@base-ui/actview-utils 通配导出 `"./*": "./src/*.ts"`**：一律 `@base-ui/actview-utils/<basename>`（useTimeout/useAnimationFrame/useIsoLayoutEffect/useControlled/usePreviousValue/useRefWithInit/useStableCallback/useValueAsRef/useId/useValueChanged/useOnFirstRender/useEnhancedClickHandler/isElementDisabled/shadowDom/empty/error…）；特例 `@base-ui/actview-utils/store` → `./src/store/index.ts`。API 要点：`useRefWithInit(init,arg)` 返回 `{current}`；`useValueAsRef(v)` 返回带 `.current` live getter；`useControlled` 返回 `ComputedRef & {setValueIfUncontrolled}`；`useStableCallback(fn)` 原样返回 fn（ActView 闭包天然稳定）。
10. **useToolbarRootContext(true)**：`toolbar/root/ToolbarRootContext`（重载 optional:true → `ComputedRef<T | undefined>`，false miss throw :21-25）；`{disabled, orientation}`；可选用法 `useToolbarRootContext(true).value != null`（PopoverPopup.tsx:40）。

## 文件证据
- packages/actview/src/select/store.ts:10-47,49,51-119；root/SelectRootContext.ts:9-40
- utils/popups/store.ts:12-81,83-117,119-136；utils/popups/popupTriggerMap.ts:28
- menu/store/MenuStore.ts:113-166；popover/store/PopoverStore.ts:74-165,107-119
- floating-ui-actview/types.ts:124,166-171；hooks/useFloatingRootContext.ts:26-54；components/FloatingRootStore.ts:127-136；hooks/useListNavigation.ts:223-226,342-349,587-599；hooks/useTypeahead.ts:41,69-72
- popover/popup/PopoverPopup.tsx:11,15,16,40,47,95；popover/trigger/PopoverTrigger.tsx:108；popover/root/PopoverRoot.tsx:79
- react/select/root/SelectRoot.tsx:137-163,320-327,336-351,353-374,377-414,416-431,433-477；react/select/store.ts:48
- actview-utils/...（constants/composite/labelable/stateAttributesMapping/popupStateMapping/useEnhancedClickHandler/shadowDom/package.json:13-17/useValueAsRef/useRefWithInit/useControlled/useStableCallback/isElementDisabled/ActviewStore.ts:11-27,90-107）
- toolbar/root/ToolbarRootContext.ts:5-28
