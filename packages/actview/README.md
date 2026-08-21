# @base-ui/actview — ActView 重构进度

> 将 `packages/react` 的组件逐步迁移到 ActView（`@actview/core`），
> 核心模式：`defineComponent` + `useRootElement` / `useButton`（`buttonRef`）+
> `mergePropsN` + `getStateAttributesProps` + render 三形态。
>
> 详细迁移案例见 `react-migration.md`。

---

## ✅ 已重构组件（41 个源文件）

### Separator 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `separator/Separator.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | 无 |

### Button 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `button/Button.tsx` | defineComponent + useButton(buttonRef) + getButtonProps + mergePropsN + 三形态 | 无 |
| `button/ButtonDataAttributes.tsx` | 纯数据定义 | 无 |

### DirectionProvider
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `direction-provider/DirectionProvider.tsx` | defineComponent + 无 DOM Provider + computed | 无 |

### CSPProvider
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `csp-provider/CSPProvider.tsx` | defineComponent + 无 DOM Provider + computed | 无 |

### Form 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `form/Form.tsx` | defineComponent + ref() + Provider 包裹 + 泛型 as | `FormContext`（官方 createContext） |
| `input/Input.tsx` | defineComponent + 薄委托 JSX 透传 | — |

### Field 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `field/root/FieldRoot.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `FieldRootContext`（自封装⚠️） |
| `field/control/FieldControl.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `FieldRootContext`（自封装⚠️） |
| `field/item/FieldItem.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `FieldRootContext`（自封装⚠️） |
| `field/description/FieldDescription.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `FieldRootContext`（自封装⚠️） |
| `field/error/FieldError.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 + useTransitionStatus | `FieldRootContext`（自封装⚠️） |

### Meter 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `meter/root/MeterRoot.tsx` | defineComponent + ref() + Provider 包裹 + 泛型 as | `MeterRootContext`（官方 createContext） |
| `meter/label/MeterLabel.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `MeterRootContext`（官方 createContext） |
| `meter/value/MeterValue.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `MeterRootContext`（官方 createContext） |
| `meter/indicator/MeterIndicator.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `MeterRootContext`（官方 createContext） |
| `meter/track/MeterTrack.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `MeterRootContext`（官方 createContext） |

### Radio 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `radio/root/RadioRoot.tsx` | defineComponent + useButton(buttonRef) + mergePropsN + 三形态 | `RadioGroupContext`（自封装⚠️）、`FieldRootContext`（自封装⚠️） |
| `radio/group/RadioGroup.tsx` | defineComponent + ref() + Provider 包裹 + 泛型 as | `FieldRootContext`（自封装⚠️） |

### Toggle 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `toggle/Toggle.tsx` | defineComponent + useButton(buttonRef) + mergePropsN + 三形态 | `ToggleGroupContext`（**官方 createContext** ✅） |
| `toggle-group/ToggleGroup.tsx` | defineComponent + ref() + Provider 包裹 | `FieldRootContext`（自封装⚠️） |

### Composite 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `composite/root/CompositeRoot.tsx` | defineComponent + ref() + Provider 包裹 + 泛型 as | `CompositeListContext`（官方 createContext） |
| `composite/item/CompositeItem.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 + 泛型 as | `CompositeListContext`（官方 createContext） |
| `composite/list/CompositeList.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `CompositeListContext`（官方 createContext） |

### Toolbar 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `toolbar/group/ToolbarGroup.tsx` | defineComponent + ref() + Provider 包裹 + 三形态 | `ToolbarGroupContext`（官方 createContext） |

### NumberField 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `number-field/root/NumberFieldRoot.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `FieldRootContext`（自封装⚠️）、`NumberFieldRootContext`（官方 createContext） |

### Avatar 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `avatar/root/AvatarRoot.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `AvatarRootContext`（官方 createContext） |
| `avatar/image/AvatarImage.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 + useTransitionStatus | `AvatarRootContext`（官方 createContext） |
| `avatar/fallback/AvatarFallback.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 + useTimeout | `AvatarRootContext`（官方 createContext） |

### Switch 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `switch/root/SwitchRoot.tsx` | defineComponent + useButton(buttonRef) + mergePropsN + 三形态 | `FieldRootContext`（自封装⚠️）、`SwitchRootContext`（官方 createContext） |
| `switch/thumb/SwitchThumb.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `SwitchRootContext`（官方 createContext） |

### Field 子件
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `field/root/FieldRoot.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `FieldRootContext`（自封装⚠️） |
| `field/control/FieldControl.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `FieldRootContext`（自封装⚠️） |
| `field/item/FieldItem.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `FieldRootContext`（自封装⚠️） |
| `field/description/FieldDescription.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `FieldRootContext`（自封装⚠️） |
| `field/error/FieldError.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 + useTransitionStatus | `FieldRootContext`（自封装⚠️） |

