import { expect } from 'vitest';
import { Field } from '@/field';
import { createRenderer } from '#test-utils';
import { screen } from '#test-utils/rtl';

describe('<Field.Description />', () => {
  const { render } = createRenderer();

  it('renders a paragraph and associates it via aria-describedby', async () => {
    await render(
      Field.Root,
      {
        children: (
          <>
            <Field.Description>Help text</Field.Description>
            <Field.Control />
          </>
        ),
      },
    );

    const description = screen.getByText('Help text');
    expect(description.tagName).toBe('P');
    const control = screen.getByRole('textbox');
    expect(control).toHaveAttribute('aria-describedby');
    expect(control.getAttribute('aria-describedby')).toContain(description.id);
  });

  it('forwards a custom id', async () => {
    await render(
      Field.Root,
      {
        children: (
          <>
            <Field.Description id="custom-desc">Help text</Field.Description>
            <Field.Control />
          </>
        ),
      },
    );

    const description = screen.getByText('Help text');
    expect(description).toHaveAttribute('id', 'custom-desc');
    expect(screen.getByRole('textbox').getAttribute('aria-describedby')).toContain('custom-desc');
  });
});
