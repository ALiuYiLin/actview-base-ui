import { describe, expect, it, vi, beforeAll } from 'vitest';
import { FieldRoot } from '@/field/root/FieldRoot';
import { FieldLabel } from '@/field/label/FieldLabel';
import { FieldError } from '@/field/error/FieldError';
import { FieldDescription } from '@/field/description/FieldDescription';
import { FieldControl } from '@/field/control/FieldControl';
import { FieldValidity } from '@/field/validity/FieldValidity';
import { FieldItem } from '@/field/item/FieldItem';
import { CheckboxRoot } from '@/checkbox/root/CheckboxRoot';
import { Form } from '@/form';
import { createRenderer } from '#/test/createRenderer';

beforeAll(() => {
  // jsdom doesn't fully implement PointerEvent
  (window as any).PointerEvent = window.MouseEvent;
});

function FieldDemo(props: any) {
  return (
    <FieldRoot data-testid="root" {...props}>
      <FieldLabel data-testid="label">Name</FieldLabel>
      <FieldControl data-testid="control" />
      <FieldDescription data-testid="description">Helper text</FieldDescription>
    </FieldRoot>
  );
}

function NonNativeLabelDemo(props: any) {
  return (
    <FieldRoot {...props}>
      <FieldLabel nativeLabel={false} render={<div />} data-testid="label">
        Name
      </FieldLabel>
      <FieldControl data-testid="control" />
    </FieldRoot>
  );
}

function ItemDemo(props: any) {
  return (
    <FieldRoot data-testid="root" {...props}>
      <FieldItem data-testid="item">
        <FieldLabel data-testid="item-label">Option</FieldLabel>
        <FieldControl data-testid="item-control" />
      </FieldItem>
    </FieldRoot>
  );
}

function ItemDisabled(props: any) {
  return (
    <FieldRoot data-testid="root">
      <FieldItem disabled>
        <FieldLabel>Option</FieldLabel>
        <CheckboxRoot data-testid="item-checkbox" value="fuji" />
      </FieldItem>
    </FieldRoot>
  );
}

function ErrorInvalid(props: any) {
  return (
    <FieldRoot invalid {...props}>
      <FieldControl data-testid="control" />
      <FieldError match data-testid="error">
        Message
      </FieldError>
    </FieldRoot>
  );
}

function ErrorValid(props: any) {
  return (
    <FieldRoot {...props}>
      <FieldControl data-testid="control" />
      <FieldError data-testid="error">Message</FieldError>
    </FieldRoot>
  );
}

function MatchDemo(props: any) {
  return (
    <Form>
      <FieldRoot {...props}>
        <FieldControl required minLength={2} data-testid="control" />
        <FieldError match="valueMissing" data-testid="error">
          Required
        </FieldError>
      </FieldRoot>
      <button type="submit" data-testid="submit">
        submit
      </button>
    </Form>
  );
}

function FormErrorDemo(props: any) {
  return (
    <Form errors={{ username: 'Username is reserved' }}>
      <FieldRoot name="username" {...props}>
        <FieldControl defaultValue="admin" data-testid="control" />
        <FieldError data-testid="error" />
      </FieldRoot>
    </Form>
  );
}

function FormErrorListDemo(props: any) {
  return (
    <Form errors={{ username: ['First error', 'Second error'] }}>
      <FieldRoot name="username" {...props}>
        <FieldControl defaultValue="admin" data-testid="control" />
        <FieldError data-testid="error" />
      </FieldRoot>
    </Form>
  );
}

function ValidityDemo(props: any) {
  return (
    <FieldRoot {...props}>
      <FieldControl data-testid="control" />
      <FieldValidity>{renderProp as any}</FieldValidity>
    </FieldRoot>
  );
}

const renderProp = vi.fn((state: any) => <div data-testid="validity">validity</div>);

function ControlDemo(props: any) {
  return (
    <FieldRoot {...props}>
      <FieldControl data-testid="control" onValueChange={controlOnValueChange} />
    </FieldRoot>
  );
}

const controlOnValueChange = vi.fn();

