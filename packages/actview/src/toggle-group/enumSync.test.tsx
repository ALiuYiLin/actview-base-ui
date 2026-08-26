import { expect } from 'vitest';
import { ToggleGroup } from '@/toggle-group';
import { createRenderer } from '#test-utils';
import { screen } from '#test-utils/rtl';

// 对齐 React 版 enumSync.test.tsx：运行时 data-* 属性名与公开枚举同步。
// actview 无 ToggleGroupDataAttributes 枚举，直接断言属性名字符串。
describe('Toggle Group enum sync', () => {
  const { render } = createRenderer();

  it('names the multiple data-attribute per ToggleGroupDataAttributes', async () => {
    await render(ToggleGroup.Root, {multiple: true, 'data-testid': 'group', children: null});

    expect(screen.getByTestId('group')).toHaveAttribute('data-multiple');
  });

  it('names the orientation data-attribute per ToggleGroupDataAttributes', async () => {
    await render(ToggleGroup.Root, {orientation: 'vertical', 'data-testid': 'group', children: null});

    expect(screen.getByTestId('group')).toHaveAttribute('data-orientation', 'vertical');
  });

  it('names the disabled data-attribute per ToggleGroupDataAttributes', async () => {
    await render(ToggleGroup.Root, {disabled: true, 'data-testid': 'group', children: null});

    expect(screen.getByTestId('group')).toHaveAttribute('data-disabled');
  });
});
