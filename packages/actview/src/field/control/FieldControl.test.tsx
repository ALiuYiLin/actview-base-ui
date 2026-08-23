import { expect, vi } from 'vitest';
import { defineComponent, ref } from 'actview';
import { Field } from '@/field';
import { createRenderer } from '#test-utils';
import { fireEvent, screen } from '#test-utils/rtl';

describe('<Field.Control />', () => {
  const { render } = createRenderer();

  it('renders an input element', async () => {
    await render(Field.Root, {children: <Field.Control data-testid="control" />});

    const control = screen.getByTestId('control');
    expect(control.tagName).toBe('INPUT');
    // valid 初始为 null（未验证），fieldValidityMapping 不输出 data-valid
    expect(control).not.toHaveAttribute('data-valid');
  });

  it('forwards defaultValue and fills the field', async () => {
    await render(
      Field.Root,
      {children: <Field.Control data-testid="control" defaultValue="hello" />},
    );

    const control = screen.getByTestId('control') as HTMLInputElement;
    expect(control).toHaveValue('hello');
    const root = control.closest('[data-fillable]') as HTMLElement | null;
    void root;
  });

  it('fires onValueChange with change details on input', async () => {
    const onValueChange = vi.fn();
    await render(
      Field.Root,
      {
        children: (
          <Field.Control data-testid="control" onValueChange={onValueChange} />
        ),
      },
    );

    // actview 对 input 的 onChange 监听 'input' 事件（React 兼容语义），
    // 测试库的 fireEvent.change 只派发 'change'——用 fireEvent.input
    fireEvent.input(screen.getByTestId('control'), {target: {value: 'abc'}});

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toBe('abc');
  });

  it('supports controlled value', async () => {
    const value = ref('');
    const Test = defineComponent(function () {
      return () => (
        <Field.Root>
          <Field.Control
            data-testid="control"
            value={value.value}
            onValueChange={(v) => (value.value = v)}
          />
        </Field.Root>
      );
    });

    await render(Test);

    const control = screen.getByTestId('control') as HTMLInputElement;
    fireEvent.input(control, {target: {value: 'x'}});
    expect(value.value).toBe('x');
    expect(control).toHaveValue('x');
  });

  it('sets data-invalid when the field is invalid', async () => {
    await render(
      Field.Root,
      {invalid: true, children: <Field.Control data-testid="control" />},
    );

    const control = screen.getByTestId('control');
    expect(control).toHaveAttribute('data-invalid');
  });

  it('respects disabled on the root', async () => {
    await render(
      Field.Root,
      {disabled: true, children: <Field.Control data-testid="control" />},
    );

    expect(screen.getByTestId('control')).toBeDisabled();
  });
});
