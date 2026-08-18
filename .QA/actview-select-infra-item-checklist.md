# actview select 需要的 10 项基建：存在性、导入路径、API

## 问题
逐个确认 actview（packages/actview）里 select 需要的基建是否存在、导入/导出路径和 API。

## 结论（Evidence level: S6 — 全源码分析）

### (1) COLLISION_AVOIDANCE 常量 — **两个都存在**
路径 `packages/actview/src/internals/constants`。
- `DROPDOWN_COLLISION_AVOIDANCE` = `{ fallbackAxisSide: 'none' }`（constants.ts:18-20）
- `POPUP_COLLISION_AVOIDANCE` = `{ fallbackAxisSide: 'end' }`（constants.ts:26-28）
用户假设「只有 POPUP_COLLISION_AVOIDANCE」**不成立**，两个都有。导入 `import { DROPDOWN_COLLISION_AVOIDANCE } from '../../internals/constants'`。

### (2) COMPOSITE_KEYS — 在 **`internals/composite/composite`**，不是 constants
`COMPOSITE_KEYS = new Set([ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home, End])`（`internals/composite/composite.ts:22`）。用户假设的 `internals/composite/constants` **错**——那个 `constants.ts` 只有 `ACTIVE_COMPOSITE_ITEM = 'data-composite-item-active'`（composite/constants.ts:1）。且 `composite/index.ts` **不** re-export COMPOSITE_KEYS。导入路径照惯例 `import { COMPOSITE_KEYS } from '../../internals/composite/composite'`（PopoverPopup.tsx:15）。同文件还导出 ARROW_*/HOME/END/PAGE_UP/PAGE_DOWN（composite.ts:13-20）、MODIFIER_KEYS（:25）。

### (3) LabelableContext / useLabelableContext — 存在，路径 `internals/labelable-provider/LabelableContext`
接口（LabelableContext.ts:5-25）：
- `controlId: string | null | undefined`
- `registerControlId(source: symbol, id: string | null | undefined): void`
- `resetControlId(): void`
- `labelId: string | undefined`
- `setLabelId(id: string | undefined): void`
- `messageIds: string[]`; `setMessageIds(ids: string[]): void`
- `getDescriptionProps(externalProps: HTMLProps): HTMLProps`
`useLabelableContext()` 返回 context 的 `.use()`（:42-44）。re-export：`internals/labelable-provider/index.ts:3`。使用例：`const lc = useLabelableContext(); lc.value.registerControlId(...)`（CheckboxRoot.tsx:50）。配套 `useLabelableId`（同目录 useLabelableId.ts）。

### (4) useDirection — 存在，路径 `internals/direction-context/DirectionContext`（或公开 `@base-ui/actview/direction-provider`）
`useDirection()` 返回 `computed(() => DirectionContext.use().value?.direction ?? 'ltr')`（DirectionContext.tsx:19-20）——ComputedRef<'ltr'|'rtl'>，读 `.value`。`TextDirection = 'ltr' | 'rtl'`（:4）。内部导入 `../../internals/direction-context/DirectionContext`；公开从 `../direction-provider` 导入 `useDirection`（direction-provider/index.ts:1）。

### (5) stateAttributesMapping / transitionStatusMapping — 共享 transition + 各组件自建
- 共享：`transitionStatusMapping`（`internals/stateAttributesMapping.ts:18-28`，value 'starting'/'ending' → data-starting-style/data-ending-style，否则 null）+ `TransitionStatusDataAttributes` 枚举（:4-13）。
- 类型：`StateAttributesMapping<State>`（`internals/getStateAttributesProps.ts:1-3`）；`getStateAttributesProps(state, customMapping)`（:5-31）。
- **没有全局 `stateAttributesMapping` 常量**——每个组件在自己的 `stateAttributesMapping.ts` 定义同名变量（switch/radio/number-field 等）。select popup 应复用 `popupTransitionStateMapping`（`utils/popupStateMapping.ts:108-115`，内含 popupStateMapping + transitionStatusMapping），PopoverPopup 即用它（PopoverPopup.tsx:11,115）。

