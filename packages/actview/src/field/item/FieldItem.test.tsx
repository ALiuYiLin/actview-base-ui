import { describe, expect, it, vi } from 'vitest';
import { FieldRoot } from '@/field/root/FieldRoot';
import { FieldItem } from '@/field/item/FieldItem';
import { FieldLabel } from '@/field/label/FieldLabel';
import { CheckboxRoot } from '@/checkbox/root/CheckboxRoot';
import { CheckboxGroup } from '@/checkbox-group/CheckboxGroup';
import { RadioRoot } from '@/radio/root/RadioRoot';
import { RadioGroup } from '@/radio-group/RadioGroup';
import { createRenderer } from '#/test/createRenderer';

describe('<Field.Item />', () => {
  const { render, fireEvent, act, waitFor } = createRenderer();

  describe('prop: disabled', () => {
    it('reflects disabled state on the item', async () => {
      const renderItem = vi.fn();

      // Use JSX in the render function. The Babel plugin converts function
      // declarations that return JSX to defineComponent objects, which would
      // make `typeof render === 'object'` and break the render prop check.
      // A function expression assigned to a variable avoids this conversion.
      const renderFieldItem = function (merged: any) {
        renderItem(merged);
        return <div {...merged} data-testid="item" />;
      };

      function Demo() {
        return (
          <FieldRoot>
            <FieldItem disabled render={renderFieldItem} />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      expect(result.getByTestId('item')).toHaveAttribute('data-disabled');
      expect(renderItem.mock.lastCall?.[0].disabled).toBe(true);
    });

    it('disables a wrapped checkbox', async () => {
      const onValueChange = vi.fn();

      function Demo() {
        return (
          <FieldRoot name="apple">
            <CheckboxGroup defaultValue={[]} onValueChange={onValueChange}>
              <FieldItem disabled>
                <CheckboxRoot value="fuji-apple" data-testid="disabled-cb" />
              </FieldItem>
              <FieldItem>
                <CheckboxRoot value="gala-apple" data-testid="enabled-cb" />
              </FieldItem>
            </CheckboxGroup>
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const checkbox1 = result.getByTestId('disabled-cb');
      const checkbox2 = result.getByTestId('enabled-cb');

      fireEvent.click(checkbox1);
      await act(() => {});
      expect(onValueChange.mock.calls.length).toBe(0);

      fireEvent.click(checkbox2);
      await act(() => {});
      expect(onValueChange.mock.calls.length).toBe(1);
    });

    it('disables a wrapped radio', async () => {
      const onValueChange = vi.fn();

      function Demo() {
        return (
          <FieldRoot name="apple">
            <RadioGroup defaultValue="" onValueChange={onValueChange}>
              <FieldItem disabled>
                <RadioRoot value="fuji-apple" data-testid="disabled-radio" />
              </FieldItem>
              <FieldItem>
                <RadioRoot value="gala-apple" data-testid="enabled-radio" />
              </FieldItem>
            </RadioGroup>
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const radio1 = result.getByTestId('disabled-radio');
      const radio2 = result.getByTestId('enabled-radio');

      fireEvent.click(radio1);
      await act(() => {});
      expect(onValueChange.mock.calls.length).toBe(0);

      fireEvent.click(radio2);
      await act(() => {});
      expect(onValueChange.mock.calls.length).toBe(1);
    });
  });

  it('associates a Field.Item label with a parent checkbox', async () => {
    function Demo() {
      return (
        <FieldRoot>
          <CheckboxGroup allValues={['a', 'b']}>
            <FieldItem>
              <FieldLabel data-testid="label">
                <CheckboxRoot parent data-testid="parent" />
                Toggle all
              </FieldLabel>
            </FieldItem>
            <CheckboxRoot value="a" data-testid="a" />
            <CheckboxRoot value="b" data-testid="b" />
          </CheckboxGroup>
        </FieldRoot>
      );
    }

    const result = await render(Demo, {});

    const label = result.getByTestId('label') as HTMLLabelElement;
    const parent = result.getByTestId('parent');

    expect(label).toHaveAttribute('for');
    fireEvent.click(label);
    await act(() => {});
    expect(parent).toHaveAttribute('aria-checked', 'true');
    expect(result.getByTestId('a')).toHaveAttribute('aria-checked', 'true');
    expect(result.getByTestId('b')).toHaveAttribute('aria-checked', 'true');
  });
});