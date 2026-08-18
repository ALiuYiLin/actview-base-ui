# actview combobox 测试隔离：「filters items while typing」suite 失败 = 空查询本来就不过滤（+ 残留 DOM 需核实）

## 问题
combobox 16 用例：单跑「filters items while typing」通过，整套跑时失败——`expect(list.textContent).not.toContain('Banana')` 收到 "AppleBananaCherry"（完整列表）。前一个用例是「Escape 关闭」（mouseDown 打开→Escape 关）。候选：store watch 未清理？transitionStatus AnimationFrame？全局 filterCache？清理机制是否可靠？现有隔离模式？

## 结论（Evidence level: S6 — 全源码分析）
### 1) 首选根因：测试本身输出了**空查询 `''`** → 过滤天然不生效（不是隔离问题）
- `AriaCombobox.tsx:409-413`：`if (filterQueryValue === '') return limit>-1 ? flatItems.slice(0,limit) : flatItems` ——**空查询 = 显示全部**，没有可过滤的内容。
- 该用例 `fireEvent.input(input, { target: { value: '' }, inputType: 'insertText' })`（Combobox.test.tsx:295）→ `setInputValue('')`（AriaCombobox.tsx:620-696）→ `query = ''`（:325-328）→ `filterQuery = ''`（:344-346）→ `filteredItems` = 全部（:409-413）→ "AppleBananaCherry"。
- **"过滤未生效"其实是"空查询本就无过滤"**。`not.toContain('Banana')` 在空查询下必然失败。无论单跑/套跑都应失败——单跑通过更像巧合/观察偏差，或单跑里 popup 没开使 waitFor 走不同路径。
- **修复测试**：输入真实子串（如 `{ value: 'Ap' }`）→ 才过滤到 Apple；断言才成立，且绕开空查询歧义。

### 2) 候选隔离源排查（均被证据排除）
- **AnimationFrame**：`resetAnimationFrameScheduler()` 在 setupVitest afterEach 调用（useAnimationFrame.ts:83-102 明确注释：scheduler 是进程全局，跨测试残留回调会跑；测试间调用丢弃）。→ 过渡帧不会泄漏。
- **closeQuery 冻结**：是**每次 mount 的组件内 ref**（AriaCombobox.tsx:222，新 render=新 ref）；且前一用例 Escape **从未输入** → `queryChangedAfterOpen` 保持 false → `setOpen(false)` 不进 `closeQuery.value = query.value` 冻结分支（:750-781）。→ 本配对无残留。
- **全局 filterCache**：combobox 无模块级 filter 缓存；filter 是 per-root 的 `useCoreFilter`/`createCollatorItemFilter`。
- **残留 DOM（未 100% 排除，需核实）**：combobox 用与 menu/popover 相同的 `FloatingPortal`（ComboboxPortal.tsx:29），portal 节点带 `data-base-ui-portal`（FloatingPortal.tsx:57 `createAttribute('portal')` → `data-base-ui-portal`），afterEach（Combobox.test.tsx:31）会清。但**清理是移除节点、不跑 unmount 钩子**（@actview/testing cleanup 只删容器）——若前一用例的 popup 处于退出动画中（mounted 仍 true）时容器被删，portal 子树可能残留 → 下一个测试的**全局** `document.querySelector('[data-testid="list"]')`（helper :41-43）命中旧列表 → 恰好显示 "AppleBananaCherry"。**验证**：失败测试开头 `console.log(document.body.innerHTML)` 看有无旧 list；若有就是它。

### 3) 清理机制可靠性（Q2）
- `useStore` 在组件 unmount 时 `onUnmounted(unsubscribe)`（useStore.ts:54）；watch/effect 注册进组件 EffectScope，unmount 时 scope.stop 停止（mountComponent.ts:276-278）。
- **但 `@actview/testing` 的 `cleanup()` 只删除 render 容器、不跑 ActView unmount 钩子**（popover/toast QA 已确立）→ 订阅/unmount 清理**不执行**。现有的每测试清理是：setupVitest afterEach（vi.resetAllMocks / cleanup / resetError / resetAnimationFrameScheduler / BASE_UI_ANIMATIONS_DISABLED）+ 各测试文件 afterEach 删 `[data-base-ui-portal], [data-base-ui-focus-guard]`。
- **缺口**：任何挂在 `document.body`（非这两个选择器）的节点/全局监听/模块级资源会残留。combobox 无额外模块级资源；主要风险是 portal 子树未在 unmount 前收尾。

### 4) 现有隔离模式（Q3）
- select/menu/popover/toast 用**完全相同的 afterEach**（`[data-base-ui-portal], [data-base-ui-focus-guard]`）且全过——这是弹层测试的规范充分清理（含 setupVitest 的全局 resets）。
- combobox 已复制同样 afterEach，若仍残留，差异在 combobox 自身：确认是否有非 `[data-base-ui-portal]` 悬挂节点，或前一用例 close 未等过渡完成。
- **可操作建议**：① 修测试输入真实子串（首要）；② 失败测试前 dump body.innerHTML 核实残留 DOM；③ 若确认残留，扩展 afterEach 选择器或让前一用例 `await waitFor` close 过渡完成后再结束；④ 始终在 render 容器内查询（createRenderer 返回的 `result` 的 container 查询）避免全局 document 命中残留。

## 文件证据
- combobox/root/AriaCombobox.tsx:325-328（query）、:335-346（shouldBypassFiltering/filterQuery）、:359-426（filteredItems；:409-413 空查询=全部）、:620-696（setInputValue）、:750-781（closeQuery 冻结仅在 queryChangedAfterOpen）
- combobox/Combobox.test.tsx:289-303（失败用例输入 ''）、:31（afterEach 选择器）、:41-43（queryList 全局查询）
- combobox/portal/ComboboxPortal.tsx:29（FloatingPortal 同款）
- floating-ui-actview/components/FloatingPortal.tsx:57（createAttribute('portal')→data-base-ui-portal）
- actview-utils/src/useAnimationFrame.ts:83-102（resetAnimationFrameScheduler 测试间丢弃）、setupVitest afterEach 调用
- actview-utils/src/store/useStore.ts:54（unmounted unsubscribe）；E:\actview\packages\core\src\runtime\mountComponent.ts:276-278（scope.stop）
- 参照：popover/menu/select/toast 测试同款 afterEach（均过）
