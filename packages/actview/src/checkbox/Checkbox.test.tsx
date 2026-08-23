import { expect, vi } from 'vitest';
import { defineComponent, nextTick, ref } from 'actview';
import { Checkbox } from '@/checkbox';
import { CheckboxGroup } from '@/checkbox-group';
import { Field } from '@/field';
import { createRenderer } from '#test-utils';
import { fireEvent, screen } from '#test-utils/rtl';

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

describe('<Checkbox.Indicator />', () => {
  const { render } = createRenderer();

  it('renders when checked', async () => {
    await render(
      Checkbox.Root,
      {checked: true, children: <Checkbox.Indicator>✓</Checkbox.Indicator>},
    );

    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('does not render when unchecked without keepMounted', async () => {
    await render(
      Checkbox.Root,
      {children: <Checkbox.Indicator>✓</Checkbox.Indicator>},
    );

    expect(screen.queryByText('✓')).toBeNull();
  });
});

describe('<CheckboxGroup />', () => {
  const { render } = createRenderer();

  it('toggles member checkboxes in the group value', async () => {
    const onValueChange = vi.fn();
    await render(
      CheckboxGroup,
      {
        onValueChange,
        children: (
          <>
            <Checkbox.Root value="a" children={null} />
            <Checkbox.Root value="b" children={null} />
          </>
        ),
      },
    );

    const roots = document.querySelectorAll('[role="checkbox"]');
    fireEvent.click(roots[0]);

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toEqual(['a']);
  });

  it('works inside a Field with a label', async () => {
    await render(
      Field.Root,
      {
        name: 'options',
        children: (
          <>
            <Field.Label>Options</Field.Label>
            <CheckboxGroup>
              <Checkbox.Root value="a" children={null} />
            </CheckboxGroup>
          </>
        ),
      },
    );

    const group = document.querySelector('[role="group"]') as HTMLElement;
    expect(group).toHaveAttribute('aria-labelledby');
    expect(group.getAttribute('aria-labelledby')).toBe(
      screen.getByText('Options').id,
    );
  });
});
