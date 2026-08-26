import { expect, vi } from 'vitest';
import { defineComponent, ref } from 'actview';
import { CheckboxGroup } from '@/checkbox-group';
import { Checkbox } from '@/checkbox';
import { fireEvent, screen } from '#test-utils/rtl';
import { createRenderer } from '#test-utils';

describe('useCheckboxGroupParent', () => {
  const { render } = createRenderer();
  const allValues = ['a', 'b', 'c'];

  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('should control child checkboxes', async () => {
    const parentCheckedChange = vi.fn();
    const childCheckedChange = vi.fn();
    const value = ref<string[]>([]);

    const App = defineComponent(function () {
      return () => (
        <CheckboxGroup value={value.value} onValueChange={(v) => (value.value = v)} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" onCheckedChange={parentCheckedChange} />
          <Checkbox.Root value="a" />
          <Checkbox.Root value="b" onCheckedChange={childCheckedChange} />
          <Checkbox.Root value="c" />
        </CheckboxGroup>
      );
    });

    await render(App);

    const checkboxes = screen
      .getAllByRole('checkbox')
      .filter((v) => v.getAttribute('data-parent') == null);
    const parent = screen.getByTestId('parent');

    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });

    fireEvent.click(parent);
    await flush();
    expect(parent).toHaveAttribute('aria-checked', 'true');

    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAttribute('aria-checked', 'true');
    });

    expect(parentCheckedChange.mock.calls.length).toBe(1);
    expect(childCheckedChange.mock.calls.length).toBe(0);

    fireEvent.click(parent);
    await flush();
    expect(parent).toHaveAttribute('aria-checked', 'false');

    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });

    expect(parentCheckedChange.mock.calls.length).toBe(2);
    expect(childCheckedChange.mock.calls.length).toBe(0);
  });

  it('parent should be marked as mixed if some children are checked', async () => {
    const childCheckedChange = vi.fn();
    const value = ref<string[]>([]);

    const App = defineComponent(function () {
      return () => (
        <CheckboxGroup value={value.value} onValueChange={(v) => (value.value = v)} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" onCheckedChange={childCheckedChange} />
          <Checkbox.Root value="b" />
          <Checkbox.Root value="c" />
        </CheckboxGroup>
      );
    });

    await render(App);

    const checkboxes = screen
      .getAllByRole('checkbox')
      .filter((v) => v.getAttribute('data-parent') == null);

    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });
    fireEvent.click(checkboxes[0]);
    await flush();
    expect(childCheckedChange.mock.calls.length).toBe(1);

    expect(screen.getByTestId('parent')).toHaveAttribute('aria-checked', 'mixed');
  });

  it('updates uncontrolled parent-enabled groups from child clicks without duplicate callbacks', async () => {
    const handleValueChange = vi.fn();

    await render(CheckboxGroup, {
      allValues,
      onValueChange: handleValueChange,
      children: (
        <>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" data-testid="checkboxA" />
          <Checkbox.Root value="b" data-testid="checkboxB" />
          <Checkbox.Root value="c" data-testid="checkboxC" />
        </>
      ),
    });

    const parent = screen.getByTestId('parent');
    const checkboxA = screen.getByTestId('checkboxA');
    const checkboxB = screen.getByTestId('checkboxB');
    const checkboxC = screen.getByTestId('checkboxC');

    fireEvent.click(checkboxA);
    await flush();

    expect(handleValueChange.mock.calls.length).toBe(1);
    expect(handleValueChange.mock.calls[0][0]).toEqual(['a']);
    expect(parent).toHaveAttribute('aria-checked', 'mixed');
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');
    expect(checkboxB).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(parent);
    await flush();

    expect(handleValueChange.mock.calls.length).toBe(2);
    expect(handleValueChange.mock.calls[1][0]).toEqual(['a', 'b', 'c']);
    expect(parent).toHaveAttribute('aria-checked', 'true');
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');
    expect(checkboxB).toHaveAttribute('aria-checked', 'true');
    expect(checkboxC).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(parent);
    await flush();

    expect(handleValueChange.mock.calls.length).toBe(3);
    expect(handleValueChange.mock.calls[2][0]).toEqual([]);
    expect(parent).toHaveAttribute('aria-checked', 'false');
    expect(checkboxA).toHaveAttribute('aria-checked', 'false');
    expect(checkboxB).toHaveAttribute('aria-checked', 'false');
    expect(checkboxC).toHaveAttribute('aria-checked', 'false');
  });

  it('should correctly initialize the values array', async () => {
    const value = ref<string[]>(['a']);

    const App = defineComponent(function () {
      return () => (
        <CheckboxGroup value={value.value} onValueChange={(v) => (value.value = v)} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" data-testid="checkboxA" />
          <Checkbox.Root value="b" />
          <Checkbox.Root value="c" />
        </CheckboxGroup>
      );
    });

    await render(App);

    expect(screen.getByTestId('parent')).toHaveAttribute('aria-checked', 'mixed');

    expect(screen.getByTestId('checkboxA')).toHaveAttribute('aria-checked', 'true');
  });

  it('should update the values array when a child checkbox is clicked', async () => {
    const value = ref<string[]>(['a']);

    const App = defineComponent(function () {
      return () => (
        <CheckboxGroup value={value.value} onValueChange={(v) => (value.value = v)} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" data-testid="checkboxA" />
          <Checkbox.Root value="b" />
          <Checkbox.Root value="c" />
        </CheckboxGroup>
      );
    });

    await render(App);

    expect(screen.getByTestId('parent')).toHaveAttribute('aria-checked', 'mixed');

    const checkboxes = screen
      .getAllByRole('checkbox')
      .filter((v) => v.getAttribute('data-parent') == null);

    const checkboxA = screen.getByTestId('checkboxA');
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');

    for (const checkbox of checkboxes) {
      if (checkbox !== checkboxA) {
        fireEvent.click(checkbox);
        await flush();
      }
    }

    expect(screen.getByTestId('parent')).toHaveAttribute('aria-checked', 'true');
  });

  it('should apply space-separated aria-controls attribute with child names', async () => {
    const value = ref<string[]>([]);

    const App = defineComponent(function () {
      return () => (
        <CheckboxGroup value={value.value} onValueChange={(v) => (value.value = v)} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          {allValues.map((v) => (
            <Checkbox.Root key={v} value={v} data-testid={v} />
          ))}
        </CheckboxGroup>
      );
    });

    await render(App);

    expect(screen.getByTestId('parent')).toHaveAttribute(
      'aria-controls',
      allValues.map((v) => screen.getByTestId(v).id).join(' '),
    );
  });

  it('keeps a custom child id in aria-controls', async () => {
    await render(CheckboxGroup, {
      allValues: ['a'],
      children: (
        <>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root id="custom" value="a" data-testid="a" />
        </>
      ),
    });

    // Without nativeButton the custom `id` lands on the hidden input, so `aria-controls`
    // names the exposed element instead (see next test). With nativeButton it survives.
    expect(screen.getByTestId('parent')).toHaveAttribute(
      'aria-controls',
      screen.getByTestId('a').id,
    );
  });

  it('drops an unmounted child from aria-controls', async () => {
    const showB = ref(true);

    const App = defineComponent(function () {
      return () => (
        <CheckboxGroup allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" data-testid="a" />
          {showB.value && <Checkbox.Root value="b" data-testid="b" />}
        </CheckboxGroup>
      );
    });

    await render(App);
    expect(screen.getByTestId('parent')).toHaveAttribute(
      'aria-controls',
      `${screen.getByTestId('a').id} ${screen.getByTestId('b').id}`,
    );

    showB.value = false;
    await flush();

    expect(screen.getByTestId('parent')).toHaveAttribute(
      'aria-controls',
      screen.getByTestId('a').id,
    );
  });

  it('keeps both ids for checkboxes sharing a value and retains the survivor', async () => {
    const showSecondB = ref(true);

    const App = defineComponent(function () {
      return () => (
        <CheckboxGroup allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" data-testid="a" />
          <Checkbox.Root value="b" data-testid="b" />
          {showSecondB.value && <Checkbox.Root value="b" data-testid="second-b" />}
        </CheckboxGroup>
      );
    });

    await render(App);

    expect(screen.getByTestId('parent')).toHaveAttribute(
      'aria-controls',
      `${screen.getByTestId('a').id} ${screen.getByTestId('b').id} ${screen.getByTestId('second-b').id}`,
    );

    showSecondB.value = false;
    await flush();

    expect(screen.getByTestId('parent')).toHaveAttribute(
      'aria-controls',
      `${screen.getByTestId('a').id} ${screen.getByTestId('b').id}`,
    );
  });

  it('does not select a child without an identifying value', async () => {
    await render(CheckboxGroup, {
      allValues: ['a'],
      children: (
        <>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root id="standalone" data-testid="no-value" />
          <Checkbox.Root value="a" data-testid="checkbox-a" />
        </>
      ),
    });

    const parent = screen.getByTestId('parent');
    const noValue = screen.getByTestId('no-value');
    const checkboxA = screen.getByTestId('checkbox-a');

    fireEvent.click(parent);
    await flush();

    expect(parent).toHaveAttribute('aria-checked', 'true');
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');
    expect(noValue).toHaveAttribute('aria-checked', 'false');
  });

  it('preserves initial state if mixed when parent is clicked', async () => {
    const value = ref<string[]>([]);

    const App = defineComponent(function () {
      return () => (
        <CheckboxGroup value={value.value} onValueChange={(v) => (value.value = v)} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" data-testid="checkboxA" />
          <Checkbox.Root value="b" />
          <Checkbox.Root value="c" />
        </CheckboxGroup>
      );
    });

    await render(App);

    const checkboxes = screen
      .getAllByRole('checkbox')
      .filter((v) => v.getAttribute('data-parent') == null);
    const checkboxA = screen.getByTestId('checkboxA');
    const parent = screen.getByTestId('parent');

    fireEvent.click(checkboxA);
    await flush();

    expect(screen.getByTestId('parent')).toHaveAttribute('aria-checked', 'mixed');

    fireEvent.click(parent);
    await flush();

    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAttribute('aria-checked', 'true');
    });

    fireEvent.click(parent);
    await flush();

    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });

    fireEvent.click(parent);
    await flush();

    expect(parent).toHaveAttribute('aria-checked', 'mixed');
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');
    checkboxes.forEach((checkbox) => {
      if (checkbox !== checkboxA) {
        expect(checkbox).toHaveAttribute('aria-checked', 'false');
      }
    });
  });

  it('lets a parent checkbox cancel a parent-enabled group change', async () => {
    const handleValueChange = vi.fn();
    const handleParentChange = vi.fn((_, eventDetails: Checkbox.Root.ChangeEventDetails) => {
      eventDetails.cancel();
    });

    await render(CheckboxGroup, {
      allValues,
      onValueChange: handleValueChange,
      children: (
        <>
          <Checkbox.Root parent data-testid="parent" onCheckedChange={handleParentChange} />
          <Checkbox.Root value="a" data-testid="checkboxA" />
          <Checkbox.Root value="b" data-testid="checkboxB" />
          <Checkbox.Root value="c" data-testid="checkboxC" />
        </>
      ),
    });

    fireEvent.click(screen.getByTestId('parent'));
    await flush();

    expect(handleParentChange.mock.calls.length).toBe(1);
    expect(handleValueChange.mock.calls.length).toBe(0);
    expect(screen.getByTestId('parent')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('checkboxA')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('checkboxB')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('checkboxC')).toHaveAttribute('aria-checked', 'false');
  });

  it('lets a child checkbox cancel a parent-enabled group change', async () => {
    const handleValueChange = vi.fn();
    const handleChildChange = vi.fn((_, eventDetails: Checkbox.Root.ChangeEventDetails) => {
      eventDetails.cancel();
    });

    await render(CheckboxGroup, {
      allValues,
      onValueChange: handleValueChange,
      children: (
        <>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" data-testid="checkboxA" onCheckedChange={handleChildChange} />
          <Checkbox.Root value="b" />
          <Checkbox.Root value="c" />
        </>
      ),
    });

    fireEvent.click(screen.getByTestId('checkboxA'));
    await flush();

    expect(handleChildChange.mock.calls.length).toBe(1);
    expect(handleValueChange.mock.calls.length).toBe(0);
    expect(screen.getByTestId('parent')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('checkboxA')).toHaveAttribute('aria-checked', 'false');
  });

  it('handles unchecked disabled checkboxes', async () => {
    const value = ref<string[]>([]);

    const App = defineComponent(function () {
      return () => (
        <CheckboxGroup value={value.value} onValueChange={(v) => (value.value = v)} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" disabled data-testid="checkboxA" />
          <Checkbox.Root value="b" />
          <Checkbox.Root value="c" />
        </CheckboxGroup>
      );
    });

    await render(App);

    const parent = screen.getByTestId('parent');
    fireEvent.click(parent);
    await flush();

    expect(parent).toHaveAttribute('aria-checked', 'mixed');
    expect(screen.getByTestId('checkboxA')).toHaveAttribute('aria-checked', 'false');
  });

  it('handles checked disabled checkboxes', async () => {
    const value = ref<string[]>(['a']);

    const App = defineComponent(function () {
      return () => (
        <CheckboxGroup value={value.value} onValueChange={(v) => (value.value = v)} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" data-testid="checkboxA" disabled />
          <Checkbox.Root value="b" data-testid="checkboxB" />
          <Checkbox.Root value="c" />
        </CheckboxGroup>
      );
    });

    await render(App);

    const checkboxA = screen.getByTestId('checkboxA');
    const checkboxB = screen.getByTestId('checkboxB');
    const parent = screen.getByTestId('parent');

    fireEvent.click(parent);
    await flush();
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');
    expect(checkboxB).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(parent);
    await flush();
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');
    expect(checkboxB).toHaveAttribute('aria-checked', 'false');
  });
});
