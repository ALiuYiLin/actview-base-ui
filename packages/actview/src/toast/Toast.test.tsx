import { describe, expect, it, beforeAll, afterEach } from 'vitest';
import { ToastProvider } from '@/toast/provider/ToastProvider';
import { ToastViewport } from '@/toast/viewport/ToastViewport';
import { ToastRoot } from '@/toast/root/ToastRoot';
import { ToastContent } from '@/toast/content/ToastContent';
import { ToastTitle } from '@/toast/title/ToastTitle';
import { ToastDescription } from '@/toast/description/ToastDescription';
import { ToastClose } from '@/toast/close/ToastClose';
import { ToastAction } from '@/toast/action/ToastAction';
import { useToastManager } from '@/toast/useToastManager';
import { createToastManager } from '@/toast/createToastManager';
import { createRenderer } from '../../test/createRenderer';

beforeAll(() => {
  // jsdom doesn't fully implement PointerEvent
  (window as any).PointerEvent = window.MouseEvent;
});

afterEach(() => {
  document
    .querySelectorAll('[data-base-ui-portal], [data-base-ui-focus-guard]')
    .forEach((node) => node.remove());
});

const { render, fireEvent, waitFor } = createRenderer();

function ToastHost(props: any) {
  const { toasts, add } = useToastManager();
  return (
    <>
      <ToastViewport data-testid="viewport">
        {toasts.value.map((toast: any) => (
          <ToastRoot key={toast.id} toast={toast} data-testid={`toast-${toast.id}`}>
            <ToastTitle data-testid="title">{toast.title}</ToastTitle>
            <ToastDescription data-testid="description">{toast.description}</ToastDescription>
            <ToastContent data-testid="content">
              <ToastClose data-testid="close">Close</ToastClose>
              <ToastAction data-testid="action">Action</ToastAction>
            </ToastContent>
          </ToastRoot>
        ))}
      </ToastViewport>
      <button
        type="button"
        data-testid="add"
        onClick={() =>
          add(props.addOptions ?? { id: 'one', title: 'Hello', description: 'World' })
        }
      >
        Add
      </button>
    </>
  );
}

function ToastApp(props: any) {
  return (
    <ToastProvider
      timeout={props.timeout ?? 0}
      limit={props.limit ?? 3}
      toastManager={props.toastManager}
    >
      <ToastHost {...props} />
    </ToastProvider>
  );
}

function queryToast(): HTMLElement | null {
  return document.querySelector('[data-testid^="toast-"]');
}

// `waitFor` only retries when the callback throws, so a bare `waitFor(() => queryToast())`
// would return null immediately. Always assert inside the callback.
async function waitForToast() {
  await waitFor(() => {
    expect(queryToast()).not.toBeNull();
  });
}

