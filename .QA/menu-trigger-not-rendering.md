# actview menu 移植：全部测试 trigger 查不到（子树被静默丢弃）诊断

## 问题
Menu 组件测试全挂：`document.querySelector('[data-testid="trigger"]')` 全为 null；仅「renders nothing while closed」通过（它只查 popup/item 为 null，不查 trigger）。结构：createRenderer.render(SimpleMenu) → MenuRoot > MenuTrigger + MenuPortal(>MenuPositioner>MenuPopup>MenuItem)。

## 结论（诊断方向，Evidence level: S6 — 结构分析 + 机制比对该会话其余诊断）
**症状高度符合「MenuRoot（顶层组件）setup 抛错 → actview render effect 捕获错误 → 整个子树被静默丢弃」**：actview 顶层组件渲染错误走 `handleError`（mountComponent.ts:99-118 → console.error('[actview] 组件渲染错误:', err)），被 ErrorBoundary/try-catch 吞掉后子树不挂载 → trigger 与 popup 全为 null。「closed 测试通过」是**假阳性**（它断言的 popup/item 恰好也因崩溃而 null）。

### 确认步骤
- 看测试运行时的 console：应为 `[actview] 组件渲染错误: <具体 err>`。err 就是根因（多半是 TypeError/undefined is not a function，或对 null 读取属性）。
- 若没打印：用最小二分——把 MenuRoot 的 `useSyncedFloatingRootContext`、`useDismiss/useListNavigation/useTypeahead`、`useOpenInteractionType`、`useRefWithInit(() => store.update({inactiveTriggerProps: inactiveTriggerProps.value}))` 逐个注释（分别跑 closed 测试），定位抛错点。

### 与已验证 popover/select 的结构差异（重点怀疑）
1. **Popover 把浮动交互（useDismiss 等）放在 `PopoverInteractions` 里 `{shouldRenderInteractions.value && <PopoverInteractions/>}` 条件挂载（open/mounted 才有）**；**MenuRoot 却在 setup 里无条件调用 `useDismiss`/`useListNavigation`/`useTypeahead`，并立刻求值 `activeTriggerProps/inactiveTriggerProps/popupProps` 三个 computed，还 `useRefWithInit(() => store.update({ inactiveTriggerProps: inactiveTriggerProps.value }))` 强制在首帧同步求值**（MenuRoot.tsx:375-467）。若任一所依赖 selector/context 在「刚挂载、closed、无元素」的 store 上取不到 → setup 抛错 → 整树丢弃。这是菜单/popover 最大差异，优先查。
2. **.ts 文件里返回 null 的组件（AD-31）**：MenuRoot.tsx:519 `{handle && <PopupHandleAttachment .../>}`——测试无 handle 不渲染，排除；但 Menu 树里其它 bare `return null` 的组件（若在 .ts）会 DOMException（AI-003/AD-31 既有）。Grep 排查。
3. **selector 存在性**：MenuStore 的 selectors（MenuStore.ts:50-100）已含 triggerProps/isTriggerActive/isOpenedByTrigger/triggerPopupId（来自 popupStoreSelectors）与 disabled/modal/openMethod/activeIndex/… —— 若 `useState` 传了不存在 selector 会抛 undefined 调用错。核对 MenuTrigger 用到的每个 `store.useState(...)` 的 key 都存在。
4. **MenuPortal 在 closed 时不渲染子组件**（MenuPortal.tsx:35 `{shouldRender.value && createElement(FloatingPortal,...)}`），所以 MenuPositioner/MenuPopup/MenuItem 在初始 closed 渲染不挂载——**崩溃源只能是 MenuRoot 或 MenuTrigger**（及它们 setup 直接调用的 hook），别往 popup 方向查。
5. **enabled 机制确认**：MenuTrigger 的 `useRenderElement('button', ..., { enabled: !isInMenubar })` 在独立菜单下 `isInMenubar=false` → enabled=true → 应渲染 button；若 `enabled` 误判为 false，getElement() 返回 null → 无 button（但不抛错、不拖垮 popup）。若确认无 console 错误，此是第二嫌疑：查 `useMenuParent()` 的 `parent.value.type=== 'menubar'` 是否被误命中。

## 复用的既有结论
- 顶层组件抛错→整树静默丢：与 toast 的 AI-003/AD-31 同机制（见 toast-render-diagnostics.md §1）。trigger null + closed 假通过完全吻合。
- 若错误来自「setup 解构冻结响应式值」则不会整树丢（只更新不生效），与本症状（首帧就不渲染）不同——本症状更像"首帧即抛错"。

## 文件证据
- E:\actview\packages\core\src\runtime\mountComponent.ts:99-118（handleError→console.error+吞错）、:233-236（render 错误 capture）
- menu/root/MenuRoot.tsx:375-467（useDismiss/useListNavigation/useTypeahead + 三个交互 props computed + useRefWithInit 强制首帧求值 inactiveTriggerProps）、:519（PopupHandleAttachment 条件渲染）
- menu/trigger/MenuTrigger.tsx:60-67（store 获取/throw）、:169-214（floating hooks）、:225-254（props 数组）、:271-277（useRenderElement enabled）、:283-294（return JSX + getElement）
- menu/portal/MenuPortal.tsx:35（closed 不渲染子）
- menu/positioner/MenuPositioner.tsx（closed 下不挂载）
- menu/store/MenuStore.ts:50-100（selectors 清单）
- actview-issue.md AI-003 / plantform-diff.md AD-31（.ts 裸 return null → DOMException）
