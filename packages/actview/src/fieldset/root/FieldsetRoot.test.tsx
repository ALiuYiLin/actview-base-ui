import { expect } from 'vitest';
import { defineComponent, ref } from 'actview';
import { Fieldset } from '@/fieldset';
import { Field } from '@/field';
import { createRenderer, describeConformance } from '#test-utils';
import { act, fireEvent, screen } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

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

  it('keeps nested disabled precedence in both directions (pending Field migration)', async () => {
    const App = defineComponent(function () {
      const outerDisabled = ref(false);
      const innerDisabled = ref(true);
      return () => (
        <>
          <Fieldset.Root disabled={outerDisabled.value} data-testid="outer">
            <Fieldset.Root disabled={innerDisabled.value} data-testid="inner">
              <Field.Root data-testid="root">
                <Field.Control data-testid="control" />
              </Field.Root>
            </Fieldset.Root>
          </Fieldset.Root>
          <button type="button" onClick={() => (outerDisabled.value = true)}>
            Disable outer
          </button>
          <button type="button" onClick={() => (innerDisabled.value = false)}>
            Enable inner
          </button>
          <button type="button" onClick={() => (outerDisabled.value = false)}>
            Enable outer
          </button>
        </>
      );
    });

    await render(App);

    expect(screen.getByTestId('control')).toBeDisabled();
    expect(screen.getByTestId('root')).toHaveAttribute('data-disabled');
    fireEvent.click(screen.getByRole('button', {name: 'Disable outer'}));
    fireEvent.click(screen.getByRole('button', {name: 'Enable inner'}));
    await settle();
    expect(screen.getByTestId('control')).toBeDisabled();
    expect(screen.getByTestId('root')).toHaveAttribute('data-disabled');
    fireEvent.click(screen.getByRole('button', {name: 'Enable outer'}));
    await settle();
    expect(screen.getByTestId('control')).not.toBeDisabled();
    expect(screen.getByTestId('root')).not.toHaveAttribute('data-disabled');
  });
});