describe('<Field />', () => {
  const { render, fireEvent, act, waitFor } = createRenderer();

  it('renders root/label/control/description with proper associations', async () => {
    const result = await render(FieldDemo, {});

    const label = result.getByTestId('label') as HTMLLabelElement;
    const control = result.getByTestId('control') as HTMLInputElement;
    const description = result.getByTestId('description');

    expect(label.tagName).toBe('LABEL');
    expect(control.tagName).toBe('INPUT');
    expect(label).toHaveAttribute('for', control.id);
    expect(control).toHaveAttribute('aria-describedby', description.id);
  });

  it('non-native label click focuses the control', async () => {
    const result = await render(NonNativeLabelDemo, {});

    const label = result.getByTestId('label');
    const control = result.getByTestId('control') as HTMLInputElement;
    expect(label).not.toHaveAttribute('for');

    fireEvent.click(label);
    await act(() => {});
    expect(document.activeElement).toBe(control);
  });

  it('propagates disabled to the control', async () => {
    const result = await render(FieldDemo, { disabled: true });
    const control = result.getByTestId('control') as HTMLInputElement;
    expect(control).toHaveAttribute('data-disabled');
  });

  it('Field.Item composes label/control and propagates disabled', async () => {
    const result = await render(ItemDemo, {});

    const item = result.getByTestId('item');
    expect(item).not.toHaveAttribute('data-disabled');
    expect(result.getByTestId('item-control')).not.toHaveAttribute('data-disabled');

    // Field.Item's own disabled prop disables a wrapped control (e.g. Checkbox) via context
    const result2 = await render(ItemDisabled, {});
    const checkbox = result2.getByTestId('item-checkbox');
    expect(checkbox).toHaveAttribute('data-disabled');
  });

  it('Field.Error shows and registers aria-describedby when invalid', async () => {
    const result = await render(ErrorInvalid, {});

    await waitFor(() => {
      expect(result.getByTestId('error')).not.toBe(null);
    });

    const control = result.getByTestId('control') as HTMLInputElement;
    const error = result.getByTestId('error');
    expect(control).toHaveAttribute('aria-describedby', error.id);
    expect(error).toHaveTextContent('Message');
  });

  it('Field.Error does not render when the field is valid', async () => {
    const result = await render(ErrorValid, {});

    await act(() => {});
    expect(result.queryByTestId('error')).toBe(null);
  });

  it('Field.Error honors a specific match against constraint validation', async () => {
    const result = await render(MatchDemo, {});

    expect(result.queryByTestId('error')).toBe(null);

    fireEvent.click(result.getByTestId('submit'));
    await waitFor(() => {
      expect(result.getByTestId('error')).not.toBe(null);
    });

    const control = result.getByTestId('control') as HTMLInputElement;
    fireEvent.input(control, { target: { value: 'a' } });
    await act(() => {});
    expect(result.queryByTestId('error')).toBe(null);
  });

  it('Field.Error always renders when match is true', async () => {
    const result = await render(ErrorInvalid, {});

    await waitFor(() => {
      expect(result.getByTestId('error')).not.toBe(null);
    });
  });

  it('Field.Error shows Form errors as text', async () => {
    const result = await render(FormErrorDemo, {});

    await waitFor(() => {
      expect(result.getByTestId('error')).not.toBe(null);
    });
    expect(result.getByTestId('error')).toHaveTextContent('Username is reserved');
    expect(result.getByTestId('control')).toHaveAttribute('aria-invalid');
  });

  it('Field.Error renders Form error arrays as a list', async () => {
    const result = await render(FormErrorListDemo, {});

    await waitFor(() => {
      expect(result.getByTestId('error')).not.toBe(null);
    });

    const list = result.getByTestId('error').querySelector('ul');
    expect(list).not.toBe(null);
    expect(list?.querySelectorAll('li')).toHaveLength(2);
  });

  it('Field.Validity renders children with the validity state', async () => {
    const result = await render(ValidityDemo, {});

    await waitFor(() => {
      expect(result.getByTestId('validity')).not.toBe(null);
    });
    expect(renderProp).toHaveBeenCalled();
    const state = renderProp.mock.calls[0][0];
    expect(state).toHaveProperty('validity');
    expect(state).toHaveProperty('transitionStatus');
  });

  it('Field.Control fires onValueChange when typing', async () => {
    controlOnValueChange.mockClear();
    const result = await render(ControlDemo, {});

    const control = result.getByTestId('control') as HTMLInputElement;
    fireEvent.input(control, { target: { value: 'hello' } });
    await waitFor(() => {
      expect(controlOnValueChange).toHaveBeenCalledTimes(1);
    });
    expect(controlOnValueChange.mock.calls[0][0]).toBe('hello');
  });
});
