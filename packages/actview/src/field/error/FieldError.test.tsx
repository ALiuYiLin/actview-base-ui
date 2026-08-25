import { expect } from 'vitest';
import { Field } from '@/field';
import { Form } from '@/form';
import { createRenderer } from '#test-utils';
import { act, fireEvent, screen, waitFor } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Field.Error />', () => {
  const { render } = createRenderer();

  it('renders nothing when the field is valid', async () => {
    await render(
      Field.Root,
      {children: <Field.Error>Error text</Field.Error>},
    );

    expect(screen.queryByText('Error text')).toBeNull();
  });

  it('renders the error when match is true', async () => {
    await render(
      Field.Root,
      {
        invalid: true,
        children: <Field.Error match>Error text</Field.Error>,
      },
    );

    await waitFor(() => {
      expect(screen.getByText('Error text')).toBeInTheDocument();
    });
    expect(screen.getByText('Error text')).toHaveAttribute('data-invalid');
  });

  it('renders the custom validator error message with match="customError" (needs validation trigger)', async () => {
    await render(
      Form,
      {
        children: (
          <>
            <Field.Root validate={() => 'error'}>
              <Field.Control />
              <Field.Error match="customError">Message</Field.Error>
            </Field.Root>
            <button type="submit">submit</button>
          </>
        ),
      },
    );

    const input = screen.getByRole<HTMLInputElement>('textbox');

    fireEvent.focus(input);
    fireEvent.change(input, {target: {value: 'a'}});
    fireEvent.blur(input);
    await settle();
    expect(screen.queryByText('Message')).toBe(null);

    fireEvent.click(screen.getByText('submit'));
    await settle();
    expect(screen.queryByText('Message')).not.toBe(null);
  });
});
