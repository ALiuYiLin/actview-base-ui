# actview 重构与测试拆分待办（PLAN）

## P0：useRenderElement 重构——按 ToggleGroup 标准去除 defineComponent

> 目标：全库组件统一为 ToggleGroup 的**裸函数写法**（函数体 = setup 执行一次、
> 最后 return JSX 作为渲染模板——`defineComponentPlugin` 自动转换），
> 渲染合并统一走 `useRenderElement`（`src/internals/useRenderElement.tsx`），组件源码不再出现 `defineComponent`。
> **已完成基准**：`toggle-group/ToggleGroup.tsx`、`toggle/Toggle.tsx`、
> `internals/composite/item/CompositeItem.tsx`、`internals/composite/root/CompositeRoot.tsx`、
> `toolbar/group/ToolbarGroup.tsx`（useRenderElement 首批迁移，jsdom 835 passed 无回归）。
> 范围：组件源码（**36 个组件 / 223 个文件**）；排除 internals 内部工具、
> createContext Provider 内部实现、floating-ui-react 移植层、use-render、utils、测试文件。
> 完成标准：每组件重构后 tsgo + jsdom `pnpm test` 全绿。

### combobox（26 个文件）

- [ ] 重构 combobox → 裸函数 + useRenderElement（26 个文件）
  - [ ] combobox/arrow/ComboboxArrow.tsx
  - [ ] combobox/backdrop/ComboboxBackdrop.tsx
  - [ ] combobox/chip-remove/ComboboxChipRemove.tsx
  - [ ] combobox/chip/ComboboxChip.tsx
  - [ ] combobox/chips/ComboboxChips.tsx
  - [ ] combobox/clear/ComboboxClear.tsx
  - [ ] combobox/collection/ComboboxCollection.tsx
  - [ ] combobox/empty/ComboboxEmpty.tsx
  - [ ] combobox/group-label/ComboboxGroupLabel.tsx
  - [ ] combobox/group/ComboboxGroup.tsx
  - [ ] combobox/icon/ComboboxIcon.tsx
  - [ ] combobox/input-group/ComboboxInputGroup.tsx
  - [ ] combobox/input/ComboboxInput.tsx
  - [ ] combobox/item-indicator/ComboboxItemIndicator.tsx
  - [ ] combobox/item/ComboboxItem.tsx
  - [ ] combobox/label/ComboboxLabel.tsx
  - [ ] combobox/list/ComboboxList.tsx
  - [ ] combobox/popup/ComboboxPopup.tsx
  - [ ] combobox/portal/ComboboxPortal.tsx
  - [ ] combobox/positioner/ComboboxPositioner.tsx
  - [ ] combobox/root/ComboboxRoot.tsx
  - [ ] combobox/row/ComboboxRow.tsx
  - [ ] combobox/separator/ComboboxSeparator.tsx
  - [ ] combobox/status/ComboboxStatus.tsx
  - [ ] combobox/trigger/ComboboxTrigger.tsx
  - [ ] combobox/value/ComboboxValue.tsx

### select（20 个文件）

- [ ] 重构 select → 裸函数 + useRenderElement（20 个文件）
  - [ ] select/arrow/SelectArrow.tsx
  - [ ] select/backdrop/SelectBackdrop.tsx
  - [ ] select/group-label/SelectGroupLabel.tsx
  - [ ] select/group/SelectGroup.tsx
  - [ ] select/icon/SelectIcon.tsx
  - [ ] select/item-indicator/SelectItemIndicator.tsx
  - [ ] select/item-text/SelectItemText.tsx
  - [ ] select/item/SelectItem.tsx
  - [ ] select/label/SelectLabel.tsx
  - [ ] select/list/SelectList.tsx
  - [ ] select/popup/SelectPopup.tsx
  - [ ] select/portal/SelectPortal.tsx
  - [ ] select/positioner/SelectPositioner.tsx
  - [ ] select/root/SelectRoot.tsx
  - [ ] select/scroll-arrow/SelectScrollArrow.tsx
  - [ ] select/scroll-down-arrow/SelectScrollDownArrow.tsx
  - [ ] select/scroll-up-arrow/SelectScrollUpArrow.tsx
  - [ ] select/separator/SelectSeparator.tsx
  - [ ] select/trigger/SelectTrigger.tsx
  - [ ] select/value/SelectValue.tsx

### menu（19 个文件）

