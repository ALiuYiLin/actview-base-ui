# 问题清单

由每轮 QA 产物（.QA/*.md）按职责 ⑧ 提炼：去组件名前缀，只留问题本质；「最近」按移植轮次倒序（最新在前，最多 10 条）；「最常」按出现次数降序（格式 `问题（N次）`，最多 10 条）。

## 最近遇到的问题

1. context computed 值变化不驱动消费者重渲染（combobox inputValue / autocomplete inline 显示滞后）→ 渲染用字符串镜像进 store 订阅路径（.QA/combobox-context-render-reactivity.md）
2. useListNavigation aria-activedescendant reference/floating 折叠误伤 typeable combobox 的 input 侧（.QA/floating-activedescendant-split.md）
3. listRef 注册 watch 的 immediate 在 setup 跑（ref 未挂载），首渲染 index 不变时不重注册 → clickHighlightedItem 失效（.QA/structural-ref-registration.md + AD-40）
4. watch 数组源卸载期 stale 微任务收 undefined → 解构崩（框架 runJob 加 active 守卫 + 库内 Array.isArray 双保险，.QA/watch-array-source-issues.md）
5. 测试用例空查询 '' → 不过滤天然生效 → 过滤断言必失（.QA/actview-test-infra-patterns.md 测试失败诊断）
6. actview keyed diff 不重触发 ref callback → 结构类 listRef 被 stale DOM 覆盖（.QA/structural-ref-registration.md）
7. context hook（useInjects）在 computed getter 里调用 → 警告 + fallback（.QA/combobox-context-render-reactivity.md + AD-42）
8. Enter 键盘激活只对 native:false 合成、jsdom 不合成原生 button 的 Enter（.QA/jsdom-keyboard-activation.md + AD-19）
9. 组件顶层 setup 抛错 → 整树被 handleError 静默丢弃（trigger 查不到 / closed 假通过；.QA/actview-framework-adaptation-rules.md A 节）
10. AI-003：组件末尾 return 形状不被 Babel 转换 → 裸函数报错（.QA/ai003-return-shape-checklist.md）

## 最常遇到的问题

1. 组件 setup 解构/对象快照冻结响应式，必须 computed(()=>componentProps.x) 惰性读（4次）
2. props getter 展开 {...prev,...X} 覆盖 on* handler，必须 mergeProps(prev,…)（4次）
3. AI-003 记录末尾 return 形状不转换 → 裸函数（3次）
4. watch 数组源：函数元素被当 getter 调用 / 卸载期 stale undefined（3次）
5. context hook（useInjects）只能在组件 setup 顶层调用，computed 内只读其 .value（2次）
6. 结构类 ref 注册时机不可靠：keyed diff 不重触发 ref callback / immediate 先于挂载（2次）
7. jsdom 不合成原生 button 的 Enter，键盘激活需手动 click 或 native:false（2次）
8. 组件顶层 setup 抛错 → 整树被静默丢弃（1次）
9. context-computed 变化不驱动消费者重渲染（1次）
10. aria-activedescendant reference/floating 语义折叠误伤（1次）
