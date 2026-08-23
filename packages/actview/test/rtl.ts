/**
 * RTL 兼容层（floating-ui-react 测试 → actview 测试）。
 *
 * - `screen` / `within` / `waitFor` / `fireEvent`：@testing-library/dom
 *   （框架无关、零 React 依赖；查询作用于 document.body——actview 测试渲染
 *   挂载到 body 下）。`@actview/testing` 的 screen 只有 text/class/testid
 *   查询，缺 role 族（getByRole / getAllByRole / queryByRole / findByRole），
 *   菜单/网格导航测试主干依赖它们，故这里直接复用 @testing-library/dom 的
 *   查询与事件层。
 * - `userEvent`：@testing-library/user-event（v14.6.1 零 React 依赖，原生
 *   DOM 事件序列仿真，actview 组件原生监听可收到）。
 * - `render`：基于 @actview/core 的 render/unmount 自建（@actview/testing
 *   的 unmount 只是移除 DOM，不触发组件卸载；这里成对调用 core 的
 *   render/unmount，保证 ref cleanup / onUnmounted 生效），支持组件对象与
 *   JSX VNode（取 .type/.props），rerender(props) 响应式更新。
 * - `flushMicrotasks` / `act` / `cleanup`：floating-ui 测试主干依赖的异步
 *   flush 与用例间清理。
 *
 * 仅 floating-ui 迁移的测试使用本层；base-ui 原生测试继续用
 * `@actview/testing` 的 screen（getByText/getByClass 等语义不同，互不影响）。
 */
import {
  fireEvent,
  screen,
  waitFor,
  within,
  type BoundFunctions,
  type Queries,
} from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import {
  defineComponent,
  nextTick,
  reactive,
  render as coreRender,
  unmount as coreUnmount,
} from '@actview/core';

export {fireEvent, screen, waitFor, within, userEvent};
export type {BoundFunctions, Queries};

let mountSeq = 0;
const mounted: Array<{vnode: any; container: HTMLElement}> = [];

export interface RenderResult {
  /** 挂载容器（宿主元素） */
  container: HTMLElement;
  /** 卸载：core unmount + 移除容器 DOM（触发 ref cleanup / onUnmounted） */
  unmount: () => void;
  /** 更新 props（reactive 代理写入 → Harness 重渲染 → 组件响应式更新） */
  rerender: (props: Record<string, any>) => void;
}

/**
 * 挂载 actview 组件。componentOrVNode 可以是：
 * - 组件（defineComponent 产物）：`render(App)`
 * - JSX 元素（VNode）：`render(<App show />)` —— 取 .type 为组件、
 *   .props 为初始 props
 * options.props 为额外初始 props（与 VNode props 合并，reactive 代理，
 * rerender(props) 合并更新）。
 */
export function render(
  componentOrVNode: any,
  options?: {container?: HTMLElement; props?: Record<string, any>},
): RenderResult {
  const container = options?.container ?? document.createElement('div');
  const autoCreated = !options?.container;
  container.id = 'testing-' + mountSeq++;
  if (autoCreated) {
    document.body.appendChild(container);
  }

  const isVNode =
    componentOrVNode != null &&
    typeof componentOrVNode === 'object' &&
    componentOrVNode.$$typeof === Symbol.for('react.element');
  const component = isVNode ? componentOrVNode.type : componentOrVNode;
  const initialProps = isVNode
    ? {...(componentOrVNode.props ?? {}), ...(options?.props ?? {})}
    : options?.props;

  const state = reactive<any>({...(initialProps ?? {})});
  const Harness = defineComponent(function () {
    return () => ({
      $$typeof: Symbol.for('react.element'),
      type: component,
      key: null,
      ref: null,
      props: {...state},
    });
  });

  const vnode = {
    $$typeof: Symbol.for('react.element'),
    type: Harness,
    key: null,
    ref: null,
    props: {},
  };
  coreRender(vnode, container);
  const entry = {vnode, container};
  mounted.push(entry);

  return {
    container,
    unmount: () => {
      coreUnmount(vnode, container);
      container.remove();
      const i = mounted.indexOf(entry);
      if (i >= 0) mounted.splice(i, 1);
    },
    rerender: (props) => {
      Object.assign(state, props);
    },
  };
}

/** 卸载全部挂载的组件（测试用例间清理） */
export function cleanup() {
  for (const {vnode, container} of mounted.splice(0)) {
    coreUnmount(vnode, container);
    container.remove();
  }
  // actview core 的 unmount 只递归组件 subTree 一层：嵌套在 Fragment / 原生
  // 元素里的子组件（如 FloatingPortal 渲到 body 的 portal node）的 onUnmounted
  // 不会被根卸载触发，portal node 残留在 body（jsdom 下同样存在，但不影响
  // 查询断言；浏览器模式会跨用例污染 getByText 等）。统一清理保证测试间隔离。
  document.body
    .querySelectorAll('[data-floating-ui-portal]')
    .forEach((node) => node.remove());
}

/** React act() 等价：执行回调并等待 actview 响应式更新 flush */
export async function act(fn?: () => void) {
  fn?.();
  await nextTick();
  await nextTick();
}

/** flush 全部挂起的微任务（对齐 floating-ui 测试的 flushMicrotasks） */
export async function flushMicrotasks() {
  await nextTick();
}
