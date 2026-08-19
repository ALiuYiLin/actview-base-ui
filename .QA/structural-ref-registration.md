# 结构类 ref（listRef/elementsRef）在 keyed diff 下不可靠 + 注册时机（AD-40 家族）

## 问题本质
靠 ref callback 填充的结构类 ref（listRef、elementsRef 等）在两个场景下会拿到 null/错元素：
1. **keyed diff 复用 DOM 节点、不重跑 ref callback** → 列表 DOM 更新后 ref 数组与真实元素错位（stale 覆盖）。
2. **注册 watch 的 `immediate` 在 setup 跑，此刻元素 ref 尚未挂载**（`{current:null}` 普通对象）→ 若注册逻辑写在 immediate 回调且依赖里没有挂载时机，首渲染数值/索引已是最终值 → watch 不再重跑 → 注册的项永为 null。

## 实例（combobox：两坑同时在 items-prop 虚拟列表路径暴露）
### 坑 1：CompositeList 用 stale DOM 覆盖 listRef
- `items` prop 过滤后 CompositeList 用 **stale DOM 覆盖 listRef**（长度对但元素错乱），因为 keyed diff 复用 DOM、**不重跑 ref callback**；且 Item 的 `index` 是 setup 快照，不随过滤更新。
- **修复组合拳**：
  - `items` prop 时 `ComboboxList` **跳过 CompositeList**（listRef 由 AriaCombobox 的 valuesRef watch 维护 length）；
  - Item 走**响应式 `indexFromFilter` 分支**（`computed` {value} 传给 virtualized/Inner，渲染处 `computed(() => indexFromFilter.value)` 解包跟随过滤）；
  - `useStore` 的 **a1 参数传 index ref 而非快照**（store selector 参数支持 ref，unref 后求值，useStore.ts:43-52）；
  - Chip 的 `useCompositeListItem({ guess: true })`（render 顺序 seed index，规避 ref 不重触发）。

### 坑 2：注册 watch immediate 先于挂载（AD-40）
- `watch([hasRegistered, virtualized, indexProp != null, index], cb, { immediate: true })` 在 setup 同步跑时 `itemRef.current` 还是 null → `list[index] = itemRef.current` 写 null；若首渲染 index 已是最终值，后续依赖不变 → watch 不重跑 → listRef 项永为 null → `clickHighlightedItem` 失效（键盘 Enter 选择挂）。combobox 测试先打开再过滤、index 必变化所以没暴露。
- **修复**：加响应式 `const itemElement = ref<HTMLDivElement|null>(null)`，ref 数组加 `(el) => { itemElement.value = el; }`，watch 依赖加 `itemElement`（同时保留其它依赖）——挂载后 ref callback 赋值 → watch 立即重跑注册。

## 通用规则
- 结构型 ref（listRef/elementsRef 靠 ref callback 填充）在 keyed diff 下**不可靠** → 改用响应式：mapTick watch / 自身维护 length / 响应式元素 ref。
- 任何「依赖 DOM 已挂载才成立的注册/测量」，不能只依赖 `immediate: true`（它在 setup 执行）——watch 依赖里要包含一个**反映挂载时机的响应式源**（元素 ref / mounted 标记）。
- 排查：给注册回调加日志——若回调跑过但 `ref.current` 为 null 就是挂载时机问题；若回调根本没跑就是依赖没覆盖变化。

## 文件证据
- combobox/item/ComboboxItem.tsx:27,61-67,224,255,265（indexFromFilter 响应式分支 + itemElement + guess）
- combobox/chip/ComboboxChip.tsx:37-40（useCompositeListItem guess）
- combobox/list/ComboboxList.tsx:111-119（items prop 跳过 CompositeList）
- actview-utils/src/store/useStore.ts:43-52（a1 参数 ref unref）
- plantform-diff.md AD-40
