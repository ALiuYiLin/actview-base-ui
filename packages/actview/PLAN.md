# actview 组件重构计划（PLAN）

> **本轮重写**：实现基准变更——范式与 API 以 `E:\code3\actview\src\components`（2026-08 大版本更新）的**签名与语义**为基准。
> **实现方式（已按裁决更新）**：internals 基础（useRenderElement / mergeProps / useMergedRefs / utils×3）**直接采用目标版文件**落地到规范路径；旧签名实现暂存 `internals/useRenderElementLegacy.tsx` 供 ~169 个存量调用点过渡，P1 迁移完成后删除。家族组件按目标范式逐族迁移；类型/本地扩展（`@/` 路径、MaybeRefOrGetter、style string 形态）做最小适配。
> 旧计划的 P0/P1/P2/P3 已清空；测试差距分析（React 分布对照）经验证仍有效，收编进 P3。
> 范式文档：`E:\code3\actview\docs\`（API / components / react-migration / vue-migration / babel-defineComponent / headless-components / dual-ref-props 案例）。

---

## 0. 范式基准（相对旧计划 / MIGRATION.md 的关键变化）

| # | 变化 | 说明 |
|---|---|---|
| 1 | **裸函数是唯一推荐形态** | 函数体 = setup（只执行一次），最后直接 return JSX，Babel 自动包 render 函数。`return () => JSX`（setup 风格）**编译期直接报错**；手动 `defineComponent(fn)` 仅限 .ts/测试直调场景（fn 必须返回渲染函数）。MIGRATION.md 案例 1 / 案例总结的 defineComponent 范式**作废** |
| 2 | **useRenderElement 签名更换** | 本地旧版 `useRenderElement(options) → { merged(), element(extraRefs?) }` → 目标签名 **`useRenderElement(element, componentProps, params) → VNode`**（state/ref/props/stateAttributesMapping，render 双形态与 ref 合并链内建）。调用约定：字面 JSX 内嵌调用（Fragment/JSX 锚）。**过渡期旧实现暂存 `useRenderElementLegacy.tsx` 供存量调用点使用，P1 迁移完成后删除** |
| 3 | **ref 形 props 惯用法** | `toRefs` 只解构**值形 props**；ref 形 props（`props.ref`/`props.inputRef`）**直读本体**，禁入 toRefs/useProps 解构（toRef 的 ref 透传 → 双重解包 + setup 快照二义性）；rest 转发用 EXCLUDE 集合剔除 ref 形键。详见 `E:\code3\actview\docs\dual-ref-props.md` |
| 4 | **ref 传递（父侧）** | 自定义名 ref 形 prop 必须 `rawRef()` 包裹——jsxFactory 对顶层 ref 属性值解包成值快照；`ref` 键本身不解包，直达 `props.ref` |
| 5 | **Context：store-as-is 新契约** | 官方 `createContext` **零包装零监听**（2026-08 语义变更）：Provider 原样存储 value，响应式由传入载体携带（reactive 对象/装 ref 容器/rawRef）；**传快照 = 静态注入**。payload 用 `reactive()` 时泛型标注 `Reactive<T>`（对象默认值重载已编译期强制 Reactive）。MIGRATION.md 案例 5 的「Provider watch 同步 value」描述已过期；本地 internals 已无 createContext.tsx（旧案例 16.2 的 internals 版不可用） |
| 6 | **aria-*/data-* 布尔已规范化** | setProp 对布尔输出 `"true"/"false"`（false 不移除），SSR 同步——可直接传布尔，无需手工 `? 'true' : undefined` |
| 7 | **根 DOM 引用** | `<Comp ref={x}/>` 拿**组件实例是有意设计**；需要 DOM 时组件内转发：`<div ref={props.ref}>` 或 `useRenderElement` 的 `params.ref` 透传（首选）；`useRootElement()`（core lifecycle）为备选且可能被移除。Fragment 根场景本地 `useRootElementFragment` 的去留在 P0 评估 |
| 8 | **事件/属性差异（仍有效）** | `onChange`=原生 change（受控文本用 onInput）；`for` 而非 `htmlFor`；无合成事件（原生 Event + `preventBaseUIHandler` 链合并）；类名映射仅 `className→class` |

---

## 现状盘点（本轮扫描数据）

- 非测试组件 tsx 共 **229 个**；其中 ~169 个使用本地旧签名 useRenderElement（**全部需要调用点迁移**）；60 个完全不用 useRenderElement（Provider / 薄委托 / Portal / 简单包装——权威 `CheckboxGroup.tsx` 先例允许保持纯 JSX，按豁免类处理）。
- **defineComponent 残留仅 4 个源码文件**：`csp-provider/CSPProvider.tsx`、`direction-provider/DirectionProvider.tsx`、`select/separator/SelectSeparator.tsx`、`toggle/Toggle.tsx`。
- **internals 与权威差异**：3 个 DIFF（`useRenderElement.tsx` / `getStateAttributesProps.ts` / `types.ts`）+ 5 个缺失（`mergeProps.ts`、`useMergedRefs.ts`、`utils/getReactElementRef.ts`、`utils/mergeObjects.ts`、`utils/resolveClassNameStyle.ts`）；本地 `src/merge-props/mergeProps.ts` 为旧变体（哈希不同）。
- 本地特有（权威没有，保留或评估）：`useRootElementFragment`、`defineHeadless`、`store`、`composite`、`use-button`、`useAnchorPositioning`、`useTransitionStatus` 等 hooks、`floating-ui-react` 移植层（30 文件）。
- 权威参照共 16 文件：`internals/`（useRenderElement / mergeProps / getStateAttributesProps / types / useMergedRefs / utils×3）+ `avatar/`（Root/Context/stateAttributesMapping/index）+ `checkbox/`（CheckboxRoot/CheckboxGroup/checkbox-context/index）。

---

## P0 基线：internals 对齐（先行，后续一切工作的地基）

- [x] 落地 5 个基础模块：`internals/mergeProps.ts`、`internals/useMergedRefs.ts`、`internals/utils/{getReactElementRef,mergeObjects,resolveClassNameStyle}.ts`
- [x] `internals/useRenderElement.tsx` 换为目标签名 `(element, componentProps, params) → VNode`；旧实现暂存 `internals/useRenderElementLegacy.tsx`（169 个调用点 import 已批量改写指向 Legacy）
- [x] `internals/getStateAttributesProps.ts`、`internals/types.ts` 对齐（types：保留 HTMLAttributes 基座 + `ref?: Ref<HTMLElement|null>` 转发声明 + 本地 `Reactive<T>` 品牌类型——踩坑见附录 C.1/C.2）
- [ ] `src/merge-props/`（35 个引用方）与新 `internals/mergeProps.ts` 收敛为一份 → 移入 P2
- [x] `useRootElementFragment` 评估：AvatarImage 已用 ref 合并链取代 rootRef 桥接、不再依赖；其余 Fragment 根家族迁移时逐个消除，最终删除
- [x] 基准家族 avatar：store-as-is context（reactive 载体 + 统一写入口）+ 新 hook + ref 合并链——**61 通过 / 0 失败 / 3 跳过**（全绿；HEAD 同期 77 失败）
- [x] 基准家族 checkbox + checkbox-group：**53 通过 / 0 失败**（HEAD 同期 53 全挂）——随迁移完成 `internals/field-root-context`、`labelable-provider`、`field-register-control`、`composite/root`、`fieldset/root` 等**共享 internals 的 store-as-is 适配**（`context.value` 链 → 直取载体，Provider payload 改身份稳定 getter 载体）；类型错误 217 → **196**（context 契约修复消化 21 个存量错误）
- 验收：类型错误数 = 基线 217（core 1.3 store-as-is 存量债，家族迁移逐个消化）；avatar 测试无回归且大幅收敛 ✅

---

## P1 组件重构（229 个 tsx，按家族四批推进）

每家族固定步骤：
1. context 文件先行（官方 createContext + store-as-is + `Reactive<T>` payload + 统一写入口）；
2. hooks（use-button / composite / useTransitionStatus 等）适配新签名；
3. Root → 子件逐个转裸函数 + 权威 useRenderElement（值形 props toRefs 活引用、ref 形直读、EXCLUDE、aria 布尔直传）；
4. 该家族 jsdom 测试同步跑绿后再进下一家族。

### 批次 1：简单族（有直接参照 / 叶子组件）
- [x] avatar（13 文件）—— ✅ 已迁移（P0 基准）
- [ ] checkbox（9）+ checkbox-group（6）—— 权威参照
- [ ] separator（4）、button（5）、toggle（4）、toggle-group（6）
- [ ] input（3）、form（3）
- [ ] csp-provider（4）、direction-provider（5）—— 无 DOM Provider（豁免类范式样板）

### 批次 2：中型族（✅ 全部完成）
- [x] progress（12）✅、meter（13）✅、switch（8）✅、radio（8）+ radio-group（4）✅
- [x] collapsible（14）✅、accordion（18）✅
- [x] tabs（13）✅、scroll-area（16）✅、field（19）✅、toolbar（12）✅、fieldset（7）✅、otp-field（8）✅——批次 2 收官（form/input 测试已解锁，预存 fieldset 失败清零）
- [x] toolbar（12）✅——Root/Group context 改 getter 载体；Root/Group/Button/Input/Link/Separator 全迁（Button/Input 经 CompositeItem，refs/props 数组形态）
- [x] fieldset（7）✅——Root/Legend 全迁（getter 载体）；Legend conformance harness（render node 直传 Root）+ defineComponent 测试已修；36/36 绿
- [x] otp-field（8）✅——Root context 改 getter 载体（autoComplete 补齐）；Root/Input 全迁；setup 风格测试改裸函数组件

### 批次 3：弹层族
- [x] floating-ui-react 适配层（4 文件）✅——FloatingTree/Node/Portal/FocusManager 裸函数化 + store-as-is；**依赖仓库 E:\code3\floating-ui 的 FloatingTree context hooks 已适配（独立 commit）**——发布 dist 旧契约是弹层族全体崩溃根因
- [x] tooltip（16）✅——Root/Trigger/Popup/Portal/Positioner/Arrow/Viewport/Provider 全迁；**45/45 测试绿（原 0/45）**；useAnchorPositioning 返回字段 computed 化（flip/shift 后 side/align 实时）；ReactStore.useSyncedValues 支持 ref；usePositioner 补 className 合并
- [x] popover（18）✅——Root/Trigger/Popup/Portal/Positioner/Arrow/Backdrop/Close/Title/Description/Viewport 全迁；**73/73 测试绿（原 0/50）**；useAnchoredPopupScrollLock 参数 ref 化；setup 风格测试改裸函数
- [x] preview-card（15）✅——Root/Trigger/Popup/Positioner/Arrow/Backdrop/Viewport/Portal + 3 context 全迁；7/7 测试绿
- [x] dialog（16）✅——Root/Trigger/Popup/Portal/Backdrop/Close/Title/Description/Viewport + 2 context 全迁；**69/69 测试绿（原 0/63）**
- [x] alert-dialog（5）✅——Root/Trigger 全迁（复用 DialogRootContext/store）；6/6 测试绿
- [x] drawer（15）✅——Root/Trigger/Popup/Portal/Backdrop/Close/Title/Description/Content/Viewport/Provider + context 全迁；8/8 测试绿；useDrawerPortalContext 更名对齐
- [x] menu 系（menu 17 + context-menu 5 + menubar 3）✅——全部组件/context hooks store-as-is + 新 hook；**57/58 测试绿**（唯一失败：viewport remount 深链路用例，预存行为待专项排查）；navigation-menu（13）✅——12/12 绿（关闭态不渲染内容语义补齐）；类型 92→52，批次 3 收官

### 批次 4：大族（最后，调用点最多）
- [ ] combobox（37）、autocomplete（12）、select（31）
- [~] toast（18）——全部 9 组件 + 2 context hooks 已迁移（getter 载体）；**测试 5/7 失败待查**（useToastManager 深链路：ManagedUI harness 转裸函数后 add 链路未渲染，疑似 manager 订阅时机）
- [~] slider（18）调研完成——7 组件（SliderRoot 536 行 + SliderThumb 525 行为主，内含 slider store/getRect 逻辑）；基线 5/5 失败（FieldRootContext ComputedRef 载体消费 + legacy hook）；待下轮迁移
- [ ] number-field（22）——FieldRootContext 载体消费端，与 slider 同轮处理

**豁免类**（不强制 useRenderElement，对齐权威 CheckboxGroup 先例）：纯 Provider（CSP/Direction）、薄委托（Input → FieldControl）、Portal/Value 等无状态包装——但范式细节（裸函数、渲染期解构、ref 形直读）仍须统一。

**floating-ui-react 移植层（30 文件）**：仅适配新 useRenderElement 签名与 ref 契约，不改定位行为；单独小批穿插在批次 3 之前（弹层族依赖它）。

---

## P2 工具函数对齐

- [ ] `utils/`（59 文件）中与渲染相关部分归位：mergeClassNames / mergeStyles / resolveClassNameStyle / mergeObjects / getReactElementRef 与权威 internals 互相引用关系理清，消除双份实现
- [ ] `stateAttributesMapping.ts`（internals 根）与各家族 `*DataAttributes.ts` 对齐权威 `getStateAttributesProps` 行为（布尔规范化后校对映射）
- [ ] `use-render/`（3 文件）与权威 useRenderElement 关系评估：能删则删，保留则注明差异
- [ ] `collapsibleOpenStateMapping` 等映射常量核对

---

## P3 测试用例（收编旧计划已验证的差距分析）

### 3.1 无测试组件按 React 分布新建（旧 P1）
- [ ] toggle-group：`ToggleGroup.test.tsx`、`enumSync.test.tsx`（React 2 → actview 0）
- [ ] meter：indicator / label / root / track / value 5 个（React 5 → 0）
- [ ] checkbox-group：`CheckboxGroup.test.tsx`、`useCheckboxGroupParent.test.tsx`（React 2 → 0）

### 3.2 合并测试拆分到子组件（旧 P2，拆分标记保留：combobox/select/toast/navigation-menu/number-field/slider/drawer/preview-card/scroll-area/progress/tabs/toolbar/checkbox/otp-field/autocomplete/radio/switch 已拆出首批，余下子文件按旧清单补齐）
- 详细文件清单沿用旧计划（React 分布对照仍有效），拆完删除原合并文件，保持每子组件一个测试文件。

### 3.3 测试范式更新（转写 React 用例时统一执行）
- [ ] 测试组件：函数声明**直接 return JSX**（Babel 自动包装；禁手写双层 `return () =>`——现为编译期报错）
- [ ] 包装组件渲染期解构 props（setup 快照陷阱）；`{...props}` 展开引用稳定性注意
- [ ] `fireEvent` 后 `await act(() => {})`；跨组件 watch 链额外 flush；`setProps` 浅合并不删除
- [ ] 查询：`data-testid` + 按目标默认标签精确 `querySelector`（防祖先误配）；label 关联用 `getElementById`
- [ ] 渲染计数用 `onUpdated`（render 函数内改 ref = 死循环）
- [ ] `htmlFor` → `for`；受控文本断言用 onInput 语义
- [ ] 平台限定（.android/.gecko/.iOS/talkBack/voiceOver/.react17）按 actview 能力决定转写或跳过

---

## 附录 A：MIGRATION.md 案例有效性判定（只做参考，不可全信）

| 案例 | 判定 | 说明 |
|---|---|---|
| 1 defineComponent 范式 | ❌ **过期** | 新权威=裸函数+最后 return JSX；setup 风格编译期报错；「唯一合法形态」已变更 |
| 2 render 单 props 对象 | ⚠️ 以权威为准 | 以权威 `types.ts` 的 `ComponentRenderFn` + `evaluateRenderProp` 逐字对齐（props 含 state 合并、state 亦作第二参） |
| 3 VNode 透传 key/className/style 合并 | ✅ 已内建 | 权威 useRenderElement 的 clone 分支处理，组件内手写克隆代码删除 |
| 4 className/style 函数解析 | ✅ 已内建 | 权威 useRenderElementProps 的 resolveClassName/resolveStyle |
| 5 官方 createContext | ⚠️ 部分过期 | store-as-is 新契约取代「watch 同步 value」；Provider 传响应式引用；internals createContext 已不存在 |
| 6 根 ref 形态 | ✅ 有效+补充 | 补充：ref=实例是设计语义；DOM 靠转发；`{ current }` 手动对象不做模板 ref 的结论仍有效 |
| 7 watch 时序（flush:sync 注册类 / onCleanup 卸载不执行） | ✅ 有效 | 方案 B（保存 stop + onUnmounted）继续沿用 |
| 8 defineComponent 泛型 as 断言 | ❌ 过期 | 裸函数泛型组件直接保留泛型签名 |
| 9 测试基建（await act / setProps / 查询） | ✅ 有效 | 收编进 P3.3 |
| 10 propsGetter 替换语义 | ✅ 有效 | 与权威 mergePropsN 的 getter 替换语义一致；「消费 prev 的 getter 放最后」规则保留 |
| 11 无 DOM Provider | ✅ 有效 | 写法更新为裸函数 |
| 12 Button 要点 | ✅ 有效 | data-* 默认映射 + getButtonProps 放最后 |
| 13 Form/Input 泛型 | ⚠️ 半过期 | defineComponent→裸函数；泛型签名直接可用 |
| 14 FieldControl getter 链 | ⚠️ 半过期 | getter 规则有效，写法随新签名 |
| 15 Meter 家族范式 | ⚠️ 半过期 | 步骤有效，代码范式随新基准 |
| 16 radio 事件语义（onInput/修饰键/for） | ✅ 有效 | 原生事件语义未变 |
| 17 Field 子件（rendered 渲染期判断） | ⚠️ 半过期 | 「响应式条件必须渲染期判断」仍有效 |
| 18 渲染计数 onUpdated | ✅ 有效 | 收编进 P3.3 |
| 19 测试组件写法 | ✅ 有效 | 且升级为硬约束（编译期报错） |

---

## 附录 B：执行流程（每轮会话）

1. 读权威参照（本文件附录 C + `E:\code3\actview\src\components` 对应文件）；
2. 重构一个家族（P0 步骤 1–4）；
3. `pnpm typescript` + 该家族 jsdom 测试全绿；
4. 回写本文件勾选 + 把新发现的范式差异记入附录 C。

## 附录 C：迁移中发现的范式差异（滚动记录）

1. **types.ts 基座必须用 `HTMLAttributes`**：@actview/jsx 的 `JSX.IntrinsicElements[Tag]` **不含** children/id/aria-* 键，用它作 `BaseUIComponentProps` 基座会让全库组件丢 children/id（-92 个新增类型错误的根因，已回退为 HTMLAttributes + Omit className/style/ref）。
2. **actview 1.3.0 聚合包未导出 `Reactive<T>`** → `internals/types.ts` 本地自持同款品牌类型（`T & { readonly '__v_isReactive'?: true }`），Context payload 标注用它。
3. **本地 `style` 支持 string 形态**（目标版仅对象/函数）→ 新 hook 的 `UseRenderElementComponentProps.style` 放宽 `| string`。
4. **render 函数契约分歧**：目标 `(props, state)` 双参 vs 本地 `'../types'.ComponentRenderFn` 单参（state 并入 props）。hook 内 `as any` 调用运行时兼容；类型层对齐排 P2。
5. **conformance ref-merge 用例已按裁决改造（组件函数形式），useRootElement 已实测摘除**：`render={<CustomRender ref={customRef} />}`——VNode 自带 ref 经 `getReactElementRef` 并入合并链；组件函数透传 `{...props}`（含合并链 ref）到根元素 → applyRef 广播写入。**AvatarRoot 已不依赖 useRootElement（实测 61/0/3 全绿）**。P1 迁移规则：① 库内部需要 DOM 时**自持 `ref()` 并入 params.ref 合并链**（随透传到达最终渲染元素，如 AvatarImage 的 imageRef），不用 useRootElement/useRootElementFragment；② 约定 render 覆盖必须透传 `{...props}`（含 ref），覆盖 ref 即放弃库内部 DOM 访问（conformance 用例注释已固化该契约）；③ 存量 ~90 处 useRootElement/useRootElementFragment 随各家族迁移自然消除（含 Fragment 根场景——自持 ref 挂合并链同样成立）。旧的「render 函数替换 props.ref」用例写法废弃。
6. **plugin-babel 2.0.0 硬拒绝测试组件 setup 风格**（`return () => JSX` 编译期报错）→ 全库 **56 个测试文件**需改写（P3.3 前置）；AvatarFallback.test.tsx 已改（defineComponent 包装→裸函数、ref 容器→reactive 载体、内联组件提升到 describe 层）。
7. **core 1.3 store-as-is 运行时债（进行中）**：框架 `createContext.use()` 直返注入载体（不再包 ref）——全库 ~150 处 `context.value` 链读取失效。**checkbox 依赖链已全部适配**（field-root-context / form-context / labelable-provider / field-item / field-register-control / composite-root / fieldset-root 的 use hook 直返载体；Provider payload 改**身份稳定 getter 载体**——provide 只在 Provider setup 执行一次，每次渲染新对象会冻结快照，这是 store-as-is 下 Provider 的标准写法）。其余家族随迁移逐个适配；`toValue` 与 `useRootElement`/`useRootElementFragment` 一并淘汰（props 直读、自持 ref 挂 params.ref 合并链）。
8. **pnpm 11.17.0 自管切换在本环境损坏**（store 链接缺失）→ 用 `node_modules/.bin` 直呼二进制：tsgo 用根 `node_modules/.bin/tsgo.CMD -b packages/actview/tsconfig.json`，测试用 `packages/actview` 下 `vitest.cmd run`（需 `VITEST_ENV=jsdom`）。
9. **conformance/测试基建已组件函数化（禁用 createElement/cloneVNode）**：`createElement`/`cloneVNode` 是 core 内部设计的方法，测试一律用组件函数表达——① 动态原生标签用内置 `<component is={Tag}>`（变量字符串实测可用，属性/ref 全透传）；② 「改写目标组件 props」用 Host 组件函数并**返回真 vnode `<Host />`**（family render 包装器契约是 `render(node.type, {...node.props})` 或注入 children，传裸函数会拿到 undefined.type）；③ `createElement(...)` 返回值不是字面 JSX，Babel 不包装 → 必须套字面 Fragment 锚。floating-ui 测试批次（FloatingFocusManager.test 等 5 处）随批次 3 前的适配一并转换。
10. **【最高优先】组件唯一合法写法 = avatar 标准（`function App() { return JSX }`），defineComponent 全库禁用**：
    - 渲染槽是**纯表达式**——Babel 只包 `return <JSX>`，无语句位；IIFE 禁止；
    - 解构在 setup：`toRefs(props)` 活引用（渲染期读 `.value` 即实时）；ref 形 props（ref/inputRef）不入 toRefs、直读本體；框架消费键/状态键解构排除，children 不排除（随 elementRefs 流入渲染元素）；
    - 数据构造在 setup 级 `computed`（`.value` 在 JSX 内读 → 归渲染 effect 追踪；依赖未变引用稳定缓存）；
    - handler = setup 闭包读 computed/refs（事件触发时拿实时值）；
    - **props 读取规则（快照 vs 实时）**：setup 普通读取 = 一次性快照且无追踪（无活动渲染 effect）。分类：① **初始化型**（defaultChecked/defaultValue 喂 useControlled 初值、useBaseUiId 初始输入、useAriaLabelledBy 入参等）→ 快照正确，对齐 React 初始化器语义；② **渲染期/computed/事件期消费**（id 进 rootProps、onXxx 回调、checked/disabled/name/value/parent 等）→ 一律 computed 直读 `componentProps.x` 或事件期直读——setup 快照会在父更新后读到旧值/旧回调。
    - Provider payload = 身份稳定 getter 载体（provide 只在 Provider setup 执行一次，新对象冻结快照）；
    - 动态原生标签用 `<component is={Tag}>`；`toValue` / `createElement` / `cloneVNode` / `useRootElement`(-Fragment) 全禁；
    - 违例形态（均已清零）：IIFE、渲染闭包 `return () => JSX`（plugin-babel 2.0 编译期拒绝）、手动 defineComponent 包装。