- [ ] 重构 menu → 裸函数 + useRenderElement（19 个文件）
  - [ ] menu/arrow/MenuArrow.tsx
  - [ ] menu/backdrop/MenuBackdrop.tsx
  - [ ] menu/checkbox-item-indicator/MenuCheckboxItemIndicator.tsx
  - [ ] menu/checkbox-item/MenuCheckboxItem.tsx
  - [ ] menu/group-label/MenuGroupLabel.tsx
  - [ ] menu/group/MenuGroup.tsx
  - [ ] menu/item/MenuItem.tsx
  - [ ] menu/link-item/MenuLinkItem.tsx
  - [ ] menu/popup/MenuPopup.tsx
  - [ ] menu/portal/MenuPortal.tsx
  - [ ] menu/positioner/MenuPositioner.tsx
  - [ ] menu/radio-group/MenuRadioGroup.tsx
  - [ ] menu/radio-item-indicator/MenuRadioItemIndicator.tsx
  - [ ] menu/radio-item/MenuRadioItem.tsx
  - [ ] menu/root/MenuRoot.tsx
  - [ ] menu/submenu-root/MenuSubmenuRoot.tsx
  - [ ] menu/submenu-trigger/MenuSubmenuTrigger.tsx
  - [ ] menu/trigger/MenuTrigger.tsx
  - [ ] menu/viewport/MenuViewport.tsx

### navigation-menu（13 个文件）

- [ ] 重构 navigation-menu → 裸函数 + useRenderElement（13 个文件）
  - [ ] navigation-menu/arrow/NavigationMenuArrow.tsx
  - [ ] navigation-menu/backdrop/NavigationMenuBackdrop.tsx
  - [ ] navigation-menu/content/NavigationMenuContent.tsx
  - [ ] navigation-menu/icon/NavigationMenuIcon.tsx
  - [ ] navigation-menu/item/NavigationMenuItem.tsx
  - [ ] navigation-menu/link/NavigationMenuLink.tsx
  - [ ] navigation-menu/list/NavigationMenuList.tsx
  - [ ] navigation-menu/popup/NavigationMenuPopup.tsx
  - [ ] navigation-menu/portal/NavigationMenuPortal.tsx
  - [ ] navigation-menu/positioner/NavigationMenuPositioner.tsx
  - [ ] navigation-menu/root/NavigationMenuRoot.tsx
  - [ ] navigation-menu/trigger/NavigationMenuTrigger.tsx
  - [ ] navigation-menu/viewport/NavigationMenuViewport.tsx

### drawer（11 个文件）

- [ ] 重构 drawer → 裸函数 + useRenderElement（11 个文件）
  - [ ] drawer/backdrop/DrawerBackdrop.tsx
  - [ ] drawer/close/DrawerClose.tsx
  - [ ] drawer/content/DrawerContent.tsx
  - [ ] drawer/description/DrawerDescription.tsx
  - [ ] drawer/popup/DrawerPopup.tsx
  - [ ] drawer/portal/DrawerPortal.tsx
  - [ ] drawer/provider/DrawerProvider.tsx
  - [ ] drawer/root/DrawerRoot.tsx
  - [ ] drawer/title/DrawerTitle.tsx
  - [ ] drawer/trigger/DrawerTrigger.tsx
  - [ ] drawer/viewport/DrawerViewport.tsx

### popover（11 个文件）

- [ ] 重构 popover → 裸函数 + useRenderElement（11 个文件）
  - [ ] popover/arrow/PopoverArrow.tsx
  - [ ] popover/backdrop/PopoverBackdrop.tsx
  - [ ] popover/close/PopoverClose.tsx
  - [ ] popover/description/PopoverDescription.tsx
  - [ ] popover/popup/PopoverPopup.tsx
  - [ ] popover/portal/PopoverPortal.tsx
  - [ ] popover/positioner/PopoverPositioner.tsx
  - [ ] popover/root/PopoverRoot.tsx
  - [ ] popover/title/PopoverTitle.tsx
  - [ ] popover/trigger/PopoverTrigger.tsx
  - [ ] popover/viewport/PopoverViewport.tsx

### toast（11 个文件）

- [ ] 重构 toast → 裸函数 + useRenderElement（11 个文件）
  - [ ] toast/action/ToastAction.tsx
  - [ ] toast/arrow/ToastArrow.tsx
  - [ ] toast/close/ToastClose.tsx
  - [ ] toast/content/ToastContent.tsx
  - [ ] toast/description/ToastDescription.tsx
  - [ ] toast/portal/ToastPortal.tsx
  - [ ] toast/positioner/ToastPositioner.tsx
  - [ ] toast/provider/ToastProvider.tsx
  - [ ] toast/root/ToastRoot.tsx
  - [ ] toast/title/ToastTitle.tsx
  - [ ] toast/viewport/ToastViewport.tsx

### dialog（9 个文件）

- [ ] 重构 dialog → 裸函数 + useRenderElement（9 个文件）
  - [ ] dialog/backdrop/DialogBackdrop.tsx
  - [ ] dialog/close/DialogClose.tsx
  - [ ] dialog/description/DialogDescription.tsx
  - [ ] dialog/popup/DialogPopup.tsx
  - [ ] dialog/portal/DialogPortal.tsx
  - [ ] dialog/root/DialogRoot.tsx
  - [ ] dialog/title/DialogTitle.tsx
  - [ ] dialog/trigger/DialogTrigger.tsx
  - [ ] dialog/viewport/DialogViewport.tsx

