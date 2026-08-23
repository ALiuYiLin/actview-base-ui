import { expect, vi } from 'vitest';
import { defineComponent, ref } from 'actview';
import { Form } from '@/form';
import { Field } from '@/field';
import { createRenderer } from '#test-utils';
import { fireEvent, screen } from '#test-utils/rtl';

describe('<Form />', () => {
  const { render } = createRenderer();

  it('renders a form element with noValidate', async () => {
    await render(Form, {'data-testid': 'form'});

    const form = screen.getByTestId('form');
    expect(form.tagName).toBe('FORM');
    expect(form).toHaveAttribute('novalidate');
  });

  it('collects field values in onFormSubmit', async () => {
    const onFormSubmit = vi.fn();
    await render(
      Form,
      {
        onFormSubmit,
        children: (
          <Field.Root name="username">
            <Field.Control data-testid="control" defaultValue="alice" />
          </Field.Root>
        ),
      },
    );

    fireEvent.submit(screen.getByTestId('control').closest('form') as HTMLFormElement);

    expect(onFormSubmit).toHaveBeenCalledTimes(1);
    const [formValues] = onFormSubmit.mock.calls[0];
    expect(formValues).toEqual({username: 'alice'});
  });

  it('validates fields on submit and blocks invalid submission', async () => {
    const onFormSubmit = vi.fn();
    const validate = vi.fn((value: unknown) =>
      value ? null : 'Value is required',
    );
    await render(
      Form,
      {
        onFormSubmit,
        children: (
          <Field.Root name="username" validate={validate}>
            <Field.Control data-testid="control" />
          </Field.Root>
        ),
      },
    );

    fireEvent.submit(screen.getByTestId('control').closest('form') as HTMLFormElement);

    // validate 被调用且提交被阻止（值空）
    expect(validate).toHaveBeenCalled();
    expect(onFormSubmit).not.toHaveBeenCalled();
  });
});
