# mergeProps getter 链：整体替换丢属性 & spread 覆盖 on* handler → 必须 mergeProps(prev, X)

> 合并自 merge-props-actview-semantics + 各组件 spread 审计实例（menu/combobox/toast/select）。这是「基础语义 + 多组件实例」合一的问题档。

## 语义（actview mergeProps / mergePropsN）
- **导入路径**：公开 `@base-ui/actview/merge-props`（package.json `"./merge-props": "./src/merge-props/index.ts"`）；包内相对 `../merge-props` 或 `../../merge-props`。导出：`mergeProps`、`mergePropsN`、`mergeClassNames`、`makeEventPreventable`。
- **从左到右处理**：参数 a,b,c,d,e 依次 mergeInto（mergeProps.ts:71-85）；mergePropsN 数组循环（104-120）。
- **getter 接收 prev merged 并整体替换**：`if (isPropsGetter(inputProps)) return resolvePropsGetter(inputProps, merged)`（131-136）——返回对象**完全取代 merged，不跑合并逻辑**。「The function is responsible for chaining event handlers if needed (that is, we don't run the merge logic)」。
- **事件处理器右到左执行**：rightmost 先执行、leftmost 最后；rightmost 可 `event.preventBaseUIHandler()` 拦前面 handler（mergeEventHandlers:232-252）。
- **getter 返回对象里的 on* 会「覆盖」prev 的 handler（不自动链式）**：createInitialMergedProps:122-129 spread getter 结果、不 wrapEventHandler。**要保事件链，getter 必须显式 `(prev) => mergeProps(prev, {...})`**——这样 {...} 里的 handlers 才会被 wrap 并与 prev chained 合并。
- 其它：ref 不合并；className 右到左拼接（右者在前）；style 右最合并优先；`makeEventPreventable` 设 `preventBaseUIHandler`；isPreventableEvent:300-302（object 首参即当可 prevent 的原生事件）。

## 多组件实例（都是「spread 覆盖 on* 或 无参 getter 丢 props」的落地）
1. **menu（全目录审计，A 类必改 `mergeProps(prev, X)`）**：
   - MenuCheckboxItem.tsx:98-103 / MenuRadioItem.tsx:85-90：`{...prev, role,'aria-checked', onClick: handleClick}` spread **顶掉 listNav item.onClick，是实际 bug**（改 mergeProps 后 handleClick 才与 listNav.onClick 链式）。
   - MenuItem:63、MenuLinkItem:69、MenuCheckboxItem:97、MenuRadioItem:84（`{...prev,...itemProps.value}`，itemProps 含 listNav handlers）；MenuPopup:115、MenuViewport:47。
   - B 类（仅属性/aria、X 不含 on*，spread 安全）：arrow/group/group-label/backdrop/两个 indicator/radio-group/submenu-trigger:185。
   - **spread 安全判定**：X 不含 on* 键 ⇔ 属性级覆盖安全；`...elementProps`（用户可传 on*）视为隐患。
2. **combobox**：ComboboxInput 曾 `...inputProps.value` 顶掉 listNavigation.onKeyDown → 改 mergeProps 链。
3. **toast**：ToastAction 的 `actionProps` 用无参 getter `() => x` → 丢弃前面 getter/props（onClick/children/id）；修复 `(prev) => ({...prev, ...x})`。
4. **select（两层 mergeProps）**：第 1 层 Root 内 `mergeProps(typeahead.reference, listNav.reference, dismiss.reference, click.reference, ...)` 一次性普通合并 → `store.useSyncedValues`；第 2 层子组件 useRenderElement 用 **getter `(prev) => mergeProps(prev, storeProps.value)` 保事件链**（同 PopoverPopup.tsx:47,95 / PopoverTrigger.tsx:108）。

## 文件证据
- actview/src/merge-props/mergeProps.ts:22-38,66-135,224-253,271-302；package.json:40
- menu/item/MenuItem.tsx:63；checkbox-item/MenuCheckboxItem.tsx:97,98-103；radio-item/MenuRadioItem.tsx:84,85-90；popup/MenuPopup.tsx:115,118,126；viewport/MenuViewport.tsx:47,48
- popover/trigger/PopoverTrigger.tsx:141-152（注释「Getters must chain event handlers via mergeProps…AD-20/27」）；popover/popup/PopoverPopup.tsx:95-97
- toast/action/ToastAction.tsx:38；select/root/SelectRoot（两层 mergeProps）
- plantform-diff.md AD-20/26/27/35