### number-field（8 个文件）

- [ ] 重构 number-field → 裸函数 + useRenderElement（8 个文件）
  - [ ] number-field/decrement/NumberFieldDecrement.tsx
  - [ ] number-field/group/NumberFieldGroup.tsx
  - [ ] number-field/increment/NumberFieldIncrement.tsx
  - [ ] number-field/input/NumberFieldInput.tsx
  - [ ] number-field/root/NumberFieldRoot.tsx
  - [ ] number-field/root/useNumberFieldStepperButton.tsx
  - [ ] number-field/scrub-area-cursor/NumberFieldScrubAreaCursor.tsx
  - [ ] number-field/scrub-area/NumberFieldScrubArea.tsx

### preview-card（8 个文件）

- [ ] 重构 preview-card → 裸函数 + useRenderElement（8 个文件）
  - [ ] preview-card/arrow/PreviewCardArrow.tsx
  - [ ] preview-card/backdrop/PreviewCardBackdrop.tsx
  - [ ] preview-card/popup/PreviewCardPopup.tsx
  - [ ] preview-card/portal/PreviewCardPortal.tsx
  - [ ] preview-card/positioner/PreviewCardPositioner.tsx
  - [ ] preview-card/root/PreviewCardRoot.tsx
  - [ ] preview-card/trigger/PreviewCardTrigger.tsx
  - [ ] preview-card/viewport/PreviewCardViewport.tsx

### tooltip（8 个文件）

- [ ] 重构 tooltip → 裸函数 + useRenderElement（8 个文件）
  - [ ] tooltip/arrow/TooltipArrow.tsx
  - [ ] tooltip/popup/TooltipPopup.tsx
  - [ ] tooltip/portal/TooltipPortal.tsx
  - [ ] tooltip/positioner/TooltipPositioner.tsx
  - [ ] tooltip/provider/TooltipProvider.tsx
  - [ ] tooltip/root/TooltipRoot.tsx
  - [ ] tooltip/trigger/TooltipTrigger.tsx
  - [ ] tooltip/viewport/TooltipViewport.tsx

### field（7 个文件）

- [ ] 重构 field → 裸函数 + useRenderElement（7 个文件）
  - [ ] field/control/FieldControl.tsx
  - [ ] field/description/FieldDescription.tsx
  - [ ] field/error/FieldError.tsx
  - [ ] field/item/FieldItem.tsx
  - [ ] field/label/FieldLabel.tsx
  - [ ] field/root/FieldRoot.tsx
  - [ ] field/validity/FieldValidity.tsx

### slider（7 个文件）

- [ ] 重构 slider → 裸函数 + useRenderElement（7 个文件）
  - [ ] slider/control/SliderControl.tsx
  - [ ] slider/indicator/SliderIndicator.tsx
  - [ ] slider/label/SliderLabel.tsx
  - [ ] slider/root/SliderRoot.tsx
  - [ ] slider/thumb/SliderThumb.tsx
  - [ ] slider/track/SliderTrack.tsx
  - [ ] slider/value/SliderValue.tsx

### autocomplete（6 个文件）

- [ ] 重构 autocomplete → 裸函数 + useRenderElement（6 个文件）
  - [ ] autocomplete/input-group/AutocompleteInputGroup.tsx
  - [ ] autocomplete/item/AutocompleteItem.tsx
  - [ ] autocomplete/root/AutocompleteRoot.tsx
  - [ ] autocomplete/separator/AutocompleteSeparator.tsx
  - [ ] autocomplete/trigger/AutocompleteTrigger.tsx
  - [ ] autocomplete/value/AutocompleteValue.tsx

### scroll-area（6 个文件）

- [ ] 重构 scroll-area → 裸函数 + useRenderElement（6 个文件）
  - [ ] scroll-area/content/ScrollAreaContent.tsx
  - [ ] scroll-area/corner/ScrollAreaCorner.tsx
  - [ ] scroll-area/root/ScrollAreaRoot.tsx
  - [ ] scroll-area/scrollbar/ScrollAreaScrollbar.tsx
  - [ ] scroll-area/thumb/ScrollAreaThumb.tsx
  - [ ] scroll-area/viewport/ScrollAreaViewport.tsx

### toolbar（6 个文件）

- [ ] 重构 toolbar → 裸函数 + useRenderElement（6 个文件）
  - [ ] toolbar/button/ToolbarButton.tsx
  - [ ] toolbar/group/ToolbarGroup.tsx
  - [ ] toolbar/input/ToolbarInput.tsx
  - [ ] toolbar/link/ToolbarLink.tsx
  - [ ] toolbar/root/ToolbarRoot.tsx
  - [ ] toolbar/separator/ToolbarSeparator.tsx

