# 测试文件补写待办（PLAN）

> actview 组件测试覆盖缺口清单——对比 React 版（`packages/react`）测试文件。
> 统计口径：递归扫描组件目录下 `*.test.*`（含子目录）。
> 现状：**actview 86 个测试文件 vs React 318 个**。
> 完成标准：勾选前需跑通对应测试（jsdom `pnpm test` 全绿）。

## P0：完全无测试文件的组件（React 均有测试）——先补

- [ ] **toggle-group**：补测试（React 2 个：`ToggleGroup.test.tsx` / `enumSync.test.tsx`）——组件刚重构为裸函数写法，优先建立回归测试
- [ ] **meter**：补测试（React 5 个：`indicator` / `label` / `root` / `track` / `value`）
- [ ] **checkbox-group**：补测试（React 2 个：`CheckboxGroup.test.tsx` / `useCheckboxGroupParent.test.tsx`）

## P1：测试覆盖明显不足（actview 1 个文件 vs React 10+）

- [ ] **combobox**：1 个 vs React 38
- [ ] **select**：1 个 vs React 19
- [ ] **toast**：1 个 vs React 16
- [ ] **navigation-menu**：1 个 vs React 15
- [ ] **slider**：1 个 vs React 12
- [ ] **number-field**：1 个 vs React 12
- [ ] **drawer**：1 个 vs React 11

## P2：其余覆盖差距（React 测试数 > actview）

- [ ] **popover**：9 个 vs React 13
- [ ] **dialog**：6 个 vs React 10
- [ ] **preview-card**：1 个 vs React 9
- [ ] **tooltip**：3 个 vs React 9
- [ ] **field**：6 个 vs React 8
- [ ] **scroll-area**：1 个 vs React 7
- [ ] **progress**：1 个 vs React 6
- [ ] **tabs**：1 个 vs React 6
- [ ] **toolbar**：1 个 vs React 6
- [ ] **accordion**：4 个 vs React 5
- [ ] **otp-field**：1 个 vs React 4
- [ ] **checkbox**：1 个 vs React 4
- [ ] **collapsible**：2 个 vs React 3
- [ ] **autocomplete**：1 个 vs React 3
- [ ] **radio**：1 个 vs React 3
- [ ] **switch**：1 个 vs React 3
- [ ] **menu**：18 个 vs React 21

## 备注

- actview 为合并式测试（一个文件覆盖组件全部子组件），文件数差距 ≠ 用例数差距；但 P0 三项为零覆盖、P1 各项为 1 vs 10+，属于明显缺口。
- 未列出的组件 = React 测试数 ≤ actview（含 actview 反超项），不视为缺口。
