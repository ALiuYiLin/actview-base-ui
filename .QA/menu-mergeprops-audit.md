# actview mergePropsN getter 审计：menu 目录 {...prev,...X} spread 隐患清单

## 问题
mergePropsN 语义（getter 整体替换 prev、不自动合并事件；对象元素才合并）→ getter 内 X 含 on* 必须 mergeProps(prev,X)，`{...prev,...X}` 会顶掉 prev 同名 on*（AD-20/AD-27）。审计 menu 目录哪些 getter 用了 spread、哪些安全、统一改法。

## 结论（Evidence level: S6 — 全源码分析）
规则确认：getter 返回对象整体替换 prev；`{...prev,...X}` 只是属性级覆盖，on* 会被顶掉。

### A 类（X 含 on*，隐患，应改 mergeProps(prev,X)）
| 文件:行 | 形式 |
|---|---|
| MenuCheckboxItem.tsx:97 | `{...prev,...itemProps.value}`（itemProps=listNav handlers）|
| MenuCheckboxItem.tsx:98-103 | `{...prev,role,'aria-checked',onClick:handleClick}`（**spread onClick 顶掉 itemProps.onClick**）|
| MenuRadioItem.tsx:84 | `{...prev,...itemProps.value}` |
| MenuRadioItem.tsx:85-90 | `{...prev,role,'aria-checked',onClick:handleClick}`（同上）|
| MenuItem.tsx:63 | `{...prev,...itemProps.value}`（首项 prev 空无即时丢失，但脆/不合规）|
| MenuLinkItem.tsx:69 | `{...prev,...itemProps.value}` |
| MenuPopup.tsx:115 | `{...prev,...popupProps.value}`（popupProps 含 onKeyDown relay/onMouseMove/onClick；首项 prev 空，:118 已 mergeProps 补 toolbar onKeyDown）|
| MenuViewport.tsx:47 | `{...prev,...elementProps}`（用户 props 可能带 on*）|

### B 类（X 仅属性/aria，当前安全，可真改可不改）
MenuArrow:40-45、MenuGroup:30-35、MenuGroupLabel:36-41、MenuBackdrop:45-54、MenuCheckboxItemIndicator:55-59、MenuRadioItemIndicator:55-59、MenuRadioGroup:58-64（均含 `...elementProps`，当前 prev 空）、MenuSubmenuTrigger:185（aria 常量）、MenuViewport:48（children）、MenuPopup:126-129（transition 样式）。

### 安全判定（Q2）
spread 安全 ⇔ **X 不含 on* 键**（只同 key 覆盖；非事件属性右者覆盖=期望）。`...elementProps` 不满足（用户可传 on*）→ 视为隐患，建议改 mergeProps。

### 统一改法清单（Q3）
- 必改：MenuItem:63、MenuLinkItem:69、MenuCheckboxItem:97 **和** :98（onClick 项）、MenuRadioItem:84 **和** :85（onClick 项）→ `mergeProps(prev, X)`；MenuPopup:115、MenuViewport:47。
- 推荐统一：B 类里 spread `...elementProps` 的也改 mergeProps（aria/常量处可留 spread）。
- Checkbox/Radio item 第二 getter 的 `onClick:handleClick` spread 是**实际 bug**（顶掉 listNav item.onClick），改 mergeProps 后 handleClick 才与 listNav.onClick 链式。
- 已修先例：MenuSubmenuTrigger:177/:179 已 mergeProps；MenuTrigger:230/:234 本就 mergeProps；MenuPopup:118 注释说明了为何 mergeProps。

## 文件证据
- merge-props/mergeProps.ts（mergePropsN getter 整体替换语义）
- menu/item/MenuItem.tsx:63；link-item/MenuLinkItem.tsx:69；checkbox-item/MenuCheckboxItem.tsx:97,98-103；radio-item/MenuRadioItem.tsx:84,85-90；popup/MenuPopup.tsx:115,118,126；viewport/MenuViewport.tsx:47,48；arrow/MenuArrow.tsx:40-45；group/MenuGroup.tsx:30-35；group-label/MenuGroupLabel.tsx:36-41；backdrop/MenuBackdrop.tsx:45-54；checkbox-item-indicator/MenuCheckboxItemIndicator.tsx:55-59；radio-item-indicator/MenuRadioItemIndicator.tsx:55-59；radio-group/MenuRadioGroup.tsx:58-64；submenu-trigger/MenuSubmenuTrigger.tsx:177,179,185
- plantform-diff.md AD-20/AD-27（getter 整体替换保 prev）
