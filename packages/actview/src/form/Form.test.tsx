import { describe, expect, it, vi } from 'vitest';
import { Form } from '@/form/Form';
import { FieldRoot } from '@/field/root/FieldRoot';
import { FieldControl } from '@/field/control/FieldControl';
import { FieldError } from '@/field/error/FieldError';
import { useFormContext } from '@/internals/form-context/FormContext';
import { createRenderer } from '../../test/createRenderer';

const { render, fireEvent, act } = createRenderer();

function FormWithRequiredField(props: any) {
  return (
    <Form {...props} data-testid="form">
      <FieldRoot name="username">
        <FieldControl data-testid="input" defaultValue="" required />
        <FieldError data-testid="error" />
      </FieldRoot>
      <button type="submit" data-testid="submit">
        Submit
      </button>
    </Form>
  );
}

// 验证 elementRef 是否绑定到 form DOM：渲染期直读 elementRef.value（Ref 响应式追踪，
// 模板 ref 赋值后自动重渲染显示 bound/null）
function ElementRefProbe() {
  const formContext = useFormContext();
  return (
    <span data-testid="probe">{formContext.value.elementRef.value ? 'bound' : 'null'}</span>
  );
}

function FormWithProbe(props: any) {
  return (
    <Form {...props}>
      <ElementRefProbe />
    </Form>
  );
}

describe('<Form />', () => {
  it('binds the form DOM element to elementRef', async () => {
    await render(FormWithProbe, {});

    const probe = document.querySelector('[data-testid="probe"]');
    expect(probe).toHaveTextContent('bound');
  });

  it('renders a form with novalidate by default', async () => {
    await render(Form, { 'data-testid': 'form' });

    const form = document.querySelector('[data-testid="form"]') as HTMLFormElement;
    expect(form.tagName).toBe('FORM');
    expect(form).toHaveAttribute('novalidate');
  });

  it('enables native validation when noValidate is false', async () => {
    await render(Form, { noValidate: false, 'data-testid': 'form' });

    const form = document.querySelector('[data-testid="form"]') as HTMLFormElement;
    expect(form).not.toHaveAttribute('novalidate');
  });

  it('fires onSubmit on submit', async () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());

    await render(Form, { onSubmit, 'data-testid': 'form' });

    const form = document.querySelector('[data-testid="form"]') as HTMLFormElement;
    fireEvent.submit(form);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not submit if there are invalid fields', async () => {
    const onSubmit = vi.fn();

    await render(FormWithRequiredField, { onSubmit });

    const submit = document.querySelector('[data-testid="submit"]') as HTMLElement;
    await act(() => {
      fireEvent.click(submit);
    });

    expect(onSubmit).not.toHaveBeenCalled();
    const error = document.querySelector('[data-testid="error"]');
    expect(error).not.toBe(null);
    const input = document.querySelector('[data-testid="input"]') as HTMLElement;
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('collects field values via onFormSubmit', async () => {
    const onFormSubmit = vi.fn();

    await render(FormWithRequiredField, { onFormSubmit });

    const input = document.querySelector('[data-testid="input"]') as HTMLInputElement;
    await act(() => {
      fireEvent.input(input, { target: { value: 'alice' } });
    });

    const submit = document.querySelector('[data-testid="submit"]') as HTMLElement;
    await act(() => {
      fireEvent.click(submit);
    });

    expect(onFormSubmit).toHaveBeenCalledTimes(1);
    expect(onFormSubmit.mock.calls[0][0]).toEqual({ username: 'alice' });
  });

  it('validates all fields when actionsRef.validate is called', async () => {
    const actionsRef = { current: null as Form.Actions | null };

    await render(FormWithRequiredField, { actionsRef });

    expect(actionsRef.current).not.toBe(null);
    actionsRef.current!.validate();

    await act(() => {});

    const error = document.querySelector('[data-testid="error"]');
    expect(error).not.toBe(null);
    const input = document.querySelector('[data-testid="input"]') as HTMLElement;
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});
