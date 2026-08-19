# floating-ui aria-activedescendant：reference 与 floating 语义不对称（typeable combobox）

## 场景
actview 移植的 `useListNavigation`（packages/actview/src/floating-ui-actview/hooks/useListNavigation.ts）当初用一个共享的 `getAriaActiveDescendant()`（:736-744）给 reference 和 floating 两侧都用，且开头就对 `typeableComboboxReference` 一律 `return undefined` → combobox/autocomplete 的 input 永远没有 `aria-activedescendant`。react 版 input 有，指向 `${id}-${activeIndex}`。

## React 正确语义（证据：react 版 useListNavigation.ts 是 vendored 源码，非 node_modules）
- `ariaActiveDescendantProp = virtual && open && hasActiveIndex && { 'aria-activedescendant': \`${id}-${activeIndex}\` }`（:757-765，`hasActiveIndex = activeIndex != null` :507）。
- **reference 侧**：`{ ...ariaActiveDescendantProp, ...trigger }` —— **无条件** spread，不做 typeable 排除（:933-938）→ typeable combobox 的 input 也拿 `${id}-${activeIndex}`。
- **floating 侧**：`...(!typeableComboboxReference ? ariaActiveDescendantProp : {})`（:767-770）→ 仅非 typeable 时才有；typeable combobox 的 list 保持 undefined。
- React combobox 调用 `useListNavigation({ ..., virtual: true, ... })`（react AriaCombobox.tsx:1335；actview AriaCombobox.tsx:1394 也传了 virtual:true），reference 侧经 `mergeProps(listNavigation.reference, …)` 进 inputProps（react :1365-1388），floating 侧进 listProps（react :1395-1398）。

⇒ 结论确认：typeable combobox 时，reference(input)=`${id}-${activeIndex}`，floating(list)=undefined。**用户的假设正确。**

## actview 修复要求（语义点）
把共享 getter 拆成两个分支（这是 react 源码的直译，patch 本体由执行会话设计）：
- reference getter：条件 `virtual && open.value && activeIndexRef.current != null` → `${id}-${activeIndexRef.current}`，**不含 typeableComboboxReference 检查**；
- floating getter：多一层 `!typeableComboboxReference.value`，否则 undefined。

## 易错点
- **共享 getter 折叠了两条不同语义分支**——当初把 react 的「floating 才排除 typeable」误实现成「两侧都排除」。改时勿再共用单 getter。
- `virtual` 必须为 true 才产生该属性（combobox 已传 true）。
- `id` 是 useListNavigation 传入的 id（combobox 传 `id.value ?? undefined`，actview AriaCombobox.tsx:1387），不是列表元素自身 id。
- 顺手：actview AriaCombobox.tsx:1409 仍留 `console.log('DIAG onNavigate', ...)`，定稿前要删（另有 ComboboxInput DIAG）。

## 参考位置
- react: packages/react/src/floating-ui-react/hooks/useListNavigation.ts :757-765(:507), :767-770, :933-938
- actview port: packages/actview/src/floating-ui-actview/hooks/useListNavigation.ts :736-744(共享 getter), :748-750(floating getter), :887-892(reference getter)
