import { describe, expect, it } from 'vitest';
import { defineComponent } from 'actview';
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
            {({title, close}: any) => (
              <>
                <Toast.Title>{title}</Toast.Title>
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

describe('<Toast.Close />', () => {
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
});
