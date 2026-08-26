import { expect } from 'vitest';
import { Slider } from '@/slider';
import { createRenderer } from '#test-utils';

describe('<Slider.Indicator />', () => {
  const { render } = createRenderer();

  it('renders the indicator between values', async () => {
    await render(
      Slider.Root,
      {
        defaultValue: [20, 80],
        children: (
          <Slider.Control>
            <Slider.Track>
              <Slider.Indicator />
              <Slider.Thumb index={0} />
              <Slider.Thumb index={1} />
            </Slider.Track>
          </Slider.Control>
        ),
      },
    );

    const inputs = document.querySelectorAll('input[type="range"]');
    expect(inputs.length).toBe(2);
    expect(document.querySelectorAll('[role="group"] input').length).toBe(2);
  });
});
