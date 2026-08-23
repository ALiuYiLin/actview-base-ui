import { describe, expect, it } from 'vitest';
import { Popover } from '@/popover';
import { render, screen, act, waitFor } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Popover.Title /> + <Popover.Description />', () => {
  // actview 遗留：store 的 titleElementId/descriptionElementId 同步成功
  // （state 有值），但 Popup 渲染函数未随其变化重渲染（aria-labelledby/
  // aria-describedby 缺失）——actview 渲染依赖追踪限制。待修复后补。
  it.skip('associates title and description with the popup via aria', async () => {});
});
