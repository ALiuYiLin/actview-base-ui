import { defineComponent } from '@actview/core';
import './Button.css?scoped'
/**
 * floating-ui-tests 夹具 Button（React 版 → actview 版）。
 *
 * 与 upstream 的差异：
 * - `React.forwardRef` → `defineComponent`；ref 经 `props.ref` 透传到
 *   `<button>`（actview 组件 ref 回调收到组件实例，useFloating 的
 *   setReference 会拒绝非元素值，故此处必须把 ref 传给原生元素）
 * - CSS Modules（Button.module.css）省略：测试断言交互行为（focus /
 *   aria / open 状态），不依赖样式
 * - `clsx` 合并省略：className 原样透传
 */
export const Button = defineComponent(function (props: Record<string, unknown> & { ref?: unknown }) {
  return () => <button {...props} />;
});
