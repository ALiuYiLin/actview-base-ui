import { expect } from 'vitest';
import { defineComponent, ref } from 'actview';
import { Fieldset } from '@/fieldset';
import { createRenderer, describeConformance } from '#test-utils';
import { fireEvent, screen } from '#test-utils/rtl';

describe('<Fieldset.Root />', () => {
  const { render } = createRenderer();

  describeConformance(<Fieldset.Root />, () => ({
    inheritComponent: 'fieldset',
    refInstanceof: window.HTMLFieldSetElement,
    render: (node) => render(node.type, {...(node.props ?? {})}),
  }));

  it('sets the native disabled attribute', async () => {
    await render(
      Fieldset.Root,
      {disabled: true, 'data-testid': 'fieldset', children: <input />},
    );

    expect(screen.getByTestId('fieldset')).toHaveAttribute('disabled');
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('keeps nested fieldsets disabled when an ancestor fieldset is disabled', async () => {
    await render(
      Fieldset.Root,
      {
        disabled: true,
        children: (
          <Fieldset.Root>
            <input data-testid="control" />
          </Fieldset.Root>
        ),
      },
    );

    expect(screen.getByTestId('control')).toBeDisabled();
  });

  it.skip('keeps nested disabled precedence in both directions (pending Field migration)', async () => {
    // React 版用 Field.Root data-disabled 断言；actview 的 Field 家族尚未迁移，
    // 待 Field.Root 迁移后补全此用例。
  });
});
