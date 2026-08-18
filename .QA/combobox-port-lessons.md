# actview combobox 移植关键易错点（watch 数组误置函数 / computed 内调 hook / listRef 响应式 / floating 同步 / onInput）

> 提炼自 combobox 完整移植（16/16 测试过）的 10 个难点。**只记可复用的通用模式**；AI-003/mergeProps getter/JSX 条件渲染/aria 字符串化等已见 ai003-return-shape-checklist / menu-mergeprops-audit / toast-render-diagnostics / actview-framework-adaptation-rules，此处不重复、只交叉引用。

## 1. watch 数组源不能放函数/方法调用（会被当 getter 执行）
- **坑**：把 `setIndices`（store 方法）等直接放进 `watch([a, setIndices, c], ...)` 的依赖数组——actview 的 watch 数组源把**每个函数元素当 getter 调用**（watch.ts:138-144 `typeof s === 'function' ? s() : s`）。setup 早期同步执行 `runJob` 收集依赖时 store 尚未就绪 → 在 getter 里解构 store 状态 → `Cannot read properties of undefined (reading 'activeIndex')`。
- **规则**：watch 数组源只放**纯响应式源**（ref / `() => ref.value` 标量 getter）；逻辑/方法调用放**回调体内**。与「addEventListener 不从 watch 数组解构 element、回调体内读 ref」(toast-port-fixes §1) 同一原则。

## 2. computed 内不能调用 context hook（useInjects 只能在组件 setup）
- **坑**：把 `useComboboxPositionerContext()` / `useBaseUiId()` 放进 `computed(() => ...)` 体内——computed 惰性求值可能发生在 setup 之外（依赖变更重算时）→ actview 报 `useInjects 只能在组件 setup 中调用`（且 useBaseUiId 每次重算会泄漏全局 id）。
- **规则**：hook 只在组件 setup 顶层调用一次，把拿到的值/ref 放进 computed 读取（`computed(() => context.value.x)`），不要在 computed 内调 hook。

## 3. actview keyed diff 不重触发 ref callback → 结构类 ref 要响应式驱动
- **坑**：`items` prop 过滤后 `CompositeList` 用 **stale DOM 覆盖 listRef**（长度对但元素错乱），因为 actview 的 keyed diff 复用 DOM 节点、**不会重跑 ref callback**；且 Item 的 `index` 是 setup 快照，不随过滤更新。
- **修复开销大（combobox 采用组合拳）**：
  - `items` prop 时 `ComboboxList` **跳过 CompositeList**（listRef 由 AriaCombobox 的 `valuesRef` watch 维护 length）；
  - Item 走**响应式 `indexFromFilter` 分支**（`computed` {value} 传给 virtualized/Inner，渲染处 `computed(() => indexFromFilter.value)` 解包跟随过滤）；
  - `useStore` 的 **a1 参数传 index ref 而非快照**（store selector 参数支持 ref，unref 后求值，useStore.ts:43-52）；
  - Chip 的 `useCompositeListItem({ guess: true })`（render 顺序 seed index，规避 ref 不重触发）。
- **通用规则**：结构型 ref（listRef/elementsRef 等靠 ref callback 填充的）在 keyed diff 下是不可靠的，改用响应式（mapTick watch/自身维护 length）。

## 4. 手动同步 floatingRootContext 的 reference/floating（useListNavigation 分支不执行）
- **坑**：把组件自己的 `open` 同步到 store，但 `store.select('open')` 恒 false（组件 open 与 floatingRootContext.open 未同步）→ useListNavigation 走「重新打开」分支而非导航分支；且 **floatingElement 为 null 时 useListNavigation 的 456 分支（indexRef 同步）不执行** → 键盘上下导航完全失效。
- **修复**（select 模式）：对 store 持有的 floatingRootContext，**手动 `watch([...])` 同步 reference/floating**（useFloatingRootContext 只在自己创建时同步；store 持有的需要手动）。`useSyncedFloatingRootContext`（menu 用）做 sync；combobox 若用 store 持的 floatingRootContext 要补 watch 把 `activeTriggerElement/positionerElement` 同步进 `floatingRootContext.referenceElement/floatingElement`。
- **useListNavigation 的 activeIndex/selectedIndex 要传 ref**（`activeIndex.value as unknown as number` 或 ref）使内部 watch 追踪外部驱动，而非快照。

## 5. actview 监听原生 input 事件：onInput 而非 onChange + fireEvent.input 带 inputType
- **坑**：actview 无 React 合成 onChange(=输入即触发)；`onChange` 是原生 change（失焦才触发）。受控文本必须用 **`onInput`**（ComboboxInput.tsx:274 `onInput(event: InputEvent)`）。
- **测试**：`fireEvent.input(input, { target: { value: 'x' }, inputType: 'insertText' })` ——**必须带 `inputType`**，否则 combobox 的 `isTypedInput` 判定（区分 compositionend/insertReplacementText）把它当非输入事件。
- 同类：textarea/input/combobox 的受控值都用 onInput（对照 plantform-diff PD-03 onChange 语义）。

## 6. 其余（已见他处，仅记录组合点）
- AI-003：ComboboxGroup `return wrappedElement`（变量）→ `<>{wrappedElement}</>`（见 ai003-return-shape-checklist）。
- setup 内 `if (!shouldRender) return null` 提前返回固定 → JSX 内联条件渲染（Portal/Clear/ItemIndicator；见 AD-34）。
- props getter 展开覆盖 on* → mergeProps 链（ComboboxInput 曾 `...inputProps.value` 顶掉 listNavigation.onKeyDown；见 menu-mergeprops-audit 规则）。
- aria-hidden 布尔裸渲染（PD-01）→ 查询用 `[aria-hidden]`（属性存在性）。
- createRenderer `render(Component, props)` 而非 `render(<JSX/>)`；函数 children 类型与 HTMLAttrs 交叉被拒 → `props: any`/辅助函数（见 actview-test-infra-patterns）。

## 文件证据
- E:\actview\packages\core\src\reactivity\watch.ts:138-144（数组源函数元素当 getter）
- actview-utils/src/store/useStore.ts:43-52（a1 参数 ref unref；useState('key', indexRef)）
- combobox/item/ComboboxItem.tsx:27,61-67,224,255,265（indexFromFilter 响应式分支 + guess）
- combobox/chip/ComboboxChip.tsx:37-40（useCompositeListItem guess + 注释）
- combobox/list/ComboboxList.tsx:111-119（items prop 跳过 CompositeList）
- combobox/input/ComboboxInput.tsx:203,274（inputProps + onInput）
- combobox/portal/ComboboxPortal.tsx:28（JSX 条件渲染）
- combobox/group/ComboboxGroup.tsx:53（AI-003 <>{wrappedElement}</>）
- floating-ui-actview/hooks/useListNavigation.ts（456 分支：floatingElement 驱动 indexRef 同步）
- 复用处：actview-framework-adaptation-rules / ai003-return-shape-checklist / menu-mergeprops-audit / toast-port-fixes / actview-test-infra-patterns / toast-render-diagnostics / combobox-test-isolation