### accordion（5 个文件）

- [ ] 重构 accordion → 裸函数 + useRenderElement（5 个文件）
  - [ ] accordion/header/AccordionHeader.tsx
  - [ ] accordion/item/AccordionItem.tsx
  - [ ] accordion/panel/AccordionPanel.tsx
  - [ ] accordion/root/AccordionRoot.tsx
  - [ ] accordion/trigger/AccordionTrigger.tsx

### meter（5 个文件）

- [ ] 重构 meter → 裸函数 + useRenderElement（5 个文件）
  - [ ] meter/indicator/MeterIndicator.tsx
  - [ ] meter/label/MeterLabel.tsx
  - [ ] meter/root/MeterRoot.tsx
  - [ ] meter/track/MeterTrack.tsx
  - [ ] meter/value/MeterValue.tsx

### progress（5 个文件）

- [ ] 重构 progress → 裸函数 + useRenderElement（5 个文件）
  - [ ] progress/indicator/ProgressIndicator.tsx
  - [ ] progress/label/ProgressLabel.tsx
  - [ ] progress/root/ProgressRoot.tsx
  - [ ] progress/track/ProgressTrack.tsx
  - [ ] progress/value/ProgressValue.tsx

### tabs（5 个文件）

- [ ] 重构 tabs → 裸函数 + useRenderElement（5 个文件）
  - [ ] tabs/indicator/TabsIndicator.tsx
  - [ ] tabs/list/TabsList.tsx
  - [ ] tabs/panel/TabsPanel.tsx
  - [ ] tabs/root/TabsRoot.tsx
  - [ ] tabs/tab/TabsTab.tsx

### avatar（3 个文件）

- [ ] 重构 avatar → 裸函数 + useRenderElement（3 个文件）
  - [ ] avatar/fallback/AvatarFallback.tsx
  - [ ] avatar/image/AvatarImage.tsx
  - [ ] avatar/root/AvatarRoot.tsx

### collapsible（3 个文件）

- [ ] 重构 collapsible → 裸函数 + useRenderElement（3 个文件）
  - [ ] collapsible/panel/CollapsiblePanel.tsx
  - [ ] collapsible/root/CollapsibleRoot.tsx
  - [ ] collapsible/trigger/CollapsibleTrigger.tsx

### alert-dialog（2 个文件）

- [ ] 重构 alert-dialog → 裸函数 + useRenderElement（2 个文件）
  - [ ] alert-dialog/root/AlertDialogRoot.tsx
  - [ ] alert-dialog/trigger/AlertDialogTrigger.tsx

### checkbox（2 个文件）

- [ ] 重构 checkbox → 裸函数 + useRenderElement（2 个文件）
  - [ ] checkbox/indicator/CheckboxIndicator.tsx
  - [ ] checkbox/root/CheckboxRoot.tsx

### context-menu（2 个文件）

- [ ] 重构 context-menu → 裸函数 + useRenderElement（2 个文件）
  - [ ] context-menu/root/ContextMenuRoot.tsx
  - [ ] context-menu/trigger/ContextMenuTrigger.tsx

### fieldset（2 个文件）

- [ ] 重构 fieldset → 裸函数 + useRenderElement（2 个文件）
  - [ ] fieldset/legend/FieldsetLegend.tsx
  - [ ] fieldset/root/FieldsetRoot.tsx

### otp-field（2 个文件）

- [ ] 重构 otp-field → 裸函数 + useRenderElement（2 个文件）
  - [ ] otp-field/input/OTPFieldInput.tsx
  - [ ] otp-field/root/OTPFieldRoot.tsx

### radio（2 个文件）

- [ ] 重构 radio → 裸函数 + useRenderElement（2 个文件）
  - [ ] radio/indicator/RadioIndicator.tsx
  - [ ] radio/root/RadioRoot.tsx

### switch（2 个文件）

- [ ] 重构 switch → 裸函数 + useRenderElement（2 个文件）
  - [ ] switch/root/SwitchRoot.tsx
  - [ ] switch/thumb/SwitchThumb.tsx

### button（1 个文件）

- [ ] 重构 button → 裸函数 + useRenderElement（1 个文件）
  - [ ] button/Button.tsx

### checkbox-group（1 个文件）

- [ ] 重构 checkbox-group → 裸函数 + useRenderElement（1 个文件）
  - [ ] checkbox-group/CheckboxGroup.tsx

### form（1 个文件）

- [ ] 重构 form → 裸函数 + useRenderElement（1 个文件）
  - [ ] form/Form.tsx

### input（1 个文件）

- [ ] 重构 input → 裸函数 + useRenderElement（1 个文件）
  - [ ] input/Input.tsx

### menubar（1 个文件）

- [ ] 重构 menubar → 裸函数 + useRenderElement（1 个文件）
  - [ ] menubar/Menubar.tsx

### radio-group（1 个文件）