### (6) InteractionType — `@base-ui/actview-utils/useEnhancedClickHandler`
`export type InteractionType = 'mouse' | 'touch' | 'pen' | 'keyboard' | ''`（actview-utils/src/useEnhancedClickHandler.ts:1）。路径 `@base-ui/actview-utils/useEnhancedClickHandler`。

### (7) isVirtualClick — `floating-ui-actview/utils/event`
`export function isVirtualClick(event: MouseEvent | PointerEvent)`（floating-ui-actview/utils/event.ts:17）。经桶 `.../floating-ui-actview/utils`（utils.ts:3 `export * from './utils/event'`）也可见。

### (8) getFloatingFocusElement / contains / activeElement — `floating-ui-actview/utils/element`
- `getFloatingFocusElement`（element.ts:82，原地定义）
- `contains`、`activeElement`、`getTarget` **re-export 自 `@base-ui/actview-utils/shadowDom`**（element.ts:3,7）——shadow-DOM 安全（符合 AGENTS.md）。
- 全部经桶 `.../floating-ui-actview/utils`（utils.ts:1）可见。导入 `import { contains, activeElement, getTarget } from '../../floating-ui-actview/utils'`。

### (9) @base-ui/actview-utils 各 hook 路径 — **通配导出 `"./*": "./src/*.ts"`**
`actview-utils/package.json:15`。故每个 `src/*.ts` 一律 `@base-ui/actview-utils/<basename>`：
- `@base-ui/actview-utils/useTimeout`、`useAnimationFrame`、`useIsoLayoutEffect`、`useControlled`、`usePreviousValue`、`useRefWithInit`、`useStableCallback`、`useValueAsRef`、`useId`、`useValueChanged`、`useOnFirstRender`、`useEnhancedClickHandler`、`isElementDisabled`、`shadowDom`、`empty`、`error`…
- 特例：`@base-ui/actview-utils/store` → `./src/store/index.ts`（:13）。
- API 要点：`useRefWithInit(init, initArg?)` 返回 `{current}`（useRefWithInit.ts:11-15）；`useValueAsRef(v)` 返回带 `.current`（live getter）的对象（useValueAsRef.ts:13-21）；`useControlled({controlled, default, name, state?})` 返回 `ComputedRef & {setValueIfUncontrolled}`（useControlled.ts:34-39,26-28）；`useStableCallback(fn)` 原样返回 fn（ActView 闭包天然稳定，useStableCallback.ts:9-10）。

### (10) useToolbarRootContext(true) — 存在，路径 `toolbar/root/ToolbarRootContext`
重载：`useToolbarRootContext(optional?: false)` → `ComputedRef<ToolbarRootContext>`；`useToolbarRootContext(optional: true)` → `ComputedRef<ToolbarRootContext | undefined>`（ToolbarRootContext.ts:15-17）；false 时 miss 会 throw（:21-25）。可选用法：`useToolbarRootContext(true).value != null`（PopoverPopup.tsx:40）。`ToolbarRootContext` 结构 `{ disabled, orientation }`（:5-8）。导入 `import { useToolbarRootContext } from '../../toolbar/root/ToolbarRootContext'`。

## 文件证据
- internals/constants.ts:18-28
- internals/composite/composite.ts:22; internals/composite/constants.ts:1; internals/composite/index.ts:1-19
- internals/labelable-provider/LabelableContext.ts:5-44; index.ts:3
- internals/direction-context/DirectionContext.tsx:4-20; direction-provider/index.ts:1
- internals/stateAttributesMapping.ts:4-28; internals/getStateAttributesProps.ts:1-31; utils/popupStateMapping.ts:108-115
- actview-utils/src/useEnhancedClickHandler.ts:1
- floating-ui-actview/utils/event.ts:17; utils/element.ts:3-7,82; utils.ts:1-5
- actview-utils/package.json:13-17; useValueAsRef.ts:13-21; useRefWithInit.ts:11; useControlled.ts:34-39; useStableCallback.ts:9-10
- toolbar/root/ToolbarRootContext.ts:5-28 (重载)
- 使用例：PopoverPopup.tsx:15 (COMPOSITE_KEYS), :11 (popupTransitionStateMapping), :16/:40 (useToolbarRootContext), CheckboxRoot.tsx:50 (useLabelableContext)
