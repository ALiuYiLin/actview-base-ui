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

  it('dual thumbs: data-index follows registration order, no z-index at rest (golden C5)', async () => {
    await render(
      Slider.Root,
      {
        defaultValue: [30, 70],
        children: (
          <Slider.Control>
            <Slider.Thumb />
            <Slider.Thumb />
          </Slider.Control>
        ),
      },
    );

    const thumbs = document.querySelectorAll('[data-index]');
    expect(thumbs.length).toBe(2);
    const [t0, t1] = Array.from(thumbs) as HTMLElement[];
    expect(t0.getAttribute('data-index')).toBe('0');
    expect(t1.getAttribute('data-index')).toBe('1');
    // 无交互时不得输出 z-index（首帧 index 未初始化时 active(-1)===index(-1)
    // 会误判高亮——SliderThumb 已加 index>=0 守卫，core style patch 清理残留）
    expect(t0.style.zIndex).toBe('');
    expect(t1.style.zIndex).toBe('');
  });

  it('dual thumbs inset mode: no z-index at rest (golden C5)', async () => {
    await render(
      Slider.Root,
      {
        defaultValue: [30, 70],
        thumbAlignment: 'end',
        children: (
          <Slider.Control>
            <Slider.Thumb />
            <Slider.Thumb />
          </Slider.Control>
        ),
      },
    );

    const thumbs = document.querySelectorAll('[data-index]');
    expect(thumbs.length).toBe(2);
    const [t0, t1] = Array.from(thumbs) as HTMLElement[];
    expect(t0.getAttribute('data-index')).toBe('0');
    expect(t1.getAttribute('data-index')).toBe('1');
    expect(t0.style.zIndex).toBe('');
    expect(t1.style.zIndex).toBe('');
  });
});

