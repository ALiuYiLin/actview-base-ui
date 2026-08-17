# Base UI React → ActView 框架差异记录（Platform Diff）

> 目的：记录 **React 与 ActView 框架行为差异**（编号 PD-NN），以及**为保持现有功能所做的适配说明**（编号 AD-NN）。
> 每个 PD 条目格式：编号 / 标题 / 场景 / 代码示例 / 渲染后示例（或行为对比）。
> 新差异持续追加；适配随代码演进更新。

---

## 第一部分：框架差异（Platform Diff）

### PD-01 aria-* 布尔属性渲染
- **标题**：aria-* 布尔属性的渲染值不同
- **场景**：`aria-disabled`、`aria-checked`、`aria-required` 等布尔型 ARIA 属性
- **代码示例**：
  ```tsx
  // React（源）
  <button aria-disabled={disabled} />
  ```
- **渲染后示例**：
  - React：`<button aria-disabled="true">`（布尔值字符串化；false 渲染为 `"false"` 不移除）
  - ActView：`<button aria-disabled="">`（setProp 统一处理：`true → setAttribute(key,'')`，`false → removeAttribute`）——不符合 ARIA 规范（规范要求 "true"/"false"）
- **适配**：库代码把 `aria-*` 布尔值输出为字符串，如 `aria-disabled: disabled ? 'true' : undefined`（actview 对字符串原样输出）。相关文件：`useFocusableWhenDisabled` 等。
- **状态**：已记录，待执行方案 B（规范化）或保持（测试按存在性断言，见 issue #20）

### PD-02 组件级 ref 指向组件实例
- **标题**：组件的 `ref` prop 指向**组件实例**而非根 DOM 元素
- **场景**：用户给组件传 `ref`（如 `<Button ref={el => ...}/>`）；actview 的 mountComponent 在 setup 执行**前** `delete props.ref`，并把 ref 回调以**组件实例**调用
- **代码示例**：
  ```tsx
  <Button ref={(node) => (instance = node)} />
  ```
- **渲染后示例**：React 的 `node` 是 `<button>` DOM 元素；ActView 的 `node` 是内部组件实例对象（无 tagName）
- **适配**：DOM 引用通过 ① render 元素 ref（`render={<button ref={...}/>}`），② 组件内部 ref（如 useButton 的 buttonRef），③ 直接 DOM 查询
- **状态**：已记录（issue #21）

### PD-03 onChange 语义
- **标题**：`onChange` 是原生 `change` 事件（React 的 onChange = input 事件，每次输入都触发）
- **场景**：受控文本框（input/combobox/number-field 等）的值变化监听
- **代码示例**：
  ```tsx
  <input onChange={handler} />   // React：每次输入触发
  ```
- **渲染后示例**：React 输入 "abc" 触发 3 次 onChange；ActView 只有失焦/回车才触发 change
- **适配**：受控文本输入统一改用 `onInput`（每次输入触发）；checkbox/radio/select 的 onChange 原生语义正确无需改

### PD-04 无合成事件
- **标题**：事件是**原生 DOM 事件**，无 React 合成事件包装（无池化、无 `event.nativeEvent`）
- **场景**：任何事件处理（`event.nativeEvent`、`event.currentTarget` 类型）
- **代码示例**：
  ```tsx
  // React
  onClick={(e) => e.nativeEvent.defaultPrevented}
  // ActView
  onClick={(e) => e.defaultPrevented}   // e 就是原生事件
  ```
- **适配**：删除所有 `event.nativeEvent` 用法；`React.MouseEvent` 等类型改原生类型

### PD-05 class / className
- **标题**：`class` 与 `className` 都映射到元素 className（SVG 走 setAttribute）
- **场景**：样式类传递
- **代码示例**：`<div class="a" className="b" />`
- **渲染后示例**：两者都生效，`className` 属性名原样保留在 props 上也被正确映射
- **适配**：公共 props 名保留 `className`（React 兼容）；内部统一用 `class`

### PD-06 组件函数只执行一次（setup）
- **标题**：组件函数体只执行一次（setup），返回的 JSX 被包成 render 函数每次更新执行
- **场景**：派生逻辑、props 对象构造、条件渲染的位置
- **代码示例**：
  ```tsx
  function App() {
    const count = ref(0)
    function inc() { count.value++ }
    return <div onClick={inc}>{count.value}</div>   // ② render：每次更新执行
  }
  // 编译后
  const App = defineComponent(function () {
    const count = ref(0)                            // ① setup：只执行一次
    return () => <div onClick={inc}>{count.value}</div>
  })
  ```
