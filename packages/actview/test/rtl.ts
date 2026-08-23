/**
 * RTL 兼容层（floating-ui-react 测试 → actview 测试）。
 *
 * - `screen` / `within` / `waitFor`：@testing-library/dom（框架无关、零 React
 *   依赖；查询作用于 document.body——actview 测试渲染挂载到 body 下）。
 *   `@actview/testing` 的 screen 只有 text/class/testid 查询，缺 role 族
 *   （getByRole / getAllByRole / queryByRole / findByRole），菜单/网格导航
 *   测试主干依赖它们，故这里直接复用 @testing-library/dom 的查询层。
 * - `userEvent`：@testing-library/user-event（v14.6.1 零 React 依赖，原生 DOM
 *   事件序列仿真，actview 组件原生监听可收到）。
 * - `fireEvent`：沿用 actview 自写的全方法 fireEvent（test/fireEvent.ts）。
 *
 * 仅 floating-ui 迁移的测试使用本层；base-ui 原生测试继续用
 * `@actview/testing` 的 screen（getByText/getByClass 等语义不同，互不影响）。
 */
import {
  screen,
  waitFor,
  within,
  type BoundFunctions,
  type Queries,
} from '@testing-library/dom';
import userEvent from '@testing-library/user-event';

export {screen, waitFor, within, userEvent};
export type {BoundFunctions, Queries};