- [ ] 重构 radio-group → 裸函数 + useRenderElement（1 个文件）
  - [ ] radio-group/RadioGroup.tsx

### separator（1 个文件）

- [ ] 重构 separator → 裸函数 + useRenderElement（1 个文件）
  - [ ] separator/Separator.tsx

## P1：测试文件——无测试组件按 React 分布新建

### toggle-group（React 2 个——actview 0，全部新建）

- [ ] 新建 src/toggle-group/ToggleGroup.test.tsx（对应 React ToggleGroup.test.tsx）
- [ ] 新建 src/toggle-group/enumSync.test.tsx（对应 React enumSync.test.tsx）

### meter（React 5 个——actview 0，全部新建）

- [ ] 新建 src/meter/indicator/MeterIndicator.test.tsx（对应 React indicator/MeterIndicator.test.tsx）
- [ ] 新建 src/meter/label/MeterLabel.test.tsx（对应 React label/MeterLabel.test.tsx）
- [ ] 新建 src/meter/root/MeterRoot.test.tsx（对应 React root/MeterRoot.test.tsx）
- [ ] 新建 src/meter/track/MeterTrack.test.tsx（对应 React track/MeterTrack.test.tsx）
- [ ] 新建 src/meter/value/MeterValue.test.tsx（对应 React value/MeterValue.test.tsx）

### checkbox-group（React 2 个——actview 0，全部新建）

- [ ] 新建 src/checkbox-group/CheckboxGroup.test.tsx（对应 React CheckboxGroup.test.tsx）
- [ ] 新建 src/checkbox-group/useCheckboxGroupParent.test.tsx（对应 React useCheckboxGroupParent.test.tsx）

## P2：测试文件——合并测试拆分到子组件（对齐 React 分布）

### combobox（React 38 vs actview 1：合并文件 `packages/actview/src/combobox/root/ComboboxRoot.test.tsx`）

- [ ] 拆分 packages/actview/src/combobox/root/ComboboxRoot.test.tsx → 38 个子组件测试（对齐 React 分布）
  - [ ] arrow/ComboboxArrow.test.tsx
  - [ ] backdrop/ComboboxBackdrop.test.tsx
  - [ ] chip-remove/ComboboxChipRemove.test.tsx
  - [ ] chip/ComboboxChip.test.tsx
  - [ ] chips/ComboboxChips.test.tsx
  - [ ] clear/ComboboxClear.test.tsx
  - [ ] collection/ComboboxCollection.test.tsx
  - [ ] empty/ComboboxEmpty.test.tsx
  - [ ] group-label/ComboboxGroupLabel.test.tsx
  - [ ] group/ComboboxGroup.test.tsx
  - [ ] group/ComboboxGroupContext.test.tsx
  - [ ] icon/ComboboxIcon.test.tsx
  - [ ] input-group/ComboboxInputGroup.test.tsx
  - [ ] input/ComboboxInput.android.test.tsx
  - [ ] input/ComboboxInput.gecko.test.tsx
  - [ ] input/ComboboxInput.test.tsx
  - [ ] item-indicator/ComboboxItemIndicator.test.tsx
  - [ ] item/ComboboxItem.test.tsx
  - [ ] item/ComboboxItemContext.test.tsx
  - [ ] items/createItems.test.tsx
  - [ ] label/ComboboxLabel.test.tsx
  - [ ] list/ComboboxList.test.tsx
  - [ ] popup/ComboboxPopup.test.tsx
  - [ ] portal/ComboboxPortal.test.tsx
  - [ ] portal/ComboboxPortalContext.test.tsx
  - [ ] positioner/ComboboxPositioner.test.tsx
  - [ ] positioner/ComboboxPositionerContext.test.tsx
  - [ ] root/ComboboxRoot.test.tsx
  - [ ] root/ComboboxRootContext.test.tsx
  - [ ] root/utils/index.test.ts
  - [ ] root/utils/useFilter.test.tsx
  - [ ] status/ComboboxStatus.iOS.test.tsx
  - [ ] status/ComboboxStatus.test.tsx
  - [ ] trigger/ComboboxTrigger.test.tsx
  - [ ] utils/handleInputPress.test.ts
  - [ ] utils/parts.test.ts
  - [ ] utils/useInitialLiveRegionTextMutation.test.tsx
  - [ ] value/ComboboxValue.test.tsx

### select（React 19 vs actview 1：合并文件 `packages/actview/src/select/root/SelectRoot.test.tsx`）

