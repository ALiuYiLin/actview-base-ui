import { expect, vi } from 'vitest';
import { defineComponent, ref } from 'actview';
import { CheckboxGroup } from '@/checkbox-group';
import { Checkbox } from '@/checkbox';
import { Field } from '@/field';
import { fireEvent, screen } from '#test-utils/rtl';
import { createRenderer, describeConformance } from '#test-utils';

describe('<CheckboxGroup />', () => {
  const { render } = createRenderer();

  describeConformance(<CheckboxGroup />, () => ({
    render: (node) => render(node.type, {...(node.props ?? {})}),
    refInstanceof: window.HTMLDivElement,
  }));

  describe('prop: id', () => {
    it('is forwarded to the root element', async () => {
      await render(CheckboxGroup, {id: 'group-id'});

      expect(screen.getByRole('group')).toHaveAttribute('id', 'group-id');
    });
  });

  describe('prop: value', () => {
    it('should control the value', async () => {
      const value = ref<string[]>(['red']);

      const App = defineComponent(function () {
        return () => (
          <CheckboxGroup value={value.value} onValueChange={(v) => (value.value = v)}>
            <Checkbox.Root name="red" data-testid="red" />
            <Checkbox.Root name="green" data-testid="green" />
            <Checkbox.Root name="blue" data-testid="blue" />
          </CheckboxGroup>
        );
      });

      await render(App);

      const red = screen.getByTestId('red');
      const green = screen.getByTestId('green');
      const blue = screen.getByTestId('blue');

      expect(red).toHaveAttribute('aria-checked', 'true');
      expect(green).toHaveAttribute('aria-checked', 'false');
      expect(blue).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(green);
      await new Promise((r) => setTimeout(r, 0));

      expect(red).toHaveAttribute('aria-checked', 'true');
      expect(green).toHaveAttribute('aria-checked', 'true');
      expect(blue).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(blue);
      await new Promise((r) => setTimeout(r, 0));

      expect(red).toHaveAttribute('aria-checked', 'true');
      expect(green).toHaveAttribute('aria-checked', 'true');
      expect(blue).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(green);
      await new Promise((r) => setTimeout(r, 0));

      expect(red).toHaveAttribute('aria-checked', 'true');
      expect(green).toHaveAttribute('aria-checked', 'false');
      expect(blue).toHaveAttribute('aria-checked', 'true');
    });

    it('supports an empty string item value', async () => {
      const value = ref<string[]>(['']);

      const App = defineComponent(function () {
        return () => (
          <CheckboxGroup value={value.value} onValueChange={(v) => (value.value = v)}>
            <Checkbox.Root value="" data-testid="empty" />
            <Checkbox.Root value="other" data-testid="other" />
          </CheckboxGroup>
        );
      });

      await render(App);

      const empty = screen.getByTestId('empty');
      const other = screen.getByTestId('other');

      expect(empty).toHaveAttribute('aria-checked', 'true');
      expect(other).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(empty);
      await new Promise((r) => setTimeout(r, 0));

      expect(empty).toHaveAttribute('aria-checked', 'false');
    });

    it('treats a controlled value that becomes undefined as an empty array', async () => {
      const value = ref<string[] | undefined>(['red']);

      const App = defineComponent(function () {
        return () => (
          <>
            <CheckboxGroup value={value.value as string[] | undefined}>
              <Checkbox.Root value="red" data-testid="red" />
            </CheckboxGroup>
            <button type="button" onClick={() => (value.value = undefined)}>
              Clear
            </button>
          </>
        );
      });

      await render(App);

      expect(screen.getByTestId('red')).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(screen.getByText('Clear'));
      await new Promise((r) => setTimeout(r, 0));

      expect(screen.getByTestId('red')).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('prop: onValueChange', () => {
    it('should be called when the value changes', async () => {
      const handleValueChange = vi.fn();
      const value = ref<string[]>([]);

      const App = defineComponent(function () {
        return () => (
          <CheckboxGroup
            value={value.value}
            onValueChange={(nextValue) => {
              value.value = nextValue;
              handleValueChange(nextValue);
            }}
          >
            <Checkbox.Root name="red" data-testid="red" />
            <Checkbox.Root name="green" data-testid="green" />
            <Checkbox.Root name="blue" data-testid="blue" />
          </CheckboxGroup>
        );
      });

      await render(App);

      const red = screen.getByTestId('red');
      const green = screen.getByTestId('green');
      const blue = screen.getByTestId('blue');

      fireEvent.click(red);
      await new Promise((r) => setTimeout(r, 0));

      expect(handleValueChange.mock.calls.length).toBe(1);
      expect(handleValueChange.mock.calls[0][0]).toEqual(['red']);

      fireEvent.click(green);
      await new Promise((r) => setTimeout(r, 0));

      expect(handleValueChange.mock.calls.length).toBe(2);
      expect(handleValueChange.mock.calls[1][0]).toEqual(['red', 'green']);

      fireEvent.click(blue);
      await new Promise((r) => setTimeout(r, 0));

      expect(handleValueChange.mock.calls.length).toBe(3);
      expect(handleValueChange.mock.calls[2][0]).toEqual(['red', 'green', 'blue']);
    });

    it('should treat an omitted defaultValue as an empty array', async () => {
      const handleValueChange = vi.fn();

      await render(CheckboxGroup, {
        onValueChange: handleValueChange,
        children: (
          <>
            <Checkbox.Root name="red" data-testid="red" />
            <Checkbox.Root name="green" data-testid="green" />
            <Checkbox.Root name="blue" data-testid="blue" />
          </>
        ),
      });

      const red = screen.getByTestId('red');
      const green = screen.getByTestId('green');

      fireEvent.click(red);
      await new Promise((r) => setTimeout(r, 0));

      expect(handleValueChange.mock.calls[0][0]).toEqual(['red']);

      fireEvent.click(green);
      await new Promise((r) => setTimeout(r, 0));

      expect(handleValueChange.mock.calls[1][0]).toEqual(['red', 'green']);

      fireEvent.click(red);
      await new Promise((r) => setTimeout(r, 0));

      expect(handleValueChange.mock.calls[2][0]).toEqual(['green']);
    });

    it('does not update the group when onValueChange cancels the event', async () => {
      const handleValueChange = vi.fn((_, eventDetails: CheckboxGroup.ChangeEventDetails) => {
        eventDetails.cancel();
      });

      await render(CheckboxGroup, {
        onValueChange: handleValueChange,
        children: (
          <>
            <Checkbox.Root value="red" data-testid="red" />
            <Checkbox.Root value="green" data-testid="green" />
          </>
        ),
      });

      const red = screen.getByTestId('red');
      const green = screen.getByTestId('green');

      fireEvent.click(red);
      await new Promise((r) => setTimeout(r, 0));

      expect(handleValueChange.mock.calls.length).toBe(1);
      expect(handleValueChange.mock.calls[0][0]).toEqual(['red']);
      expect(red).toHaveAttribute('aria-checked', 'false');
      expect(green).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('prop: defaultValue', () => {
    it('treats null as an empty array', async () => {
      await render(CheckboxGroup, {defaultValue: null as any});

      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('should set the initial value', async () => {
      await render(CheckboxGroup, {
        defaultValue: ['red'],
        children: (
          <>
            <Checkbox.Root name="red" data-testid="red" />
            <Checkbox.Root name="green" data-testid="green" />
            <Checkbox.Root name="blue" data-testid="blue" />
          </>
        ),
      });

      const red = screen.getByTestId('red');
      const green = screen.getByTestId('green');
      const blue = screen.getByTestId('blue');

      expect(red).toHaveAttribute('aria-checked', 'true');
      expect(green).toHaveAttribute('aria-checked', 'false');
      expect(blue).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(green);
      await new Promise((r) => setTimeout(r, 0));

      expect(red).toHaveAttribute('aria-checked', 'true');
      expect(green).toHaveAttribute('aria-checked', 'true');
      expect(blue).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('prop: disabled', () => {
    it('disables all checkboxes when `true`', async () => {
      await render(CheckboxGroup, {
        disabled: true,
        children: (
          <>
            <Checkbox.Root name="red" data-testid="red" />
            <Checkbox.Root name="green" data-testid="green" />
            <Checkbox.Root name="blue" data-testid="blue" />
          </>
        ),
      });

      const red = screen.getByTestId('red');
      const green = screen.getByTestId('green');
      const blue = screen.getByTestId('blue');

      expect(red).toHaveAttribute('aria-disabled', 'true');
      expect(green).toHaveAttribute('aria-disabled', 'true');
      expect(blue).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not disable all checkboxes when `false`', async () => {
      await render(CheckboxGroup, {
        disabled: false,
        children: (
          <>
            <Checkbox.Root name="red" data-testid="red" />
            <Checkbox.Root name="green" data-testid="green" />
            <Checkbox.Root name="blue" data-testid="blue" />
          </>
        ),
      });

      const red = screen.getByTestId('red');
      const green = screen.getByTestId('green');
      const blue = screen.getByTestId('blue');

      expect(red).not.toHaveAttribute('aria-disabled', 'true');
      expect(green).not.toHaveAttribute('aria-disabled', 'true');
      expect(blue).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('takes precedence over individual checkboxes', async () => {
      await render(CheckboxGroup, {
        disabled: true,
        children: (
          <>
            <Checkbox.Root name="red" data-testid="red" disabled={false} />
            <Checkbox.Root name="green" data-testid="green" />
            <Checkbox.Root name="blue" data-testid="blue" />
          </>
        ),
      });

      const red = screen.getByTestId('red');
      const green = screen.getByTestId('green');
      const blue = screen.getByTestId('blue');

      expect(red).toHaveAttribute('aria-disabled', 'true');
      expect(green).toHaveAttribute('aria-disabled', 'true');
      expect(blue).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Field', () => {
    it('works inside a Field with a label', async () => {
      await render(Field.Root, {
        name: 'options',
        children: (
          <>
            <Field.Label>Options</Field.Label>
            <CheckboxGroup>
              <Checkbox.Root value="a" children={null} />
            </CheckboxGroup>
          </>
        ),
      });

      const group = document.querySelector('[role="group"]') as HTMLElement;
      expect(group).toHaveAttribute('aria-labelledby');
      expect(group.getAttribute('aria-labelledby')).toBe(screen.getByText('Options').id);
    });

    it('[data-dirty]', async () => {
      await render(Field.Root, {
        name: 'fruits',
        children: (
          <CheckboxGroup defaultValue={['apple']}>
            <Field.Item>
              <Checkbox.Root value="apple" data-testid="apple" />
            </Field.Item>
            <Field.Item>
              <Checkbox.Root value="banana" data-testid="banana" />
            </Field.Item>
          </CheckboxGroup>
        ),
      });

      const group = screen.getByRole('group');
      const banana = screen.getByTestId('banana');

      expect(group).not.toHaveAttribute('data-dirty');

      fireEvent.click(banana);
      await new Promise((r) => setTimeout(r, 0));

      expect(group).toHaveAttribute('data-dirty', '');

      fireEvent.click(banana);
      await new Promise((r) => setTimeout(r, 0));

      expect(group).not.toHaveAttribute('data-dirty');
    });

    it('validates with the group value when toggling the parent checkbox', async () => {
      const validateSpy = vi.fn((_value: unknown) => null);

      await render(Field.Root, {
        validationMode: 'onChange',
        validate: validateSpy,
        name: 'fruits',
        children: (
          <CheckboxGroup allValues={['apple', 'orange']}>
            <Checkbox.Root parent data-testid="parent" />
            <Checkbox.Root value="apple" />
            <Checkbox.Root value="orange" />
          </CheckboxGroup>
        ),
      });

      const parent = screen.getByTestId('parent');

      fireEvent.click(parent);
      await new Promise((r) => setTimeout(r, 0));
      expect(validateSpy).toHaveBeenCalledTimes(1);
      expect(validateSpy.mock.lastCall?.[0]).toEqual(['apple', 'orange']);

      fireEvent.click(parent);
      await new Promise((r) => setTimeout(r, 0));
      expect(validateSpy).toHaveBeenCalledTimes(2);
      expect(validateSpy.mock.lastCall?.[0]).toEqual([]);
    });

    it('updates disabled state when the prop changes dynamically', async () => {
      const {setProps} = await render(CheckboxGroup, {'data-testid': 'group'});

      const group = screen.getByTestId('group');
      expect(group).not.toHaveAttribute('data-disabled');

      await setProps({disabled: true});
      expect(group).toHaveAttribute('data-disabled');
    });
  });
});
