# QA Knowledge Base

本目录记录本地项目 QA 会话产出的问答档案。类型约定：
- **基础语义**：跨组件通用的工具约定（mergeProps 等），被其他文档引用。
- **设计建议**：某组件该「怎么写」的建议（结合 react 参照 + actview 基建）。
- **参考清单**：基建/API 的存在性、导入路径、行号速查。

| 常规 | 类型 | 内容 |
|---|---|---|
| merge-props-actview-semantics | 基础语义 | actview mergeProps/mergePropsN 导入路径+语义（getter 整体替换、右到左事件链、getter 必须 mergeProps(prev,…) 保链） |
| select-selectstore-class-design | 设计建议 | 直接 new SelectStore(initialState)、不要 PopupTriggerMap、context 可空（react 对齐） |
| select-root-floating-organization | 设计建议 | floatingContext 放 SelectRootContext 不进 store、两层 mergeProps、onNavigate 写 activeIndex、typeahead disabledIndices |
| actview-test-infra-patterns | 基础语义 | @actview/testing + createRenderer、jsdom PointerEvent/portal/waitFor、portal 查询、hidden input 断言 |
| actview-select-infra-item-checklist | 参考清单 | select 需 10 项基建逐项确认（constants/composite/labelable/direction/mapping/InteractionType/floating utils/actview-utils 通配导出/toolbar） |
| actview-framework-adaptation-rules | 基础语义 | 提炼自根目录 plantform-diff.md(PD/AD)/actview-issue.md(AI)：setup 单次、getter 求值、getter 合并 prev、return JSX、布尔属性/ref/Teleport/watch 数组源等框架差异与适配速查 |
| toast-port-fixes | 基础语义 | toast 移植 tsgo 类型级修复 4 条：addEventListener 不要从 watch 数组解构 element（回调体读 ref）、ComputedRef<Store> 用 .value! 解包、context 普通值快照要在 computed 内重读 context.value、store 的相对导入路径已对 |
| toast-render-diagnostics | 基础语义 | toast 渲染/更新问题合并根因链路（含 AI-003 崩溃、waitFor 误用、setup 解构冻结 PD-15、getter 合并 prev、非元素 prop 泄漏、runEffect 重跑机制），已修复+最终正确写法；由 4 篇旧诊断合并而来 |
| menu-trigger-not-rendering | 基础语义 | actview menu 移植：全部测试 trigger 查不到 +「closed 假通过」= MenuRoot(顶层) setup 抛错 → 整树被 handleError 静默丢弃；重点差异：MenuRoot 无条件每次渲染求值浮动交互 props（popover 用 shouldRenderInteractions 条件挂载），及 .ts 裸 return null(AD-31)/selector 缺失/enabled 误判 |
| ai003-return-shape-checklist | 基础语义 | AI-003 完整清单：最后 return 仅认 JSX 字面量/_jsx调用/null/含渲染分支的三元·逻辑（wrapComponentFn 源码）；return 变量/裸函数调用/对象/数组均不转换→裸函数→DOMException；批量排查（grep+跑测试+AST）；标准修复 return <>{expr}</> 的原理 |
| menu-enter-not-opening | 基础语义 | menu Enter 打不开 = useButton 键盘激活只对 native:false(useButton.ts:168)，原生 button 的 Enter 留给浏览器、jsdom 不合成 → 测试手动补 fireEvent.click；select item 通因 nativeButton:false；附 submenu mousedown 排查点 + arrow aria-hidden 用字符串(PD-01) |
| menu-mergeprops-audit | 基础语义 | mergePropsN getter 审计：menu 目录 {...prev,...X} spread 隐患清单（X 含 on* → 必改 mergeProps）：MenuItem/LinkItem/CheckboxItem/RadioItem(itemProps)、Checkbox/Radio onClick:handleClick 顶掉 listNav onClick、MenuPopup(popupProps)、MenuViewport(elementProps)；B 类纯属性 spread 安全 |
| watch-array-undefined-after-unmount | 基础语义 | watch 数组回调收 undefined 根因：runJob 无 active 守卫，stop 后 stale 微任务 → effect.run() 回 undefined → hasChanged true → cb(undefined) → 解构崩；修复=watch.ts runJob 加 if(!effect.active) + 给 useTransitionStatus:66/useOpenChangeComplete:16/useSyncedFloatingRootContext:85 补 Array.isArray（AD-33 漏网）；menu 触发概率高因 useSyncedFloatingRootContext watch 高频 + 快速 open/close |

- 依赖关系：select-root-floating-organization 依赖 merge-props-actview-semantics；select-selectstore-class-design 与 select-root-floating-organization 互补（store class vs Root 交互接线）。
- 权威长文在根目录 `plantform-diff.md`（PD-*/AD-*，维护态）；`actview-issue.md`/`issue.md`/`plan.md` 为过程性/框架问题记录，仅 actview-framework-adaptation-rules 提炼其可复用的部分。