- [ ] 拆分 packages/actview/src/select/root/SelectRoot.test.tsx → 19 个子组件测试（对齐 React 分布）
  - [ ] arrow/SelectArrow.test.tsx
  - [ ] backdrop/SelectBackdrop.test.tsx
  - [ ] group-label/SelectGroupLabel.test.tsx
  - [ ] group/SelectGroup.test.tsx
  - [ ] icon/SelectIcon.test.tsx
  - [ ] item-indicator/SelectItemIndicator.test.tsx
  - [ ] item-text/SelectItemText.test.tsx
  - [ ] item/SelectItem.test.tsx
  - [ ] label/SelectLabel.test.tsx
  - [ ] list/SelectList.test.tsx
  - [ ] popup/SelectPopup.test.tsx
  - [ ] portal/SelectPortal.test.tsx
  - [ ] positioner/SelectPositioner.test.tsx
  - [ ] root/SelectRoot.test.tsx
  - [ ] scroll-arrow/SelectScrollArrow.test.tsx
  - [ ] scroll-down-arrow/SelectScrollDownArrow.test.tsx
  - [ ] scroll-up-arrow/SelectScrollUpArrow.test.tsx
  - [ ] trigger/SelectTrigger.test.tsx
  - [ ] value/SelectValue.test.tsx

### toast（React 16 vs actview 1：合并文件 `packages/actview/src/toast/useToastManager.test.tsx`）

- [ ] 拆分 packages/actview/src/toast/useToastManager.test.tsx → 16 个子组件测试（对齐 React 分布）
  - [ ] action/ToastAction.test.tsx
  - [ ] arrow/ToastArrow.test.tsx
  - [ ] close/ToastClose.test.tsx
  - [ ] content/ToastContent.test.tsx
  - [ ] createToastManager.test.tsx
  - [ ] description/ToastDescription.test.tsx
  - [ ] enumSync.test.tsx
  - [ ] portal/ToastPortal.test.tsx
  - [ ] positioner/ToastPositioner.test.tsx
  - [ ] provider/ToastProvider.test.tsx
  - [ ] root/ToastRoot.test.tsx
  - [ ] store.test.ts
  - [ ] title/ToastTitle.test.tsx
  - [ ] useToastManager.test.tsx
  - [ ] utils/isRenderableNode.test.ts
  - [ ] viewport/ToastViewport.test.tsx

### navigation-menu（React 15 vs actview 1：合并文件 `packages/actview/src/navigation-menu/root/NavigationMenuRoot.test.tsx`）

- [ ] 拆分 packages/actview/src/navigation-menu/root/NavigationMenuRoot.test.tsx → 15 个子组件测试（对齐 React 分布）
  - [ ] arrow/NavigationMenuArrow.test.tsx
  - [ ] backdrop/NavigationMenuBackdrop.test.tsx
  - [ ] content/NavigationMenuContent.test.tsx
  - [ ] icon/NavigationMenuIcon.test.tsx
  - [ ] item/NavigationMenuItem.test.tsx
  - [ ] link/NavigationMenuLink.test.tsx
  - [ ] list/NavigationMenuList.test.tsx
  - [ ] popup/NavigationMenuPopup.test.tsx
  - [ ] portal/NavigationMenuPortal.test.tsx
  - [ ] positioner/NavigationMenuPositioner.test.tsx
  - [ ] root/NavigationMenuRoot.test.tsx
  - [ ] root/NavigationMenuRoot.webkit.test.tsx
  - [ ] root/NavigationMenuRootContext.test.ts
  - [ ] trigger/NavigationMenuTrigger.test.tsx
  - [ ] viewport/NavigationMenuViewport.test.tsx

### number-field（React 12 vs actview 1：合并文件 `packages/actview/src/number-field/NumberField.test.tsx`）

- [ ] 拆分 packages/actview/src/number-field/NumberField.test.tsx → 12 个子组件测试（对齐 React 分布）
  - [ ] decrement/NumberFieldDecrement.test.tsx
  - [ ] group/NumberFieldGroup.test.tsx
  - [ ] increment/NumberFieldIncrement.test.tsx
  - [ ] input/NumberFieldInput.test.tsx
  - [ ] root/NumberFieldRoot.iOS.test.tsx
  - [ ] root/NumberFieldRoot.test.tsx
  - [ ] scrub-area-cursor/NumberFieldScrubAreaCursor.test.tsx
  - [ ] scrub-area/NumberFieldScrubArea.gecko.test.tsx
  - [ ] scrub-area/NumberFieldScrubArea.test.tsx
  - [ ] utils/getViewportRect.test.ts
  - [ ] utils/parse.test.ts
  - [ ] utils/validate.test.ts

### slider（React 12 vs actview 1：合并文件 `packages/actview/src/slider/Slider.test.tsx`）

- [ ] 拆分 packages/actview/src/slider/Slider.test.tsx → 12 个子组件测试（对齐 React 分布）
  - [ ] control/SliderControl.test.tsx
  - [ ] enumSync.test.tsx
  - [ ] indicator/SliderIndicator.test.tsx
  - [ ] label/SliderLabel.test.tsx
  - [ ] root/SliderRoot.test.tsx
  - [ ] thumb/SliderThumb.test.tsx
  - [ ] track/SliderTrack.test.tsx
  - [ ] utils/getPushedThumbValues.test.ts
  - [ ] utils/getSliderValue.test.ts
  - [ ] utils/resolveThumbCollision.test.ts
  - [ ] utils/roundValueToStep.test.ts
  - [ ] value/SliderValue.test.tsx

