# Base UI React → ActView 迁移问题记录（Issue Log）

> 规则：实现过程中遇到的每个问题按编号记录；能解决的直接解决并标注；阻塞的保留等待处理。
> 格式：`- [状态] #编号 组件/范围：问题描述 → 处理方案/现状`

## 已关闭（Closed）

- [x] #1 全局：pnpm `link:` 路径以包目录为基准解析，需三层 `../../../actview/...` → 已修复（2026-08-16）
- [x] #2 全局：解决方案级 tsconfig.json 需 `"files": []`，否则 tsgo 以 nodenext 编译全目录报 TS2834 → 已修复
- [x] #3 全局：`@actview/testing` 的 `render(组件)` 不接受 props（需 Harness 组件）；`getByText` 返回最外层匹配 → 已固化为测试基建 createRenderer（test/ 目录）
- [x] #4 全局：actview 聚合包不导出类型（Ref/ComputedRef 从 '@actview/core' 导入）→ 已固化
- [x] #5 全局：含 JSX 的 `.ts` 文件必须改名 `.tsx`（oxc 对 .ts 不启用 JSX）→ 已固化
- [x] #6 全局：JSX 标签不支持成员表达式 `<A.b />`；动态组件用 `<component is={Comp}>` → 已固化
- [x] #7 全局：actview 事件类型是逆变函数属性（无 React bivarianceHack），`WithBaseUIEvent` 包装的 handler 与原生元素 props 不兼容 → HTMLProps 事件键用模板索引重声明，已修复
- [x] #8 utils：`useForcedRerendering` 无法在 actview 实现（无 forceUpdate）→ 从 actview-utils 删除，调用点改用本地 tick ref 模式
- [x] #9 floating-ui-actview：`tabbable.ts` 未导出 `contains`，useTriggerFocusGuards 引用报 TS2459 → 补 `export { contains }`，已修复
- [x] #10 utils：`FloatingPortalLite.tsx` 被弹层工具波次跳过（依赖 floating-ui 运行时 API）→ 主线基于 floating-ui-actview 的 useFloatingPortalNode 补移植，已修复
- [x] #11 utils：`InternalBackdrop` 展开 props 类型不兼容 JSX 元素 → 加 `as JSX.IntrinsicElements['div']` 断言，已修复
- [x] #12 test：`addVitestMatchers` 的 AsymmetricMatchersContaining 增强与 jest-dom 类型声明合并冲突（TS2320）→ 删除该增强块，已修复
- [x] #13 test：fireEvent 门面事件构造器签名（MouseEventInit 等）与调用方不匹配 → 各方法改用对应 EventInit 类型，已修复

## 进行中（Open）

- [ ] #14 全量：子代理模式已停止（用户决定逐个实现）；已落盘文件作为资产保留，逐个验收/修复并补测试用例
- [ ] #15 组件：`button` 已完成（7 测试通过）；`input` 待用户允许后实现
- [ ] #16 组件：`alert-dialog`、`autocomplete`、`context-menu`、`dialog`、`drawer`、`menubar`、`navigation-menu`、`otp-field`、`preview-card`、`scroll-area`、`tabs`、`tooltip` 未开始（待逐个实现）
- [ ] #17 部分完成组件（slider/number-field/select/accordion/field/popover/toast/menu/combobox）：已落盘文件需逐个验收、修复、补测试
- [ ] #18 全局：所有组件缺 actview 版测试用例（参照 react 的 `*.test.tsx` 形式），逐个补齐并在每个组件实现后运行
- [x] #19 button：组件以 `return getElement()`（调用表达式）结尾不会被 babel 包成 defineComponent（运行时以裸函数进入）→ 一律改 `return <>{getElement()}</>`，并修复 Separator 同病，已修复（2026-08-16）
- [x] #20 button：actview 渲染器把布尔 true 属性渲染为空串（aria-disabled="" 而非 "true"）→ 框架行为，测试按属性存在性断言，已记录
- [x] #21 button：actview 组件级 ref 指向**组件实例**而非根 DOM 元素（mountComponent 在 setup 前 delete props.ref）→ 框架语义差异，测试按实例语义断言；DOM 引用可通过 render 元素 ref 或组件内部 ref 获得，已记录
- [x] #22 input：JSX 组件标签 `<FieldControl {...props}/>` 的 TS 校验与函数式 className 冲突（TS2322）→ 改用 `createElement(FieldControl, props)` + Fragment 返回，已修复（plantform-diff PD-22）
- [x] #23 input：actview 把 `defaultValue` 当普通属性（不设 input.value）→ FieldControl 的 ref 回调直接赋值 `node.defaultValue`，已修复（plantform-diff PD-23）
- [x] #24 internals：PrehydrationScript.tsx import 大小写错误（CSPContext vs CspContext，TS1149）→ 已修复
- [x] #25 field（部分）：FieldControl 的 2 处 null 未规范化（id/aria-labelledby）+ `return getElement()` 结尾（#19 同类）→ 已修复；field 其余（FieldDescription/FieldError/FieldItem/FieldLabel/FieldValidity/root/useFieldValidation/index 出口）待 field 组件验收（#17）
- [x] #26 tabs（暂停 ⏸）：composite 挂载时序——ref 回调时 isConnected=false + post-flush watch 不触发，导致 CompositeList.onMapChange 永不收到真实 items、Tabs 自动选中失效 → **框架问题**，已记录 actview-issue.md AI-001/AI-002，tabs 实现暂停等框架处理；期间对 composite 的类型适配（highlightedIndex/disabledIndices/metadata 支持 MaybeRef、getElementProps 合并形式、children 转发）保留
