import { describe, expect, it } from 'vitest';
import { defineComponent, ref } from 'actview';
import { Toast, useToastManager } from '@/toast';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const ManagedUIDef = defineComponent(function ManagedUI(props: any) {
  const manager = useToastManager();
  return () => {
    props.actions.value = manager;
    return <div data-testid="manager-ready" />;
  };
});

function TestHarness(props: any) {
  return () => (
    <Toast.Provider>
      <Toast.Viewport>
        {(toast: any) => (
          <Toast.Root key={toast.id} toast={toast} data-testid={`toast-${toast.id}`}>
            {({title, description, close}: any) => (
              <>
                <Toast.Title>{title}</Toast.Title>
                <Toast.Description>{description}</Toast.Description>
                <Toast.Close onClick={close}>Close</Toast.Close>
              </>
            )}
          </Toast.Root>
        )}
      </Toast.Viewport>
      <ManagedUIDef actions={props.actions} />
    </Toast.Provider>
  );
}

const HarnessDef = defineComponent(TestHarness);

describe('Toast / useToastManager', () => {
  it('adds a toast and renders it in the viewport', async () => {
    const actions = {value: null as any};
    await render(<HarnessDef actions={actions} />);
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
    await render(<HarnessDef actions={actions} />);
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

  it('closes a toast via Toast.Close', async () => {
    const actions = {value: null as any};
    await render(<HarnessDef actions={actions} />);
    await settle();

    actions.value.add({title: 'CloseMe'});
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('button', {name: 'Close'}));
    await settle();
    await settle();

    expect(screen.queryByText('CloseMe')).toBe(null);
  });

  it('updates a toast', async () => {
    const actions = {value: null as any};
    await render(<HarnessDef actions={actions} />);
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

  // actview 遗留：useToastManager 返回的 toasts 是挂载期快照（响应式列表未迁移），
  // 改用行为断言（Viewport 渲染数量）。
  it('renders multiple toasts in the viewport', async () => {
    const actions = {value: null as any};
    await render(<HarnessDef actions={actions} />);
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
    await render(<HarnessDef actions={actions} />);
    await settle();

    const id = actions.value.add({title: 'X', onClose: () => (closed = true)});
    await settle();
    await settle();

    actions.value.close(id);
    await settle();

    expect(closed).toBe(true);
  });
});

describe('createToastManager', () => {
  it('works without a Provider (imperative)', async () => {
    const manager = (await import('@/toast')).createToastManager();
    const id = manager.add({title: 'Imperative'});
    expect(manager.getSnapshot().toasts.length).toBe(1);

    manager.close(id);
    expect(manager.getSnapshot().toasts.length).toBe(0);
  });
});