### drawer（React 11 vs actview 1：合并文件 `packages/actview/src/drawer/root/DrawerRoot.test.tsx`）

- [ ] 拆分 packages/actview/src/drawer/root/DrawerRoot.test.tsx → 11 个子组件测试（对齐 React 分布）
  - [ ] content/DrawerContent.test.tsx
  - [ ] indent-background/DrawerIndentBackground.test.tsx
  - [ ] indent/DrawerIndent.test.tsx
  - [ ] popup/DrawerPopup.test.tsx
  - [ ] provider/DrawerProvider.test.tsx
  - [ ] root/DrawerRoot.test.tsx
  - [ ] root/DrawerSnapPoints.test.tsx
  - [ ] root/useDrawerSnapPoints.test.ts
  - [ ] swipe-area/DrawerSwipeArea.test.tsx
  - [ ] viewport/DrawerViewport.test.tsx
  - [ ] virtual-keyboard-provider/DrawerVirtualKeyboardProvider.test.tsx

### preview-card（React 9 vs actview 1：合并文件 `packages/actview/src/preview-card/root/PreviewCardRoot.test.tsx`）

- [ ] 拆分 packages/actview/src/preview-card/root/PreviewCardRoot.test.tsx → 9 个子组件测试（对齐 React 分布）
  - [ ] arrow/PreviewCardArrow.test.tsx
  - [ ] backdrop/PreviewCardBackdrop.test.tsx
  - [ ] popup/PreviewCardPopup.test.tsx
  - [ ] portal/PreviewCardPortal.test.tsx
  - [ ] positioner/PreviewCardPositioner.test.tsx
  - [ ] root/PreviewCardRoot.detached-triggers.test.tsx
  - [ ] root/PreviewCardRoot.test.tsx
  - [ ] trigger/PreviewCardTrigger.test.tsx
  - [ ] viewport/PreviewCardViewport.test.tsx

### scroll-area（React 7 vs actview 1：合并文件 `packages/actview/src/scroll-area/ScrollArea.test.tsx`）

- [ ] 拆分 packages/actview/src/scroll-area/ScrollArea.test.tsx → 7 个子组件测试（对齐 React 分布）
  - [ ] content/ScrollAreaContent.test.tsx
  - [ ] corner/ScrollAreaCorner.test.tsx
  - [ ] enumSync.test.tsx
  - [ ] root/ScrollAreaRoot.test.tsx
  - [ ] scrollbar/ScrollAreaScrollbar.test.tsx
  - [ ] thumb/ScrollAreaThumb.test.tsx
  - [ ] viewport/ScrollAreaViewport.test.tsx

### progress（React 6 vs actview 1：合并文件 `packages/actview/src/progress/Progress.test.tsx`）

- [ ] 拆分 packages/actview/src/progress/Progress.test.tsx → 6 个子组件测试（对齐 React 分布）
  - [ ] enumSync.test.ts
  - [ ] indicator/ProgressIndicator.test.tsx
  - [ ] label/ProgressLabel.test.tsx
  - [ ] root/ProgressRoot.test.tsx
  - [ ] track/ProgressTrack.test.tsx
  - [ ] value/ProgressValue.test.tsx

### tabs（React 6 vs actview 1：合并文件 `packages/actview/src/tabs/Tabs.test.tsx`）

- [ ] 拆分 packages/actview/src/tabs/Tabs.test.tsx → 6 个子组件测试（对齐 React 分布）
  - [ ] enumSync.test.tsx
  - [ ] indicator/TabsIndicator.test.tsx
  - [ ] list/TabsList.test.tsx
  - [ ] panel/TabsPanel.test.tsx
  - [ ] root/TabsRoot.test.tsx
  - [ ] tab/TabsTab.test.tsx

### toolbar（React 6 vs actview 1：合并文件 `packages/actview/src/toolbar/Toolbar.test.tsx`）

- [ ] 拆分 packages/actview/src/toolbar/Toolbar.test.tsx → 6 个子组件测试（对齐 React 分布）
  - [ ] button/ToolbarButton.test.tsx
  - [ ] group/ToolbarGroup.test.tsx
  - [ ] input/ToolbarInput.test.tsx
  - [ ] link/ToolbarLink.test.tsx
  - [ ] root/ToolbarRoot.test.tsx
  - [ ] separator/ToolbarSeparator.test.tsx

### checkbox（React 4 vs actview 1：合并文件 `packages/actview/src/checkbox/Checkbox.test.tsx`）

