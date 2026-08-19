# actview context-computed 变化为何不触发子组件渲染 getter：诊断与稳妥解法（combobox inputValue）

## 问题
AutocompleteRoot(mode both, autoHighlight) → AriaCombobox(selectionMode none)。输入 'Ap' → ArrowDown → AriaCombobox onNavigate → setIndices → onItemHighlighted 回调设 inlineInputValue='Apple' → resolvedInputValue computed 重算 'Apple'（日志✅）→ AriaCombobox inputValueValue 重算 'Apple'（日志✅）→ **ComboboxInput 的 useRenderElement props getter1（`value: composingValue.value ?? inputValue.value`）不重跑**（日志无输出）→ input.value 仍是 'Ap'。受控 value 同理。输入 'Ap' 时却生效（因 store 变化触发重渲染、getter 顺带读到新值）。stderr：`[actview] useInjects 只能在组件 setup 中调用`。另 aria-activedescendant 不同步。

## 框架事实（Evidence level: S6 — 源码链）
- **组件 render 读取在响应式 effect 内**：`mountComponent.ts` 用 `runEffect(update)`（render effect）包 `instance.render()`；render 里（含从 JSX 调用的 getElement/props getter）读 `.value` 都会被 track（reactive-system.ts:66-84）。**这是 store.useState 能触发重渲染的原因**（symptom 3 就是证明：open/mounted 变化 → store ref 变化 → render effect 重跑 → getter 重读 inputValue.value 得到 'Ap'）。
- **所以「getter 读 .value 没建立依赖」本身不成立**——只要读发生在 render 内就会被 track。关键在**读的是不是那个会变的 live computed、以及 live 是否依赖源**。
- 框架原生 `createContext`（E:\actview\packages\core\src\runtime\context.ts:55-76）：Provider 注入**普通 state ref** + `watch(value 变化同步 state)`，`use()` 返回注入 ref；render 里读 `.value` 即 track——**原生是响应式的**。
- combobox 用的是 **Base UI 自己的 `internals/createContext.tsx`**：Provider `live = computed(() => unref(props.value))` + `provide(key, live)`；`use()` = `useInjects(key) ?? computed(() => defaultValue)`（**useInjects 要求 setup 上下文**，lifecycle.ts:132-138：setup 外调用 → warn + 返回 undefined → use() 落到 fallback 常量 computed）。
- combobox 接线：AriaCombobox.tsx:1702 `<ComboboxInputValueContext.Provider value={inputValueValue}>`（value 传 ComputedRef）；ComboboxInput.tsx:60 setup 里 `useComboboxInputValueContext()` → 拿到 live computed；getter1（:198-221）读 `inputValue.value`。

## 诊断（按可能性排序）
1. **live 依赖链在 Provider 的 `computed(() => unref(props.value))` 处可能断裂**：`props.value` 是 Provider 的 shallowReactive prop（对象引用稳定：每次传同一 inputValueValue）→ 该 key 的 track 不触发；真正驱动是 `unref(props.value)` → `props.value.value`（inputValueValue 的 `.value`）。若 `isRef(computed)` 判定/读法有出入，live 不随 inputValueValue 重算 → 消费方不重渲染。**这是最可能的单点**，但需探针确认（下）。
2. **useInjects 警告 = 有调用方在非 setup 路径调 `useComboboxInputValueContext()`**（如某部分在 render getter/computed/回调里调）→ 该调用返回 fallback 常量 ''。这不影响 ComboboxInput（它在 setup 调，拿到了 live），但它是**独立真 bug**，要找出调用点。
3. 用户受控提示「useRenderElement 的 getter 执行不在响应式 effect 中？」——**否，在 effect 内**（见框架事实）。不是这个原因。

## 决定性探针（几分钟定位）
在 ArrowDown 后、getter 外打：
- `console.log('uid', inputValue === <live?>, inputValue.value)` —— 对比输入前；若 `inputValue.value` 已是 'Apple' 但 getter 没重跑 → **是「render effect 没订阅 live」（依赖没建立）** → 检查 Provider live 链 / 是否 fallback。
- 若 `inputValue.value` 仍是 'Ap' → **live 没随 inputValueValue 重算** → 单点就在 Provider 的 unref(props.value) 求值（检查 isRef/computed 标记）。
- `console.log('warnStack', new Error().stack)` 抓 useInjects 警告来源（谁在非 setup 调 use*）。

## 稳妥解法（推荐，避开 context-computed 追踪的脆弱点）
**把「可见值」路由进 store，让渲染走 `store.useState`（已被证明可靠）**——即 ComboboxInput 的`value` 由 store 的一个字段（如 `visibleInputValue`）提供，AriaCombobox 在 `setInputValue`/相关 watch 里写入；getter 改读 `store.useState('visibleInputValue')`。理由：
- store.useState 是该组件**已验证可靠**的重渲染路径（symptom 3 与 open/mounted 都是）。
- 与「inputValue 不能放 store」的旧因（React 版 store 有 inputValue 引发的问题）可拆开：只放「渲染用字符串」不进语义数据。
- 消除对「context computed 在 render 里必须被 track」的依赖——这是当前脆弱的环节。
次要：修 useInjects 警告（把非 setup 的 use* 调用上提到 setup，或改传 ref）。

## aria-activedescendant 不同步（用户问是否同类）
**大概率同类**：它在 input 上由某个（衍生自 context-computed 或未触发重算的）值驱动——检查它的数据源：若经 `inputProps.value.aria-activedescendant`（merge 进 getter，getter 没重跑 → 不更新）或 readValue 来自 activeIndex 的 store 派生（应随 store 更新，需确认 activeIndex 是否真的变了）。**修法同「走 store.useState + 由 store 派生」**，与 inputValue 一起解决。先跑探针确认数据源。

## 文件证据
- E:\actview\packages\core\src\runtime\mountComponent.ts:217-224（update → render → patch 在 effect 内）、:257-259（runEffect(update)）
- E:\actview\packages\core\src\reactivity\reactive-system.ts:66-84（run：shouldTrack=true 读被 track）
- E:\actview\packages\core\src\runtime\context.ts:55-76（框架原生 context：state ref + watch 同步，响应式）
- internals/createContext.tsx:21-37（combobox 用的：Provider live=computed(()=>unref(props.value)) + provide；use()=useInjects ?? fallback）
- E:\actview\packages\core\src\runtime\lifecycle.ts:132-138（useInjects 非 setup 返回 undefined + warn）
- combobox/root/AriaCombobox.tsx:1702（Provider value=inputValueValue）、:325-328（query）、:344-426（filter）
- combobox/input/ComboboxInput.tsx:60,198-221（inputValue + getter1 read）、:263-333（composingValue/onInput）
- combobox/root/ComboboxRootContext.tsx:67-69（useComboboxInputValueContext→use）
- actview-utils/src/store/useStore.ts:43-56（useState 订阅可靠重渲染）
