import { expect } from 'vitest';
import { Progress } from '@/progress';
import { createRenderer } from '#test-utils';

describe('<Progress.Root />', () => {
  const { render } = createRenderer();

  it('renders role="progressbar" with aria attributes', async () => {
    await render(
      Progress.Root,
      {value: 40, children: null},
    );

    const root = document.querySelector('[role="progressbar"]') as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('aria-valuenow', '40');
    expect(root).toHaveAttribute('aria-valuemin', '0');
    expect(root).toHaveAttribute('aria-valuemax', '100');
  });

  it('is indeterminate when value is null', async () => {
    await render(Progress.Root, {children: null});

    const root = document.querySelector('[role="progressbar"]') as HTMLElement;
    expect(root).not.toHaveAttribute('aria-valuenow');
    expect(root).toHaveAttribute('data-indeterminate', '');
  });

  it('is complete at max', async () => {
    await render(Progress.Root, {value: 100, children: null});

    const root = document.querySelector('[role="progressbar"]') as HTMLElement;
    expect(root).toHaveAttribute('data-complete', '');
  });

  it('updates derived state when value changes dynamically', async () => {
    const {setProps} = await render(Progress.Root, {value: 40, children: null});

    const root = document.querySelector('[role="progressbar"]') as HTMLElement;
    expect(root).toHaveAttribute('aria-valuenow', '40');

    await setProps({value: 70});
    expect(root).toHaveAttribute('aria-valuenow', '70');
    expect(root).toHaveAttribute('data-progressing', '');

    await setProps({value: 100});
    expect(root).toHaveAttribute('aria-valuenow', '100');
    expect(root).toHaveAttribute('data-complete', '');
  });
});
