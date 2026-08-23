import { expect } from 'vitest';
import { Field } from '@/field';
import { createRenderer } from '#test-utils';
import { screen, waitFor } from '#test-utils/rtl';

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

  it.skip('renders the custom validator error message with match="customError" (needs validation trigger)', () => {
    // React 版通过用户交互触发验证（commit）；actview 的 validate 需在
    // FieldControl 交互后才会执行——待 FieldControl 完整交互测试补全。
  });
});