- [ ] 拆分 packages/actview/src/checkbox/Checkbox.test.tsx → 4 个子组件测试（对齐 React 分布）
  - [ ] enumSync.test.ts
  - [ ] indicator/CheckboxIndicator.test.tsx
  - [ ] root/CheckboxRoot.react17.test.tsx
  - [ ] root/CheckboxRoot.test.tsx

### otp-field（React 4 vs actview 1：合并文件 `packages/actview/src/otp-field/root/OTPFieldRoot.test.tsx`）

- [ ] 拆分 packages/actview/src/otp-field/root/OTPFieldRoot.test.tsx → 4 个子组件测试（对齐 React 分布）
  - [ ] input/OTPFieldInput.test.tsx
  - [ ] root/OTPFieldRoot.react17.test.tsx
  - [ ] root/OTPFieldRoot.test.tsx
  - [ ] utils/otp.test.ts

### autocomplete（React 3 vs actview 1：合并文件 `packages/actview/src/autocomplete/root/AutocompleteRoot.test.tsx`）

- [ ] 拆分 packages/actview/src/autocomplete/root/AutocompleteRoot.test.tsx → 3 个子组件测试（对齐 React 分布）
  - [ ] item/AutocompleteItem.test.tsx
  - [ ] root/AutocompleteRoot.test.tsx
  - [ ] value/AutocompleteValue.test.tsx

### radio（React 3 vs actview 1：合并文件 `packages/actview/src/radio/Radio.test.tsx`）

- [ ] 拆分 packages/actview/src/radio/Radio.test.tsx → 3 个子组件测试（对齐 React 分布）
  - [ ] enumSync.test.ts
  - [ ] indicator/RadioIndicator.test.tsx
  - [ ] root/RadioRoot.test.tsx

### switch（React 3 vs actview 1：合并文件 `packages/actview/src/switch/Switch.test.tsx`）

- [ ] 拆分 packages/actview/src/switch/Switch.test.tsx → 3 个子组件测试（对齐 React 分布）
  - [ ] enumSync.test.ts
  - [ ] root/SwitchRoot.test.tsx
  - [ ] thumb/SwitchThumb.test.tsx

## P3：测试文件——已按子组件分布，补齐缺失

### menu（React 21 vs actview 18：缺 3 个）

- [ ] 补齐 root/MenuRoot.detached-triggers.test.tsx
- [ ] 补齐 submenu-trigger/MenuSubmenuTrigger.talkBack.test.tsx
- [ ] 补齐 submenu-trigger/MenuSubmenuTrigger.voiceOver.test.tsx

### popover（React 13 vs actview 9：缺 5 个）

- [ ] 补齐 arrow/PopoverArrow.test.tsx
- [ ] 补齐 description/PopoverDescription.test.tsx
- [ ] 补齐 enumSync.test.tsx
- [ ] 补齐 portal/PopoverPortal.test.tsx
- [ ] 补齐 root/PopoverRoot.detached-triggers.test.tsx

### dialog（React 10 vs actview 6：缺 5 个）

- [ ] 补齐 description/DialogDescription.test.tsx
- [ ] 补齐 popup/DialogPopup.test.tsx
- [ ] 补齐 root/DialogRoot.detached-triggers.test.tsx
- [ ] 补齐 title/DialogTitle.test.tsx
- [ ] 补齐 viewport/DialogViewport.test.tsx

### tooltip（React 9 vs actview 3：缺 6 个）

- [ ] 补齐 arrow/TooltipArrow.test.tsx
- [ ] 补齐 portal/TooltipPortal.test.tsx
- [ ] 补齐 positioner/TooltipPositioner.test.tsx
- [ ] 补齐 provider/TooltipProvider.test.tsx
- [ ] 补齐 root/TooltipRoot.detached-triggers.test.tsx
- [ ] 补齐 viewport/TooltipViewport.test.tsx

### field（React 8 vs actview 6：缺 2 个）

- [ ] 补齐 item/FieldItem.test.tsx
- [ ] 补齐 root/FieldRoot.react17.test.tsx

### accordion（React 5 vs actview 4：缺 1 个）

- [ ] 补齐 panel/AccordionPanel.test.tsx

### collapsible（React 3 vs actview 2：缺 1 个）

- [ ] 补齐 panel/CollapsiblePanel.test.tsx

## 备注

- 重构与测试拆分可并行（重构先行更优：裸函数组件更接近 React 测试转写形态）；
- actview 现有合并测试文件拆分后删除原文件（用例已归位），保持每子组件一个测试文件；
- 平台限定测试（`.android` / `.gecko` / `.iOS` / `talkBack` / `voiceOver` / `.react17`）按 actview 当前平台能力决定是否转写；
- `utils/`、`Context`、`enumSync` 等纯逻辑测试独立成文件（对齐 React 分布）；
- 未列出的组件 = React 测试数 ≤ actview（含 actview 反超项），分布已达标。