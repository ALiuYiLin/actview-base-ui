import { expect } from 'vitest';
import { defineComponent, ref } from 'actview';
import { Input } from '@/input';
import { Field } from '@/field';
import { createRenderer } from '#test-utils';
import { fireEvent, screen } from '#test-utils/rtl';

describe('<Input />', () => {
  const { render } = createRenderer();

  it('renders an input element', async () => {
    await render(Input, {'data-testid': 'input'});

    expect(screen.getByTestId('input').tagName).toBe('INPUT');
  });

  it('works inside a Field', async () => {
    await render(
      Field.Root,
      {
        children: (
          <>
            <Field.Label>Name</Field.Label>
            <Input data-testid="input" />
          </>
        ),
      },
    );

    const input = screen.getByTestId('input');
    expect(screen.getByText('Name')).toHaveAttribute('for', input.id);
  });

  it('supports uncontrolled value', async () => {
    await render(Input, {'data-testid': 'input', defaultValue: 'hello'});

    expect(screen.getByTestId('input')).toHaveValue('hello');
  });
});
