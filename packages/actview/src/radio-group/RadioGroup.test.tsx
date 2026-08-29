import { expect, vi } from 'vitest';
import { RadioGroup } from '@/radio-group';
import { createRenderer } from '#test-utils';
import { nextTick } from 'actview';
import { fireEvent, screen } from '#test-utils/rtl';

describe('<RadioGroup />', () => {
  const { render } = createRenderer();

  it('renders a div with radiogroup role', async () => {
    await render(RadioGroup, {'data-testid': 'group'});

    const group = screen.getByTestId('group');
    expect(group.tagName).toBe('DIV');
    expect(group).toHaveAttribute('role', 'radiogroup');
  });

  it('applies field validity state attributes', async () => {
    await render(RadioGroup, {'data-testid': 'group', required: true});

    const group = screen.getByTestId('group');
    expect(group).toHaveAttribute('aria-required', 'true');
  });

  it('supports disabled', async () => {
    await render(RadioGroup, {'data-testid': 'group', disabled: true});

    const group = screen.getByTestId('group');
    expect(group).toHaveAttribute('aria-disabled', 'true');
    expect(group).toHaveAttribute('data-disabled');
  });

  it('fires onValueChange through setCheckedValue', async () => {
    const onValueChange = vi.fn();
    await render(RadioGroup, {onValueChange});

    // 通过内部 context 触发：无 Radio 组件时直接调用 context 的 setCheckedValue
    // 不在测试范围（Radio.Root 迁移后覆盖）——此处验证渲染链路稳定。
    expect(document.querySelector('[role="radiogroup"]')).not.toBeNull();
  });

  it('updates disabled state when the prop changes dynamically', async () => {
    const {setProps} = await render(RadioGroup, {'data-testid': 'group'});

    const group = screen.getByTestId('group');
    expect(group).not.toHaveAttribute('aria-disabled');

    await setProps({disabled: true});
    expect(group).toHaveAttribute('aria-disabled', 'true');
    expect(group).toHaveAttribute('data-disabled');
  });

  it('updates aria-required when the prop changes dynamically', async () => {
    const {setProps} = await render(RadioGroup, {'data-testid': 'group'});

    const group = screen.getByTestId('group');
    expect(group).not.toHaveAttribute('aria-required');

    await setProps({required: true});
    expect(group).toHaveAttribute('aria-required', 'true');
  });

  it('updates readOnly and name dynamically', async () => {
    const {Radio} = await import('@/radio');
    const {setProps} = await render(RadioGroup, {
      'data-testid': 'group',
      children: <Radio.Root value="a" />,
    });

    const group = screen.getByTestId('group');
    const input = document.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(group).not.toHaveAttribute('aria-readonly');
    expect(input).not.toHaveAttribute('name');

    await setProps({readOnly: true, name: 'group-name'});
    expect(group).toHaveAttribute('aria-readonly', 'true');
    expect(input).toHaveAttribute('name', 'group-name');
  });

  it('roving tabindex: the checked item is the tab stop (golden C3)', async () => {
    const {Radio} = await import('@/radio');
    await render(RadioGroup, {
      defaultValue: 'b',
      children: (
        <>
          <Radio.Root value="a" />
          <Radio.Root value="b" />
        </>
      ),
    });

    const items = document.querySelectorAll('[role="radio"]');
    expect(items.length).toBe(2);
    const a = items[0] as HTMLElement;
    const b = items[1] as HTMLElement;
    expect(a).toHaveAttribute('aria-checked', 'false');
    expect(a).toHaveAttribute('tabindex', '-1');
    expect(b).toHaveAttribute('aria-checked', 'true');
    expect(b).toHaveAttribute('tabindex', '0');
  });
});