### Checkbox 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `checkbox/indicator/CheckboxIndicator.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 + useTransitionStatus | `CheckboxRootContext`（自封装⚠️） |
| `checkbox-group/CheckboxGroup.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `CheckboxGroupContext`（**官方 createContext** ✅）、`FieldRootContext`（自封装⚠️）、`LabelableContext`（自封装⚠️）、`FormContext`（官方 createContext） |

### Autocomplete 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `autocomplete/value/AutocompleteValue.tsx` | defineComponent + 渲染期解构 children（无 DOM） | `ComboboxInputValueContext`（自封装⚠️） |

### Accordion 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `accordion/header/AccordionHeader.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `AccordionItemContext`（自封装⚠️） |
| `accordion/trigger/AccordionTrigger.tsx` | defineComponent + useButton(buttonRef) + mergePropsN + 三形态 | `CollapsibleRootContext`（自封装⚠️）、`AccordionItemContext`（自封装⚠️） |
| `accordion/panel/AccordionPanel.tsx` | defineComponent + useCollapsiblePanel(ref) + mergePropsN + 三形态 | `CollapsibleRootContext`（自封装⚠️）、`AccordionItemContext`（自封装⚠️）、`AccordionRootContext`（自封装⚠️） |

### Collapsible 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `collapsible/trigger/CollapsibleTrigger.tsx` | defineComponent + useButton(buttonRef) + mergePropsN + 三形态 | `CollapsibleRootContext`（自封装⚠️） |
| `collapsible/panel/CollapsiblePanel.tsx` | defineComponent + useCollapsiblePanel(ref) + mergePropsN + 三形态 | `CollapsibleRootContext`（自封装⚠️） |

### Combobox 家族
| 文件 | 模式 | 依赖的 Context |
|------|------|----------------|
| `combobox/backdrop/ComboboxBackdrop.tsx` | defineComponent + useRootElement + mergePropsN + 三形态 | `ComboboxRootContext`（自封装⚠️） |
| `combobox/arrow/ComboboxArrow.tsx` | defineComponent + ref() + watch 同步 arrowRef + mergePropsN + 三形态 | `ComboboxRootContext`（自封装⚠️）、`ComboboxPositionerContext`（自封装⚠️） |

---

## ⏸️ 暂不重构的文件（原因）

### 薄委托组件（delegate to 未重构实现）
这些文件只是类型别名/重导出，实际实现在底层组件中，底层未重构则无需动：

| 文件 | 委托给 | 底层组件状态 |
|------|--------|-------------|
| `autocomplete/item/AutocompleteItem.tsx` | `ComboboxItem` | 未重构（使用 useRenderElement） |
| `autocomplete/separator/AutocompleteSeparator.tsx` | `ListboxSeparator` | 未重构（使用 useRenderElement） |
| `autocomplete/input-group/AutocompleteInputGroup.tsx` | `ComboboxInputGroup` | 未重构 |
| `autocomplete/trigger/AutocompleteTrigger.tsx` | `ComboboxTrigger` | 未重构 |
| `autocomplete/root/AutocompleteRoot.tsx` | `AriaCombobox` | 复杂 store 组件，独立设计 |

### Context 文件（Provider 组件未重构时无法迁移）
这些 Context 使用了 `internals/createContext`（自封装版），需等 Provider 组件重构后一并迁移到官方 `createContext`：

| Context | 使用方（已重构 ✅） | Provider 组件 | Provider 状态 |
|---------|-------------------|---------------|--------------|
| `CheckboxRootContext` | CheckboxIndicator | CheckboxRoot | 未重构 |
| `CollapsibleRootContext` | CollapsibleTrigger、CollapsiblePanel、AccordionTrigger、AccordionPanel | CollapsibleRoot、AccordionItem | 未重构 |
| `ComboboxRootContext` | ComboboxBackdrop、ComboboxArrow | AriaCombobox | 未重构 |
| `ComboboxPositionerContext` | ComboboxArrow | ComboboxPositioner | 未重构 |
| `AccordionItemContext` | AccordionHeader、AccordionTrigger、AccordionPanel | AccordionItem | 未重构 |
| `AccordionRootContext` | AccordionPanel | AccordionRoot | 未重构 |
| `FieldRootContext` | Field 家族、CheckboxGroup 等 | FieldRoot | 已重构 ✅（但自封装 createContext 仍被大量使用） |
| `LabelableContext` | CheckboxGroup 等 | 多个 Provider | 未重构 |

### Context 迁移规则
- **Provider 已重构** → Context 可安全迁移到官方 `createContext`（如 `CheckboxGroupContext`、`ToggleGroupContext`、`MeterRootContext`）
- **Provider 未重构** → Context 暂保留 `internals/createContext`，等 Provider 重构时一起迁移
- 迁移模式见 `ToggleGroupContext.ts`（官方 `createContext` 单参 + `use()` 返回 `Ref` 强转 `ComputedRef`）

---

## 📊 统计

| 维度 | 数量 |
|------|------|
| 已重构源文件 | 41 |
| 已重构家族 | 15（Separator、Button、DirectionProvider、CSPProvider、Form、Input、Field、Meter、Radio、Toggle、Composite、Toolbar、NumberField、Avatar、Switch、Checkbox、Autocomplete、Accordion、Collapsible、Combobox） |
| 已迁移到官方 createContext 的 Context | 8（FormContext、ToggleGroupContext、MeterRootContext、CompositeListContext、ToolbarGroupContext、NumberFieldRootContext、AvatarRootContext、SwitchRootContext、CheckboxGroupContext） |
| 待重构源文件 | 200+ |
| 薄委托（无需重构） | 5 |
| 暂存自封装 createContext | 50+ |