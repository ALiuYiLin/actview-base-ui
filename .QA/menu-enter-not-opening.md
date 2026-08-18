# actview menu：Enter 打不开（native button 键盘激活被 useButton 留给浏览器，jsdom 不合成）诊断

## 问题
MenuTrigger（原生 `<button>`，useButton(native: true)）`fireEvent.keyDown(trigger, {key:'Enter'})` 后 popup 不出现；mousedown 打开成功。select item（div、nativeButton:false）Enter 就能提交。为何 menu trigger 与 select item 行为不同？

## 结论（Evidence level: S6 — 全源码分析）
**根因：useButton 的键盘→合成 click 路径只对 `native: false` 触发；原生 `<button>` 的 Enter 激活被 useButton 刻意「留给浏览器原生行为」，而 jsdom 不合成它 → keydown 后什么都不发生。**

### useButton 关键逻辑（useButton.ts）
- `:168` `if (!shouldClick || nativeValue || (!isSpaceKey && !isEnterKey)) { ... return }`：**只要 `nativeValue===true`，整个条件立即为 true → 直接 return**，不进入键盘激活块。
- `:185-188` Enter→`dispatchClickWithModifiers(currentTarget, event)` 这段**只有非原生（native:false）才到得了**。
- `:170-171` 注释明确：「Space activates links on keyup... **Enter is left to the browser's native link activation**」——原生按钮的 Enter 走浏览器原生激活，useButton 不合成。
- 结论：**MenuTrigger（nativeButton=true 默认）的 Enter 依赖浏览器原生 button 激活，jsdom 不实现 → 测试里 keyDown Enter 无效。**

### 与 select item 的差异（为什么 select item 通）
- select item：`SelectItem.tsx:33 nativeButton = false`（`<div>` + role menuitem）→ 走 useButton 非原生路径 `:185` → Enter keydown → `dispatchClickWithModifiers` → 合成 `PointerEvent('click')` → useClick.onClick → 打开/提交。**所以 select item Enter 通，menu native button 不通——正是 native 与非 native 的分支差异。**

### dispatchClickWithModifiers（合成 click 的形状）
`dispatchClickWithModifiers.ts:24-35`：`new (ownerWindow(target).PointerEvent)('click', { bubbles:true, cancelable:true, composed:true, detail:0, shiftKey/ctrlKey/altKey/metaKey })`——合成 click 为 PointerEvent('click')，detail=0（键盘约定）；`setupVitest` 已 `window.PointerEvent = window.MouseEvent` 兜底。

### 修复方向
**这是 jsdom 限制，不是组件 bug**——真实浏览器里原生 `<button>` 的 Enter→click 由浏览器合成，menu 生产环境 Enter 可开。测试需**手动补原生激活**：
```ts
fireEvent.keyDown(trigger, { key: 'Enter' });
fireEvent.click(trigger);            // jsdom 不合成原生 button 的 Enter→click，手动补 = 浏览器原生行为
await waitFor(() => { expect(queryPopup()).not.toBeNull(); });
```
- 依据：Button.test.tsx 只对 **nativeButton:false** 测 keyDown Enter 合成 click（:101-117）；原生 button 键盘激活不测（jsdom 不合成）。既有的 jsdom 原生 button 键盘激活说明见 plantform-diff.md AD-19。
- 若想不改测试、改组件：把 MenuTrigger 的 `nativeButton` 默认改为 false（非原生 + role button）→ useButton 会自己 Enter→click。但会改变 DOM/语义（type/role），且与生产原生 button 行为偏离——**不推荐**，除非该组件本就设计为非原生。

### (2)(3) 附带
- **(2) submenu mousedown 打不开**：MenuSubmenuTrigger `nativeButton:false`（:33），`useClick({ event:'mousedown', toggle: !openOnHover, ignoreMouse: openOnHover, stickIfOpen:false })`（:138-144）。openOnHover=false → toggle=true、ignoreMouse=false → mousedown 应触发 click.reference 的 onMouseDown → open。需另查（很可能：submenu 在 MenuPopup 内、依赖父菜单先开；或 localInteractionProps=click.reference 的 onMouseDown 与 toggle/事件判定在 jsdom 下 detail 伪值相关）。非本问题核心，另行二分。
- **(3) arrow aria-hidden=true 渲染裸属性**：PD-01（actview 布尔 true → 空串）。修法：`'aria-hidden': true` 改字符串 `'true'` 或 `undefined`（条件化）。

## 文件证据
- internals/use-button/useButton.ts:168（nativeValue → 直接 return）、:170-171（注释：Enter 留给浏览器）、:185-188（非原生 Enter→dispatchClickWithModifiers）
- utils/dispatchClickWithModifiers.ts:19-35（合成 PointerEvent('click', detail:0)）
- menu/trigger/MenuTrigger.tsx:108-111（useButton({ native: nativeButton }), nativeButton=true 默认 :49-50）
- select/item/SelectItem.tsx:33（nativeButton=false → Enter 通）
- menu/submenu-trigger/MenuSubmenuTrigger.tsx:33,138-144（nativeButton:false, useClick mousedown/toggle/ignoreMouse）
- button/Button.test.tsx:101-117（只对 nativeButton:false 测 keyDown Enter 合成 click）
- plantform-diff.md AD-19（jsdom 原生 button 键盘激活：jsdom 不合成，测试需手动补 fireEvent.click）、PD-01（布尔 true 空串）
- test/setupVitest.ts（window.PointerEvent = window.MouseEvent）
