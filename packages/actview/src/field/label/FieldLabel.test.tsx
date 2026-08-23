import { expect } from 'vitest';
import { Field } from '@/field';
import { createRenderer } from '#test-utils';
import { screen } from '#test-utils/rtl';

describe('<Field.Label />', () => {
  const { render } = createRenderer();

  it('renders a label element associated with the control', async () => {
    await render(
      Field.Root,
      {
        children: (
          <>
            <Field.Label>Label text</Field.Label>
            <Field.Control />
          </>
        ),
      },
    );

    const label = screen.getByText('Label text');
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveAttribute('for');
    const control = screen.getByRole('textbox');
    expect(label).toHaveAttribute('for', control.id);
  });

  it('renders a non-native label when nativeLabel is false', async () => {
    await render(
      Field.Root,
      {
        children: (
          <>
            <Field.Label nativeLabel={false}>Label text</Field.Label>
            <Field.Control />
          </>
        ),
      },
    );

    const label = screen.getByText('Label text');
    expect(label.tagName).toBe('LABEL');
    // nativeLabel=false：非原生 label 行为，不输出 htmlFor（由 Base UI 的
    // 点击处理关联控件）
    expect(label).not.toHaveAttribute('for');
  });
});
