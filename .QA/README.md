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

- 依赖关系：select-root-floating-organization 依赖 merge-props-actview-semantics；select-selectstore-class-design 与 select-root-floating-organization 互补（store class vs Root 交互接线）。
- 权威长文在根目录 `plantform-diff.md`（PD-*/AD-*，维护态）；`actview-issue.md`/`issue.md`/`plan.md` 为过程性/框架问题记录，仅 actview-framework-adaptation-rules 提炼其可复用的部分。
