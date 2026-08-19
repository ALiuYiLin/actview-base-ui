# jsdom 不合成原生 button 的 Enter→click：useButton 键盘激活只对 native:false（AD-19）

## 问题本质
MenuTrigger（原生 `<button>`，`useButton(native:true)`）`fireEvent.keyDown(trigger, {key:'Enter'})` 后 popup 不出现；mousedown 打开成功。**真实浏览器原生 button 的 Enter→click 由浏览器合成（生产可用）；jsdom 不实现它 → keydown 后什么都不发生。是 jsdom 限制，不是组件 bug。**

## 机制（useButton S6）
- `useButton.ts:168`：`if (!shouldClick || nativeValue || (!isSpaceKey && !isEnterKey)) { ... return }`——**只要 `nativeValue===true`，整个条件立即 true → 直接 return**，不进入键盘激活块。
- `:185-188`：Enter→`dispatchClickWithModifiers(currentTarget, event)` 这段**只有非原生（native:false）才到得了**。
- `:170-171` 注释：「Space activates links on keyup... **Enter is left to the browser's native link activation**」。
- 合成 click 形状：`dispatchClickWithModifiers.ts:24-35` —— `new PointerEvent('click', { bubbles:true, cancelable:true, composed:true, detail:0, 各 modifier key })`；测试环境 `window.PointerEvent = window.MouseEvent` 兜底。

## 多组件对照（为什么有的通有的不通）
| 组件 | nativeButton | Enter 行为 |
|---|---|---|
| MenuTrigger | true（原生 button） | jsdom 不合成 → 无效 |
| SelectItem | false（div + role menuitem） | useButton 自己 Enter→dispatchClick → PointerEvent('click') → useClick 打开/提交 ✅ |
| Button（only nativeButton:false 测） | 见 Button.test.tsx:101-117 | 只对非原生测 keyDown Enter 合成 click |

## 修复
- **不推荐改组件**：把 nativeButton 默认改 false 会改变 DOM/语义（type/role），且与生产原生 button 行为偏离。
- **测试补手动原生激活**：
  ```ts
  fireEvent.keyDown(trigger, { key: 'Enter' });
  fireEvent.click(trigger);   // = 浏览器原生行为
  await waitFor(() => { expect(queryPopup()).not.toBeNull(); });
  ```
- 附带排查：ARIA 布尔 `'aria-hidden': true` 渲染成裸属性（PD-01）→ 用字符串 `'true'` 或 undefined。

## 文件证据
- internals/use-button/useButton.ts:168,170-171,185-188
- utils/dispatchClickWithModifiers.ts:19-35
- menu/trigger/MenuTrigger.tsx:49-50,108-111（nativeButton=true 默认）；select/item/SelectItem.tsx:33（nativeButton=false）
- button/Button.test.tsx:101-117（只测 nativeButton:false）
- test/setupVitest.ts（window.PointerEvent = window.MouseEvent）
- plantform-diff.md AD-19、PD-01
