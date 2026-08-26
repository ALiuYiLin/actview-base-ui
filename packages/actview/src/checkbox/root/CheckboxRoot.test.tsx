import { expect } from 'vitest';
import { defineComponent, nextTick, ref } from 'actview';
import { Checkbox } from '@/checkbox';
import { createRenderer } from '#test-utils';
import { fireEvent } from '#test-utils/rtl';

describe('<Checkbox.Root />', () => {
  const { render } = createRenderer();

  it('renders a span with checkbox role and a hidden input', async () => {
    await render(Checkbox.Root, {children: null});

    const root = document.querySelector('[role="checkbox"]') as HTMLElement;
    expect(root.tagName).toBe('SPAN');
    expect(root).toHaveAttribute('aria-checked', 'false');
    const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('tabindex', '-1');
  });

  it('toggles checked on click', async () => {
    await render(Checkbox.Root, {children: null});

    const root = document.querySelector('[role="checkbox"]') as HTMLElement;
    fireEvent.click(root);
    await nextTick();

    expect(root).toHaveAttribute('aria-checked', 'true');
  });

  it('supports controlled checked', async () => {
    const checked = ref(false);
    const Test = defineComponent(function () {
      return () => (
        <Checkbox.Root
          checked={checked.value}
          onCheckedChange={(v) => (checked.value = v)}
          children={null}
        />
      );
    });

    await render(Test);

    const root = document.querySelector('[role="checkbox"]') as HTMLElement;
    fireEvent.click(root);
    expect(checked.value).toBe(true);
  });

  it('renders indeterminate state', async () => {
    await render(Checkbox.Root, {indeterminate: true, children: null});

    const root = document.querySelector('[role="checkbox"]') as HTMLElement;
    expect(root).toHaveAttribute('aria-checked', 'mixed');
    expect(root).toHaveAttribute('data-indeterminate');
  });

  it('does not toggle when disabled', async () => {
    await render(Checkbox.Root, {disabled: true, children: null});

    const root = document.querySelector('[role="checkbox"]') as HTMLElement;
    fireEvent.click(root);
    expect(root).toHaveAttribute('aria-checked', 'false');
  });
});
