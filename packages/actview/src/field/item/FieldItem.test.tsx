import { describe, expect, it, vi } from 'vitest';
import { Field } from '@/field';
import { createRenderer, describeConformance } from '#test-utils';
import { render, screen } from '#test-utils/rtl';

describe('<Field.Item />', () => {
  const {render: renderCR} = createRenderer();

  describeConformance(<Field.Item />, () => ({
    // actview conformance 检查容器首元素（Field.Root 的根 div）
    refInstanceof: window.HTMLDivElement,
    render: (node) => renderCR(Field.Root, {children: node}),
  }));

  describe('prop: disabled', () => {
    it('reflects disabled state in the render-prop state', async () => {
      const renderItem = vi.fn();
      await render(
        <Field.Root>
          <Field.Item
            disabled
            data-testid="item"
            render={(props: any) => {
              renderItem(props);
              return <div {...props} />;
            }}
          />
        </Field.Root>,
      );

      expect(screen.getByTestId('item')).not.toBe(null);
      expect(renderItem.mock.lastCall?.[0].disabled).toBe(true);
    });

    it('disables a wrapped checkbox', async () => {
      const onValueChange = vi.fn();
      const {CheckboxGroup} = await import('@/checkbox-group');
      const {Checkbox} = await import('@/checkbox');
      await render(
        <Field.Root name="apple">
          <CheckboxGroup defaultValue={[]} onValueChange={onValueChange}>
            <Field.Item disabled>
              <Checkbox.Root value="fuji-apple" />
            </Field.Item>
            <Field.Item>
              <Checkbox.Root value="gala-apple" />
            </Field.Item>
          </CheckboxGroup>
        </Field.Root>,
      );
      const [checkbox1, checkbox2] = screen.getAllByRole('checkbox');
      checkbox1.click();
      expect(onValueChange.mock.calls.length).toBe(0);
      checkbox2.click();
      expect(onValueChange.mock.calls.length).toBe(1);
    });

    it('updates the wrapped checkbox when Field.Root disabled changes dynamically', async () => {
      const {Checkbox} = await import('@/checkbox');
      const {render: renderCR} = createRenderer();
      const {setProps} = await renderCR(Field.Root, {
        children: (
          <Field.Item>
            <Checkbox.Root value="a" />
          </Field.Item>
        ),
      });

      expect(screen.getByRole('checkbox')).not.toHaveAttribute('aria-disabled');

      await setProps({disabled: true});
      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('checkbox')).toHaveAttribute('data-disabled');
    });
  });
});