- **适配**：派生值用 `computed`；props 对象构造放 getter（`getXxxProps()` 在 JSX 内调用）；setup 层禁止解构 props（PD-17）

### PD-07 组件必须以 return JSX 结尾（babel 转换）
- **标题**：babel 转换只把「最后 return 为 JSX/null/含 JSX 的三元」的组件包成 defineComponent；`return getElement()`（调用表达式）不转换 → 裸函数进入运行时崩溃
- **场景**：任何组件函数
- **代码示例**：
  ```tsx
  // ❌ 不转换（运行时崩）
  return getElement()
  // ✅ 转换
  return <>{getElement()}</>
  ```
- **适配**：所有组件统一 `return <>{getElement()}</>`（issue #19）

### PD-08 JSX 标签不支持成员表达式 / 动态组件
- **标题**：JSX 标签不支持成员表达式 `<A.b />`（oxc 解析器拒绝）；动态组件用内置 `<component is={Comp} />`
- **场景**：动态渲染不同组件
- **代码示例**：
  ```tsx
  // ❌ 解析错误
  <Current.value {...state} />
  // ✅ 动态组件（is 在 render 内求值，天然响应）
  <component is={Current.value} {...state} />
  ```
- **渲染后示例**：成员表达式报 `Expected '>' but found '{'`；`<component is>` 正确渲染目标组件

### PD-09 含 JSX 的文件必须 .tsx
- **标题**：`.ts` 文件中的 JSX 不被 vite oxc 处理（actview 插件只转 .tsx/.js）
- **场景**：非组件文件含 JSX（如 createContext.tsx、测试工具）
- **适配**：含 JSX 一律 `.tsx` 后缀

### PD-10 store 订阅返回 Ref
- **标题**：`store.use(selector)`（原 useSyncExternalStore 等价物）返回 `Ref`，需读 `.value`
- **场景**：所有 store 状态读取
- **代码示例**：`const open = store.useState('open')` → 渲染内 `open.value`
- **适配**：全局统一 `.value` 读取

### PD-11 useId 无 SSR 稳定 id
- **标题**：actview 无 React.useId 的 SSR/hydration 稳定 id 等价物（进程内自增）
- **场景**：组件生成 id（useId/useBaseUiId）
- **适配**：JSDoc 注明 SSR 下 id 可能与客户端不一致；label id 在 setup 读一次

### PD-12 useIsoLayoutEffect 无 layout 阶段
- **标题**：actview 无 layout phase，`useIsoLayoutEffect` 等价于 onMounted（挂载后执行）
- **场景**：需要在 DOM 提交前测量/写样式的场景
- **适配**：挂载后同步执行；需要响应 deps 的场景用 `watch(..., {immediate:true})`

### PD-13 useForcedRerendering 不存在
- **标题**：actview 无 forceUpdate（`setState({})` 等价物）
- **场景**：依赖外部变化强制重渲染（TabsIndicator、NumberFieldRoot）
- **适配**：本地 tick ref 模式：
  ```tsx
  const tick = ref(0)
  const rerender = () => { tick.value++ }
  // 在 render 表达式/getter 内读一次 tick.value 建立依赖
  ```

### PD-14 reactive 不能整体重赋值
- **标题**：`reactive` 变量整体重新赋值会丢代理
- **场景**：`state = {...}` 模式
- **适配**：改属性，或整体替换用 `ref({...})` + `.value = {...}`

### PD-15 props 原地更新，setup 解构冻结
- **标题**：props 是 shallowReactive 代理，父更新时原地写（updateProps）；setup 层解构 props 会捕获旧值
- **场景**：任何 props 读取
- **代码示例**：
  ```tsx
  // ❌ setup 解构：父更新后不刷新
  const { count } = props
  // ✅ render/getter 内读
  props.count
  ```
- **适配**：getter/JSX 内读 `props.x`；rest props 用 `getElementProps()` 函数内解构

### PD-16 测试 API 差异
- **标题**：`@actview/testing` 的 `render(组件)` 不接受 props；`getByText` 返回**最外层**包含匹配的元素
- **场景**：测试编写
- **代码示例**：`render(Component)` → 传 props 需 Harness 组件
- **适配**：测试基建 `test/createRenderer.tsx`（reactive props 的 Harness + setProps/rerender）；查询优先 `getByTestId`

### PD-17 事件处理器逆变（无 bivariance）
- **标题**：actview 的 `EventHandler<E>` 是逆变函数属性（React 用 bivarianceHack）
- **场景**：`WithBaseUIEvent` 包装的 handler 与原生元素 props 类型不兼容
- **适配**：`HTMLProps` 把 `on*` 键用模板索引重声明为宽松类型（`[key: \`on${string}\`]: ((event: any) => any) | undefined`）

