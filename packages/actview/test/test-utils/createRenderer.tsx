import { act, render as rtlRender, userEvent } from '../rtl';

export interface CreateRendererResult {
  render: (node: any, options?: any) => Promise<any>;
  user: ReturnType<typeof userEvent.setup>;
}

/**
 * React 版 `createRenderer()` 的 actview 简化版：
 * - `render(node)`：挂载 actview 组件/JSX，等待响应式 flush，返回 rtl 结果 + `user`
 * - `user`：@testing-library/user-event 实例
 */
export function createRenderer(): CreateRendererResult {
  return {
    async render(node: any, options?: any) {
      const result = rtlRender(node, options);
      await act(async () => {});
      return {...result, user: userEvent.setup()};
    },
    user: userEvent.setup(),
  };
}
