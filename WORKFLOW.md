# Base UI React → ActView 迁移：执行指示（用户与 Agent 的协作约定）

> 本文件记录**用户对 Agent 的直接指示**（2026-08-16 起陆续给出），是所有迁移工作的最高执行准则。
> 技术设计见 `packages/actview/MIGRATION-DESIGN.md`；执行规则见 `packages/actview/PORTING-RULES.md`；进度见 `plan.md`。

---

## 一、工作模式（核心规则）

1. **逐个组件手动实现，禁止子代理**。
   - "不要开启子代理，你要一个一个地实现，经过我的允许然后开始"。
   - 曾启动的所有子代理已全部停止；今后不批量分派。
2. **动手前先征求用户允许**。
   - "不要直接启动 我只让你列出来 懂吗？"——先列清单/方案，用户说"执行 XX 实现"后才开始。
   - 每个组件实现前先**分析是否会遇到框架层问题**，把结论报给用户，由用户决定做/跳过/部分实现。
3. **先完成能实现的**，被阻塞的记入问题文档，不硬等。
4. **commit 由用户触发**。用户说"commit"才提交；提交信息用仓库约定的 `[scope]` 格式（如 `[scroll-area] Port ScrollArea to ActView`）。
5. **全程中文交流**。

## 二、文档分工（问题/差异记录到哪里）

| 文档 | 用途 |
|---|---|
| `plan.md` | 总计划 + 组件完成状态清单（✅ 完成 / 🔄 部分完成 / ⏳ 未开始 / ⏸ 暂停） |
| `issue.md` | **迁移/实现问题**：编号 #1、#2、… 逐个追加；被阻塞的组件记入并说明原因 |
| `plantform-diff.md` | **框架差异**（PD-NN）与**适配说明**（AD-NN），持续追加 |
| `actview-issue.md` | **框架本身的问题**（AI-NN）：场景 + 复现方式 + 观察现象 + 期望行为，由框架维护者处理 |
| 本文件 | 用户对 Agent 的执行指示（操作层面的约定） |

## 三、遇到问题怎么做

### 1. 迁移/实现问题（本库侧）
- **编号记录到根目录 `issue.md`**（如 #19 return JSX 结尾、#20 aria 布尔渲染、#21 组件 ref 指向实例）。
- 能修的直接修；不能修的记入 issue.md 并先做其他能实现的组件。

### 2. 框架层问题（actview 本身的行为缺陷）
- **"不要去看源码"**：框架实现问题不深究、不查 actview 源码、不由 Agent 修复。
- **记录场景 + 复现方式到 `actview-issue.md`**（格式见该文件条目，如 AI-001 / AI-002）。
- **立即停止该组件的实现**，等用户决定后续流程（"框架问题我自会去处理"）。
- 记录完成后回到其他可推进的组件。

### 3. 框架差异（行为不同但可适配）
- 记录到 `plantform-diff.md`：**PD-NN（框架差异）** 每条约含：编号 / 标题 / 场景 / 代码示例 / 渲染后示例（或行为对比）。
- 为实现现有功能做的**适配**记录为 **AD-NN（适配说明）**。
- 记录后完成适配并继续（不停止组件）。

## 四、测试要求

1. **每实现一个组件，执行一次该组件的测试**。
2. **每个组件补 actview 版测试用例**，参照 react 版 `*.test.tsx` 形式（如 `packages/react/src/accordion/header/AccordionHeader.test.tsx` → actview 对应目录的 `*.test.tsx`）。
3. 测试使用 vitest + `createRenderer` 基建（`render(Component, props)` / `fireEvent` / `act` / `waitFor`），断言用 jest-dom matcher。
4. jsdom 限制（无布局、无 ResizeObserver 等）按 `plantform-diff.md` AD-16 的策略处理（mock 尺寸 / 防御性跳过 / 不覆盖依赖真实布局的断言）。

## 五、其他指示

1. **eslint.config.mjs 是有意删除的**（用户手动删除）：不要恢复；它很多语法与 actview 不符会导致编辑器大量红色波浪线。不需要 eslint，只做 **tsx 类型检查**（`npx tsgo -b tsconfig.json --force`）即可。
2. **框架功能以验证为准，不深究实现**："不用深究框架实现 验证框架功能"。
3. **逐组件授权**：用户逐个说"执行 XX 实现"，Agent 实现完汇报（测试结果、遇到的适配、遗留问题），等待用户下一步指示（含 commit 指令）。
4. 部分完成的落盘资产（子代理遗留）需逐个验收/修复/补测试后再算完成。

## 六、当前执行记录（2026-08-16 起）

- 已完成并提交：button（7 测试）、input（7 测试）、scroll-area（13 测试）等（详见 `plan.md`）。
- **tabs 暂停 ⏸**：命中框架问题 AI-001（挂载期 `flush:'post'` watch 不触发）与 AI-002（挂载期 ref 回调 `isConnected === false`），已记录 `actview-issue.md`，待框架维护者处理。
- **otp-field 跳过**：与 tabs 同根因（依赖 CompositeList 的 onMapChange / elementsRef），框架修复前不实现（用户 2026-08-16 确认先跳过）。
- 未开始组件（逐个授权后实现）：alert-dialog、autocomplete、context-menu、dialog、drawer、menubar、navigation-menu、preview-card、tooltip；部分完成待验收：slider、number-field、select、accordion、field、popover、toast、menu、combobox。
