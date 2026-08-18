# Base UI React → ActView 迁移计划与进度

> 目标：`packages/react` → `packages/actview`（@base-ui/actview）；`packages/utils` → `packages/actview-utils`（@base-ui/actview-utils）。
> 详细方案：`packages/actview/MIGRATION-DESIGN.md`；执行规则：`packages/actview/PORTING-RULES.md`；测试规格：`packages/actview/TEST-WAVE.md`；问题记录：`issue.md`。

## 工作模式（2026-08-16 起，用户决定）

- ❌ 不再使用子代理批量迁移
- ✅ **逐个组件手动实现**：动手前先征求用户允许
- ✅ 遇到的问题**编号记录到 `issue.md`**
- ✅ **先完成能实现的**，被阻塞的记入 issue.md
- ✅ **每实现一个组件，执行一次该组件的测试**
- ✅ **每个组件补 actview 版测试用例**（参照 react 的 `*.test.tsx` 形式，如 `src/accordion/header/AccordionHeader.test.tsx`）

## 一、阶段进度

| 阶段 | 内容 | 状态 |
|---|---|---|
| Phase 0 | 工程接线（package.json/tsconfig/link 依赖/tsgo+vitest 冒烟） | ✅ 完成 |
| Phase 1 | actview-utils（store 核心 + hooks + 纯工具） | ✅ 完成 |
| Phase 2 | internals（contexts/composite/use-button/field 子系统/temporal） | ✅ 完成 |
| Phase 3 | 弹层基建（utils 31 文件 + floating-ui-actview 37 文件 + popups/store 集成） | ✅ 完成 |
| Phase 4/5 | 叶子/表单组件（子代理落盘资产，逐个验收/修复/补测试） | 🔄 逐个进行 |
| Phase 6 | 弹层家族（子代理落盘资产，逐个验收/修复/补测试） | 🔄 逐个进行 |
| Phase 7 | 测试移植 + 全量验证 | ⏳ 待启动 |

## 二、组件状态（共 47 个 src 目录，非测试文件口径）

### ✅ 已完成（34 个）
`accordion`（11 测试通过 ✅：root/item/header/trigger/panel 全组件 + contexts 补全；依赖 collapsible 子系统；修复 AD-27 getter 链合并 prev 保 id/children、aria-expanded 布尔归一化）、`avatar`、`button`（7 测试通过 ✅）、`checkbox`、`checkbox-group`、`collapsible`、`csp-provider`、`direction-provider`、`field`（12 测试通过 ✅：Error/Label/Item/Validity/Control 补全 + index 导出；修复 Form getter 链丢失 onSubmit（AD-20 变体）、useLabel htmlFor→for（AD-24）、FieldError children 覆盖 + messageIds 替换式注册（AD-25））、`fieldset`、`form`（依赖 Form.tsx 修复 getElementProps 合并）、`input`（7 测试通过 ✅，依赖 FieldControl 已修）、`internals`、`merge-props`、`meter`、`number-field`（13 测试通过 ✅：root/group/input/increment/decrement/scrub-area/scrub-area-cursor 全组件补全；修复 AD-20 getter 整体替换丢属性、AD-21 隐藏 input setup 静态对象、AD-22 Teleport 替代 createPortal、AD-23 测试组件顶层定义，见 plantform-diff.md）、`popover`（19 测试通过 ✅：Root/Trigger/Portal/Positioner/Popup/Arrow/Backdrop/Title/Description/Close/Viewport + Store/Handle 全组件补齐；依赖 popups/floating-ui-actview 基建已就绪；修复 AD-28~AD-31 + resolveRef/FFM children/watch 数组源等，见 plantform-diff.md）、`progress`、`radio`、`radio-group`、`scroll-area`（13 测试通过 ✅：root/viewport/scrollbar，jsdom 适配见 plantform-diff.md AD-16）、`select`（17 测试通过 ✅：Root/Trigger/Value/Icon/Label/Portal/Positioner/Popup/List/Item/ItemText/ItemIndicator/Arrow/Backdrop/Group/GroupLabel/Separator/ScrollUpArrow/ScrollDownArrow 全组件 + SelectStore class；修复 useTransitionStatus watch 数组源防御（AD-33 延伸）、portal 条件渲染不能 setup return null、props 响应式必须 getter 求值，见 plantform-diff.md）、`separator`、`slider`（23 测试通过 ✅：root 10 + utils 13；修复 AI-003：组件末尾 `return <>{getElement()}</>` 规避 Babel 转换漏检，见 actview-issue.md）、`switch`、`tabs`（6 测试通过 ✅：AI-001 解决链完成——AI-002 框架修复 + props 静态对象改 getter（AD-17）+ 测试 waitFor flush（AD-18）+ jsdom 键盘模拟（AD-19），见 actview-issue.md AI-001）、`toast`（33 测试通过 ✅：Provider/Viewport/Root/Content/Action/Close/Title/Description/Portal/Positioner/Arrow 全组件 + ToastStore class + createToastManager/useToastManager；store 21 测试移植 + 组件 12 测试；修复 toast 特有：toast prop 必须 computed 响应式（PD-15）、渲染元素组件的 elementProps 含 children 快照会覆盖 getter（须 getter 从 componentProps 重读）、AI-003 return 包装、waitFor 只在抛错时重试，见 plantform-diff.md AD-36/AD-37）、`toggle`、`toggle-group`、`toolbar`、`types`、`unstable-use-media-query`、`use-render`、`utils`

### 🔄 部分完成（2 个，需逐个验收/修复/补测试）
`menu(2/51)`、`combobox(4/61)`

### ⏳ 未开始（15 个）
| 组件 | 说明 |
|---|---|
| floating-ui-react | 口径误差：已完整移植为 `floating-ui-actview`（37 文件、类型检查干净） |
| alert-dialog、autocomplete、context-menu、dialog、drawer、menubar、navigation-menu、otp-field、preview-card、tooltip | 待逐个实现（otp-field 命中框架问题 AI-001/AI-002，与 tabs 一起待框架修复后实现） |

## 三、逐个实现顺序建议（依赖优先）

1. **button**、**input**（小，4 文件/个，依赖已齐：use-button/field 子系统）
2. **tabs**（依赖 composite ✓，含 indicator 测量）
3. **otp-field**、**scroll-area**（依赖 field/useScrollLock ✓）
4. **tooltip**、**preview-card**（弹层模板，依赖 floating-ui-actview ✓）
5. **popover**、**dialog**、**alert-dialog**、**drawer**（弹层家族）
6. **menu**、**menubar**、**context-menu**、**select**、**combobox**、**autocomplete**、**toast**、**navigation-menu**
7. 逐个验收/修复：slider、number-field、field、accordion、popover、toast、menu、select、combobox 的已落盘文件

## 四、验收标准（每个组件）

1. `npx tsgo -b tsconfig.json --force` 该组件目录 0 错误
2. 该组件的 actview 版测试用例（`*.test.tsx`）通过：`pnpm --filter @base-ui/actview exec vitest run <目录>`
3. 无 react 引用（grep 校验）
