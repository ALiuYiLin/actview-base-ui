import { expect } from 'vitest';
import { Slider } from '@/slider';
import { createRenderer } from '#test-utils';

describe('<Slider.Thumb />', () => {
  const { render } = createRenderer();

  it('outputs the className once (golden C15: no duplicated token)', async () => {
    await render(
      Slider.Root,
      {
        defaultValue: 50,
        children: (
          <Slider.Control>
            <Slider.Thumb className="my-thumb" />
          </Slider.Control>
        ),
      },
    );

    const thumb = document.querySelector('[data-index]') as HTMLElement;
    expect(thumb).toBeInTheDocument();
    expect(thumb.className).toBe('my-thumb');
  });

  it('resolves a function className against the thumb state', async () => {
    await render(
      Slider.Root,
      {
        defaultValue: 50,
        children: (
          <Slider.Control>
            <Slider.Thumb className={(state) => `thumb-${state.values[0]}`} />
          </Slider.Control>
        ),
      },
    );

    const thumb = document.querySelector('[data-index]') as HTMLElement;
    expect(thumb.className).toBe('thumb-50');
  });
});

