# actview mergeProps / mergePropsN: 导入路径与语义

## 问题
actview 侧（packages/actview）的 mergeProps/mergePropsN 的导入路径是什么？语义如何：props 数组从左到右、getter（函数）接收 prev merged 并整体替换、事件处理器右到左执行、getter 返回对象里的 on* 会覆盖 prev 的 handler 吗？还是要用 `(prev) => mergeProps(prev, {...})` 才能保事件链？

## 结论（Evidence level: S6 — 全源码分析）
1. **导入路径**
   - 公开子路径：`@base-ui/actview/merge-props`（package.json:40 `"./merge-props": "./src/merge-props/index.ts"`；index.ts:1 `export * from './mergeProps';`）。
   - 包内相对路径：`../merge-props` 或 `../../merge-props`（如 CheckboxGroup.tsx:22）。
   - 导出符号：`mergeProps`、`mergePropsN`、`mergeClassNames`、`makeEventPreventable`。

2. **从左到右处理**：参数 a,b,c,d,e 依次 mergeInto（mergeProps.ts:71-85）；mergePropsN 数组循环 i=1..n（104-120）。JSDoc:30-33。

3. **getter 接收 prev merged 并整体替换**：`mergeInto` 中 `if (isPropsGetter(inputProps)) return resolvePropsGetter(inputProps, merged)`（131-136）——返回对象完全取代 merged，**不跑合并逻辑**。JSDoc:30-33 "The function is responsible for chaining event handlers if needed (that is, we don't run the merge logic)."

4. **事件处理器右到左执行**：JSDoc:22-25 "Event handlers are merged and called in right-to-left order (rightmost handler executes first, leftmost last). The rightmost handler can prevent prior (left-positioned) handlers from executing by calling event.preventBaseUIHandler()." 实现 mergeEventHandlers:232-252 先调 theirHandler（最右）再调 ourHandler（除非 baseUIHandlerPrevented）。

5. **getter 返回对象里的 on* 会“覆盖”prev 的 handler（不自动链式）**：mergeInto 直接返回 getter 对象；代码注释 mergeProps.ts:124 "Getter-returned handlers intentionally keep their existing semantics."；JSDoc:35-36（返回的 handlers 不会自动被 prevent，须自查 baseUIHandlerPrevented）。createInitialMergedProps:122-129 spread getter 结果，不经过 copyInitialProps（不 wrapEventHandler）。因此**要保事件链，getter 必须显式 `(prev) => mergeProps(prev, {...})`**，这样 {...} 里的 handlers 才会被 wrap 并和 prev 的 chained handler 合并。源码佐证：
   - PopoverTrigger.tsx:141-143 注释 "Getters must chain event handlers via `mergeProps`, otherwise the spread would overwrite handlers from earlier props (AD-20/AD-27)."
   - PopoverPopup.tsx:95-97 `(prev: any) => mergeProps(prev, popupProps.value)`。
   - 相对示例：PopoverTrigger.tsx:145-152 的 getter 返回 `{...prev, id, aria-*, ...}`（无新 on*，仅 spread prev 保留已 wrap 的 handlers）。

6. **其它**：ref 不合并（JSDoc:38）；className 右到左拼接右最左前（mergeClassNames:279-293 `theirClassName + ' ' + ourClassName`）；style 右最合并优先（169-175 用 mergeObjects）；mergePropsN 空数组返回 EMPTY_PROPS，length 1 走 createInitialMergedProps（104-120）；性能提示 ≤5 个 prop set 用 mergeProps（95-97）；makeEventPreventable:271-277 设 `event.preventBaseUIHandler = () => { event.baseUIHandlerPrevented = true }`；isPreventableEvent:300-302 actview 中任何 object 首参当作可 prevent 的原生事件。

## 文件证据
- packages/actview/package.json:40
- packages/actview/src/merge-props/index.ts:1
- packages/actview/src/merge-props/mergeProps.ts:22-38, 66-135, 224-253, 271-302
- packages/actview/src/popover/trigger/PopoverTrigger.tsx:141-152
- packages/actview/src/popover/popup/PopoverPopup.tsx:95-97

> 实战坑：props 链里无参 getter 会整体替换丢前面属性；每个 getter 须 `(prev)=>{...prev,...}` 保 id/children/事件链（根目录 plantform-diff.md AD-20/AD-26/AD-27/AD-35；见 actview-framework-adaptation-rules.md A 节）。