### PD-18 类型来源
- **标题**：`actview` 聚合包不导出类型（Ref/ComputedRef/WatchSource 等）
- **场景**：类型导入
- **适配**：类型一律 `from '@actview/core'`

### PD-19 布尔 true 属性的 data-* 输出
- **标题**：`data-*` 等普通属性的布尔值：actview `true → ""`（React 的 data-* 布尔会字符串化 "true"）
- **场景**：`getStateAttributesProps` 生成的 data-* 状态属性（data-disabled 等）
- **渲染后示例**：React `<div data-disabled="true">`；ActView `<div data-disabled="">`
- **适配**：无（状态属性只需存在性；与 PD-01 同源，可一并规范化）

### PD-20 生命周期顺序
- **标题**：onMounted 在首次渲染后**同步**触发，子组件先于父组件
- **场景**：依赖挂载时机的逻辑
- **适配**：与 React 相反（React 父先子后）；依赖顺序的逻辑需按 actview 语义调整

### PD-21 渲染错误处理
- **标题**：渲染错误走 onErrorCaptured 链 → ErrorBoundary → console.error（React 默认 throw）
- **场景**：渲染期异常
- **适配**：需要自定义处理时用 ErrorBoundary

---

## 第二部分：适配说明（Adaptation Notes）

### AD-01 useRegisteredLabelId 的 WeakMap 语义
- **适配**：react 版用函数式 setState 区分"old label 的 cleanup 不清掉 newer label"；actview 的 setter 是普通写入函数，无法读当前值 → 用模块级 `WeakMap<Function, string|undefined>`（键为 setter）记录最后注册 id，cleanup 仅在匹配时清空，精确复现原语义

### AD-02 测试渲染器（createRenderer）
- **适配**：`render(Component, props)` 通过 reactive props + Harness + `<component is>` 实现 React 的 rerender/setProps 语义；setProps 用 `Object.assign` + nextTick

### AD-03 fireEvent 门面
- **适配**：testing-library 风格的事件触发（click/keyDown/input 等 40+ 方法），内部构造原生 DOM 事件派发

### AD-04 mergeProps 的 preventBaseUIHandler
- **适配**：actview 无合成事件，`isSyntheticEvent` 判断改为"任何对象事件"都挂 `preventBaseUIHandler`，保留"右至左执行 + 可取消"语义

### AD-05 cloneVNode
- **适配**：用 `createElement(vnode.type, {...vnode.props, ...props})` 实现 React.cloneElement 等价物（useRenderElement 内）

### AD-06 useStore 订阅同步
- **适配**：`store.subscribe` 回调里重算 selector，`Object.is` 比较后才写 shallowRef，保留 useSyncExternalStore 的"快照未变不重渲染"语义；selector 参数支持 Ref（unref 后求值）

### AD-07 useControlled
- **适配**：返回带 `setValueIfUncontrolled` 属性的 ComputedRef（读 `.value`、写 `setValueIfUncontrolled(v)`）；受控/非受控模式在 setup 确定一次，切换警告用 watch

### AD-08 本地 tick ref（替代 useForcedRerendering）
- **适配**：`const tick = ref(0); rerender = () => tick.value++`；渲染内读一次 `tick.value` 建立依赖

### AD-09 工程接线
- **适配**：pnpm `link:` 协议以包目录为基准解析（`../../../actview/...`）；解决方案 tsconfig `"files": []`；`jsxImportSource: "@actview/jsx"`；vitest 独立 defineProject + actviewPlugin

### AD-10 类型先行抽取
- **适配**：field/root/FieldRoot.ts、useFieldValidation.ts、form/index.ts 先以「仅类型」抽取落地（解除循环依赖），组件实现阶段补全

### AD-11 prehydration 脚本
- **适配**：tabs/slider 的 prehydrationScript.min.ts 原样复制；actview 无 React 19 的 hydration 等价，脚本仅保留 SSR 语义（SSR 分支用 `typeof document === 'undefined'` 常量）

### AD-12 弹层 Portal 层叠
- **适配**：react 的 `FloatingPortal`（含 tabbable 逻辑）用 `floating-ui-actview` 的 FloatingPortal；轻量场景用 `FloatingPortalLite`（`<Teleport to={portalNode}>`），两者都以 `useFloatingPortalNode` 为内核

---

> 维护说明：新增差异/适配时在对应部分追加，编号递增；修改后同步更新 plan.md 与 issue.md 的关联条目。
