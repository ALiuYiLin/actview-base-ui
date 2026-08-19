# toast 完成态备注（非跨组件问题，提取后残留）

> 按归档原则「一个组件文档的问题被提取到问题档后，未被提取的内容保留为组件残留」——toast 的所有可复用问题已提取（setup 解构冻结 → setup-snapshot-freeze；watch/事件 → watch-array-source-issues、mergeprops-getter-chain；AI-003 → ai003-return-shape-checklist；测试 → actview-test-infra-patterns；addEventListener 类型 → watch-array-source-issues）。剩下两条 toast 特定实现事实非问题、无跨组件价值，留此备查。

## 1. `createToastManager`/`ToastProvider` 的订阅键 `' subscribe'`（含前导空格）
- 两处一致、刻意"伪私有"，**非 bug**。新 toast「外部 add 不渲染」多为测试 waitFor 误用（见 actview-test-infra-patterns 测试失败诊断），别怀疑订阅键。

## 2. store `applyLimited` 语义：要测 limited 需加第 4 个 toast
- `applyLimited` 用 `activeIndex >= limit`（store.ts:76-86），且 `addToast` **最新在前** → limit=3 时加 3 个 toast，最老的一个 activeIndex=2，**不 limited**；**要触发 limited 需加第 4 个**（第 3 个才被 limited）。用户自加用例断言个数的期望需按此换算，不是实现 bug。

## 其它已确认（无需改动）
- `src/toast/store.ts` → `../../floating-ui-actview/utils` 相对路径**正确**（= `src/floating-ui-actview/utils` 桶，element 的 shadowDom re-export）。

## 文件证据
- toast/provider/ToastProvider.tsx、toast/useToastManager.ts（' subscribe' 键）
- toast/store.ts:76-86（applyLimited）
- toast/store.ts:12（相对路径）
