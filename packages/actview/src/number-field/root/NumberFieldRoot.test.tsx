import { expect } from 'vitest';
import { nextTick } from 'actview';
import { NumberField } from '@/number-field';
import { Field } from '@/field';
import { createRenderer } from '#test-utils';

async function settle() {
  await nextTick();
  await nextTick();
  await nextTick();
}

describe('<NumberField.Root />', () => {
  const { render } = createRenderer();

  it('works inside Field with label', async () => {
    await render(
      Field.Root,
      {
        children: (
          <NumberField.Root defaultValue={3}>
            <NumberField.Input />
          </NumberField.Root>
        ),
      },
    );
    await settle();

    expect(document.querySelector('input[type="text"]')).toHaveValue('3');
  });
});
