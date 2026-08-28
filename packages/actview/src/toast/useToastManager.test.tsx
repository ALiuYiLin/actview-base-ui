import { describe, expect, it } from 'vitest';
import { watch } from 'actview';
import { Toast, useToastManager } from '@/toast';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function ManagedUI(props: any) {
  const manager = useToastManager();
  watch(
    () => manager,
    () => {
      props.actions.value = manager;
    },
    {immediate: true},
  );
  return <div data-testid="manager-ready" />;
}

function TestHarness(props: any) {
  return (
    <Toast.Provider>
      <Toast.Viewport>
        {(toast: any) => (
          <Toast.Root key={toast.id} toast={toast} data-testid={`toast-${toast.id}`}>
            {({title, description}: any) => (
              <>
                <Toast.Title>{title}</Toast.Title>
                <Toast.Description>{description}</Toast.Description>
              </>
            )}
          </Toast.Root>
        )}
      </Toast.Viewport>
      <ManagedUI actions={props.actions} />
    </Toast.Provider>
  );
}


describe('useToastManager', () => {
  it('adds a toast and renders it in the viewport', async () => {
    const actions = {value: null as any};
    await render(<TestHarness actions={actions} />);
    await settle();

    expect(screen.queryByText('Hello')).toBe(null);

    const id = actions.value.add({title: 'Hello', description: 'World'});
    await settle();
    await settle();

    expect(screen.getByText('Hello')).not.toBe(null);
    expect(screen.getByText('World')).not.toBe(null);
    expect(screen.getByTestId(`toast-${id}`)).not.toBe(null);
  });

  it('closes a toast by id', async () => {
    const actions = {value: null as any};
    await render(<TestHarness actions={actions} />);
    await settle();

    const id = actions.value.add({title: 'Temp'});
    await settle();
    await settle();
    expect(screen.getByText('Temp')).not.toBe(null);

    actions.value.close(id);
    await settle();
    await settle();

    expect(screen.queryByText('Temp')).toBe(null);
  });

  it('updates a toast', async () => {
    const actions = {value: null as any};
    await render(<TestHarness actions={actions} />);
    await settle();

    const id = actions.value.add({title: 'Before'});
    await settle();
    await settle();

    actions.value.update(id, {title: 'After'});
    await settle();
    await settle();

    expect(screen.queryByText('Before')).toBe(null);
    expect(screen.getByText('After')).not.toBe(null);
  });

  it('renders multiple toasts in the viewport', async () => {
    const actions = {value: null as any};
    await render(<TestHarness actions={actions} />);
    await settle();

    actions.value.add({title: 'One'});
    actions.value.add({title: 'Two'});
    await settle();
    await settle();

    expect(screen.getByText('One')).not.toBe(null);
    expect(screen.getByText('Two')).not.toBe(null);
  });

  it('calls onClose when a toast is closed', async () => {
    let closed = false;
    const actions = {value: null as any};
    await render(<TestHarness actions={actions} />);
    await settle();

    const id = actions.value.add({title: 'X', onClose: () => (closed = true)});
    await settle();
    await settle();

    actions.value.close(id);
    await settle();

    expect(closed).toBe(true);
  });
});
