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

### ✅ 已完成（26 个）
`avatar`、`button`（7 测试通过 ✅）、`checkbox`、`checkbox-group`、`collapsible`、`csp-provider`、`direction-provider`、`fieldset`、`form`、`input`（7 测试通过 ✅，依赖 FieldControl 已修）、`internals`、`merge-props`、`meter`、`progress`、`radio`、`radio-group`、`scroll-area`（13 测试通过 ✅：root/viewport/scrollbar，jsdom 适配见 plantform-diff.md AD-16）、`separator`、`switch`、`toggle`、`toggle-group`、`toolbar`、`types`、`unstable-use-media-query`、`use-render`、`utils`

### 🔄 部分完成（10 个，需逐个验收/修复/补测试）
`slider(26/27)`、`number-field(22/25)`、`select(17/40)`、`accordion(9/16)`、`field(12/18)`、`popover(10/28)`、`toast(12/36)`、`menu(2/51)`、`combobox(4/61)`、**`tabs`（源码已写入，实现暂停 ⏸：依赖框架问题 AI-001/AI-002，见 actview-issue.md，待框架维护者处理）**

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
