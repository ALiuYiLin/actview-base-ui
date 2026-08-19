# QA Knowledge Base

本目录记录本地项目 QA 会话产出的问答档案。**归档原则：按问题本质分类**——同一问题在多组件/多篇里出现即合并为一档「xxx问题.md」，从中抽取各实例（不做按组件的 lesson 归档）。
类型约定：
- **问题**：跨组件可复用的根因/修复（AD/PD 家族）。
- **语义**：工具/基建约定（mergeProps、测试基建）。
- **设计建议**：某组件该「怎么写」（结合 react 参照 + actview 基建；组件级合理独立）。
- 问题本质（最近/最常）清单见 `list.md`。

| 常规 | 类型 | 问题/内容 |
|---|---|---|
| setup-snapshot-freeze | 问题 | setup 解构/对象快照冻结（PD-15 家族）：toast toast 换对象/children 覆盖、combobox filterQuery/index 快照、getElement 缓存 VNode(AD-38)、useRenderElement props 数组普通对象(AD-17)、context 普通值快照、setup return null 固定(AD-34)；排查顺序 |
| mergeprops-getter-chain | 问题 | mergeProps getter 链：整体替换丢属性 & {...prev,...X} spread 覆盖 on* → 必须 mergeProps(prev,X)（AD-20/26/27/35）；mergeProps 语义 + menu/combobox/toast/select 实例 |
| watch-array-source-issues | 问题 | watch 数组源：函数源被当 getter 调用、卸载期 stale 微任务收 undefined（AD-33，框架守卫+库内 Array.isArray 已落地）、从数组源解构 element 用 addEventListener TS2769 → 回调体读 ref |
| structural-ref-registration | 问题 | 结构类 ref（listRef）在 keyed diff 下不可靠 + 注册时机（AD-40）：ref callback 不重触发 stale 覆盖、watch immediate 先于挂载 → 响应式 itemElement ref / indexFromFilter / 跳过 CompositeList / Chip guess |
| jsdom-keyboard-activation | 问题 | jsdom 不合成原生 button 的 Enter→click（AD-19）：useButton 键盘激活只对 native:false；menu(button) 不通 select item(div) 通；测试手动补 click |
| combobox-context-render-reactivity | 问题 | context-computed 变化不驱动消费者渲染（AD-39/38）+ useInjects/use() 只能 setup 顶层（AD-42）+ ComputedRef<Store> .value! 解包；渲染用场景值镜像进 store 的稳妥解 |
| floating-activedescendant-split | 问题 | floating-ui useListNavigation 的 aria-activedescendant 语义（AD-41）：reference 侧无条件 `${id}-${activeIndex}`（typeable combobox 也要）、floating 侧才排除 typeable；共享 getter 折叠的误伤与拆法 |
| ai003-return-shape-checklist | 问题 | AI-003：最后 return 仅认 JSX 字面量/_jsx/null/含渲染分支三元·逻辑；return 变量/裸函数/对象/数组不转换→裸函数→DOMException；批量排查 + 标准修复 return <>{expr}</> |
| actview-framework-adaptation-rules | 语义 | 框架差异总纲速查（PD-01..26/AD-01..42 映射）：setup 单次、getter 求值、return JSX、布尔属性、ref/Teleport、watch、弹层、顶层抛错整树丢弃、测试 | 
| actview-test-infra-patterns | 语义 | 测试基建怎么用 + 测试失败诊断：@actview/testing + createRenderer、jsdom PointerEvent/portal 残留/waitFor 只在 throw 重试/空查询断言/inputType、hidden input 断言 |
| select-port-design | 设计建议 | select 移植 3 篇合并：SelectStore class（无 PopupTriggerMap）、Root 弹层组织（floatingContext 不进 store、两层 mergeProps、onNavigate/typeahead）、10 项基建清单 |

## 依赖/引用关系
- 被 plantform-diff.md 与源文件注释**外部引用**、故独立保留：`combobox-context-render-reactivity`、`floating-activedescendant-split`。
- `select-port-design` 依赖 `mergeprops-getter-chain`（两层 mergeProps 保链）；`actview-framework-adaptation-rules` 是总纲，各问题档是深挖。
- 权威长文在根目录 `plantform-diff.md`（PD-*/AD-*，维护态）；`actview-issue.md`/`issue.md`/`plan.md` 为过程性/框架问题记录，仅 actview-framework-adaptation-rules 提炼可复用部分。
