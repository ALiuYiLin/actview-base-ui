import { expect } from 'vitest';
import { Radio } from '@/radio';
import { RadioGroup } from '@/radio-group';
import { createRenderer } from '#test-utils';
import { screen } from '#test-utils/rtl';

describe('<Radio.Indicator />', () => {
  const { render } = createRenderer();

  it('shows indicator when checked', async () => {
    await render(
      RadioGroup,
      {
        defaultValue: 'a',
        children: (
          <Radio.Root value="a">
            <Radio.Indicator>●</Radio.Indicator>
          </Radio.Root>
        ),
      },
    );

    expect(screen.getByText('●')).toBeInTheDocument();
  });
});