describe('<Toast />', () => {
  it('renders nothing until a toast is added', async () => {
    await render(ToastApp);

    expect(document.querySelector('[data-testid="viewport"]')).not.toBeNull();
    expect(queryToast()).toBeNull();
  });

  it('renders the toast with its title, description and content after add', async () => {
    await render(ToastApp, {
      addOptions: { id: 'one', title: 'Hello', description: 'World', type: 'info' },
    });

    fireEvent.click(document.querySelector('[data-testid="add"]')!);

    await waitForToast();
    const toast = queryToast();
    expect(toast).not.toBeNull();
    expect(toast).toHaveAttribute('role', 'dialog');
    expect(toast).toHaveAttribute('tabindex', '0');
    expect(toast).toHaveAttribute('data-type', 'info');
    expect(document.querySelector('[data-testid="title"]')).toHaveTextContent('Hello');
    expect(document.querySelector('[data-testid="description"]')).toHaveTextContent('World');
    expect(document.querySelector('[data-testid="content"]')).not.toBeNull();
  });

  it('associates the title and description with the toast via aria attributes', async () => {
    await render(ToastApp, {
      addOptions: { id: 'one', title: 'Hello', description: 'World' },
    });

    fireEvent.click(document.querySelector('[data-testid="add"]')!);

    await waitForToast();
    const toast = queryToast();
    const title = document.querySelector('[data-testid="title"]')!;
    const description = document.querySelector('[data-testid="description"]')!;

    expect(title.tagName).toBe('H2');
    expect(description.tagName).toBe('P');
    expect(toast).toHaveAttribute('aria-labelledby', title.id);
    expect(toast).toHaveAttribute('aria-describedby', description.id);
  });

  it('marks excess toasts as limited based on the provider limit', async () => {
    const result = await render(ToastApp, {
      limit: 1,
      addOptions: { id: 'one', title: 'First' },
    });

    // First toast stays visible and is not limited.
    fireEvent.click(document.querySelector('[data-testid="add"]')!);
    await waitForToast();
    expect(document.querySelector('[data-testid="toast-one"]')).not.toHaveAttribute('data-limited');

    // Add a second toast: the oldest active toast becomes limited.
    await result.setProps({ limit: 1, addOptions: { id: 'two', title: 'Second' } });
    fireEvent.click(document.querySelector('[data-testid="add"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="toast-two"]')).not.toBeNull();
    });

    expect(document.querySelector('[data-testid="toast-two"]')).not.toHaveAttribute('data-limited');
    expect(document.querySelector('[data-testid="toast-one"]')).toHaveAttribute('data-limited');
  });

  it('closes the toast when the close button is clicked', async () => {
    await render(ToastApp, { addOptions: { id: 'one', title: 'Hello' } });

    fireEvent.click(document.querySelector('[data-testid="add"]')!);
    await waitForToast();

    fireEvent.click(document.querySelector('[data-testid="close"]')!);

    await waitFor(() => {
      expect(queryToast()).toBeNull();
    });
  });

  it('renders the action button and honors actionProps children', async () => {
    await render(ToastApp, {
      addOptions: { id: 'one', title: 'Hello', actionProps: { children: 'Custom action' } },
    });

    fireEvent.click(document.querySelector('[data-testid="add"]')!);
    await waitForToast();

    const action = document.querySelector('[data-testid="action"]')!;
    expect(action.tagName).toBe('BUTTON');
    expect(action).toHaveTextContent('Custom action');
  });

  it('marks toasts behind the frontmost toast', async () => {
    const result = await render(ToastApp, {
      addOptions: { id: 'one', title: 'First' },
    });

    fireEvent.click(document.querySelector('[data-testid="add"]')!);
    await waitForToast();

    await result.setProps({ addOptions: { id: 'two', title: 'Second' } });
    fireEvent.click(document.querySelector('[data-testid="add"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="toast-two"]')).not.toBeNull();
    });

    const behind = document.querySelector(
      '[data-testid="toast-one"] [data-testid="content"]',
    )!;
    expect(behind).toHaveAttribute('data-behind');
  });

  it('renders the viewport as a region', async () => {
    await render(ToastApp);

    const viewport = document.querySelector('[data-testid="viewport"]')!;
    expect(viewport).toHaveAttribute('role', 'region');
    expect(viewport).toHaveAttribute('aria-label', 'Notifications');
    expect(viewport).toHaveAttribute('aria-live', 'polite');
  });

  it('does not render the title element when it has no content', async () => {
    await render(ToastApp, {
      addOptions: { id: 'one', title: '', description: 'Only description' },
    });

    fireEvent.click(document.querySelector('[data-testid="add"]')!);
    await waitForToast();

    expect(document.querySelector('[data-testid="title"]')).toBeNull();
    expect(document.querySelector('[data-testid="description"]')).not.toBeNull();
  });

  it('supports a global toast manager outside the component tree', async () => {
    const manager = createToastManager();
    await render(ToastApp, { toastManager: manager, addOptions: {} });

    const id = manager.add({ id: 'global', title: 'From manager', description: 'Global' });

    await waitFor(() => {
      expect(document.querySelector('[data-testid="toast-global"]')).not.toBeNull();
    });

    manager.close(id);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="toast-global"]')).toBeNull();
    });
  });

  it('updates an existing toast in place', async () => {
    const manager = createToastManager();
    await render(ToastApp, { toastManager: manager, addOptions: {} });

    manager.add({ id: 'one', title: 'Before', timeout: 0 });
    await waitForToast();
    expect(document.querySelector('[data-testid="title"]')).toHaveTextContent('Before');

    manager.update('one', { title: 'After' });

    await waitFor(() => {
      expect(document.querySelector('[data-testid="title"]')).toHaveTextContent('After');
    });
  });

  it('sets the priority role to alertdialog for high-priority toasts', async () => {
    await render(ToastApp, {
      addOptions: { id: 'one', title: 'Hello', priority: 'high' },
    });

    fireEvent.click(document.querySelector('[data-testid="add"]')!);

    await waitForToast();
    const toast = queryToast();
    expect(toast).toHaveAttribute('role', 'alertdialog');
  });
});
