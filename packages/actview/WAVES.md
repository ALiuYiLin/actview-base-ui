# 组件波次规划（Phase 4–6 执行清单）

> 每个波次由一个子代理执行；启动条件 = 依赖目录已落盘且 tsgo 中该目录无错。
> 通用规则见 PORTING-RULES.md；本文件只记组件特有注意点。

## 依赖门（gates）

- gate-B：`src/internals/field-*`、`form-context`、`labelable-provider`、`use-button`、`src/utils/useRegisteredLabelId`、`src/field/root` 类型抽取
- gate-C：`src/internals/composite`、`useOpenChangeComplete`、`useAnimationsFinished`、`useAnchorPositioning`、`usePressAndHold`、`useValueChanged`、`getDisabledMountTransitionStyles`
- gate-D：`src/floating-ui-actview`
- gate-E：`src/utils` 弹层工具（popupTriggerMap/popupHandle/usePositioner/FloatingPortalLite/FocusGuard/InternalBackdrop/closePart/useSwipeDismiss 等）
- gate-P：`src/utils/popups/store.ts` + `popupStoreUtils.ts`（已写，待 D 校对）

## Wave 4a（无门）已由主线完成
separator ✓ csp-provider ✓ direction-provider ✓ unstable-use-media-query ✓

## Wave 4b（gate-B）
switch（root+thumb 模式，注意 inputRef/useControlled/hidden input）、checkbox、checkbox-group。
注意：checkbox/radio 的 indicator 是 children 函数组件模式；`onChange` 用原生（checkbox 的 change 事件原生即可，无文本输入问题）。

## Wave 4c（gate-B + gate-E 的 collapsibleOpenStateMapping）
toggle（需 useButton + CompositeItem + ToggleGroupContext——toggle-group 与 toolbar 同批）、toggle-group、radio、radio-group。
注意：radio-group 含 value 管理与 RovingFocus（Composite）；toggle 的 ToggleGroupContext 依赖 toggle-group——把 toggle-group 放本波次或与 toolbar 同波。

## Wave 4d（gate-C + gate-E 的 valueToPercent/useRegisteredLabelId）
progress、meter、avatar。
注意：avatar/image 用 useOpenChangeComplete + useTransitionStatus + useImageLoadingStatus（DOM 图片加载状态）；progress/meter 的 label 用 useRegisteredLabelId（gate-B）。

## Wave 4e（gate-B 的 use-button + gate-C + collapsibleOpenStateMapping）
collapsible（root 用 useControlled + store 式 context；panel 用 useCollapsiblePanel + CSS grid 高度动画）、accordion（复用 collapsible 的 context/panel + composite list 方向键）。

## Wave 4f（gate-B/C）
slider（28 文件最大叶子组件：root/thumb/track/control/indicator/value + 大量事件与 RTL 逻辑；thumb 含 prehydrationScript——actview 无 hydration，脚本保留但注明）。

## Wave 5a（gate-B + gate-C）
fieldset、form、toolbar（ToolbarGroupContext + composite）、tabs（indicator 定位 + composite 键盘 + prehydration）。

## Wave 5b（gate-B + gate-C）
field（root/control/description/error/item/label/validity + useFieldValidation）、otp-field（root/input + context 链）。

## Wave 5c（gate-B + gate-E）
number-field（root/input/group/increment/decrement/scrub-area，useControlled 数字解析）、scroll-area（root/viewport/scrollbar/thumb/corner/content + scroll lock 与 CSP style 注入）。

## Wave 6a（gate-P + gate-D + gate-E）
tooltip（provider/root/trigger/positioner/popup/arrow，hover 交互）、preview-card。

## Wave 6b（gate-P + gate-D + gate-E）
popover、dialog（root/popup/portal/backdrop/close/title/description/viewport/trigger + useDialogRoot）、alert-dialog。

## Wave 6c（gate-P + gate-D + gate-E + gate-C）
menu（53 文件最大：root/store/trigger/positioner/popup/item/group/checkbox-item/radio-item/link-item/submenu + typeahead）、menubar、context-menu。

## Wave 6d（gate-P + gate-D + gate-E + gate-C）
select（42 文件：root/trigger/value/icon/positioner/popup/list/item/group/scroll-arrow/separator + listbox 逻辑 + popup 状态机）。

## Wave 6e（gate-P + gate-D + gate-E + gate-C）
combobox（62 文件最大：root/input/chips/chip/trigger/items/list/item/row/group/label/icon/arrow/separator/clear/value/status/empty + 过滤与 selection 状态机）、autocomplete。

## Wave 6f（gate-P + gate-D + gate-E）
toast（provider/root/content/title/description/action/close/portal/positioner/viewport + 时间管理）、navigation-menu（36 文件：root/list/item/trigger/link/content/viewport/indicator + 手势与树导航）、drawer（32 文件：root/trigger/content/backdrop/close/portal/positioner/viewport/swipe-area/indent + drag 手势）。

## 每波完成标准
1. 组件目录文件与 react/src 一一对应（不含 *.test.*）。
2. `npx tsgo -b tsconfig.json --force 2>&1 | Select-String '<组件名>'` 该组件目录 0 错误（其他目录的错误忽略并回报）。
3. 回报：文件清单 + 架构决策 + 与 react 版的行为差异点（若有）。
