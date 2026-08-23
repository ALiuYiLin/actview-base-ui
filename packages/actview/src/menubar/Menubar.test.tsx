import { describe, expect, it } from 'vitest';
import { defineComponent, ref } from 'actview';
import { Menubar } from '@/menubar';
import { useMenubarContext } from '@/menubar/MenubarContext';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const Root = Menubar.Root;

const ContextReaderDef = defineComponent(function ContextReader(props: any) {
  const context = useMenubarContext(true);
  return () => (
    <div
      data-testid="reader"
      data-orientation={context?.orientation ?? 'missing'}
      data-modal={String(context?.modal)}
      data-submenu={String(context?.hasSubmenuOpen)}
    />
  );
});

describe('<Root />', () => { it('renders with role menubar', async () => {
    await render(<Root data-testid="menubar">Item</Root>);
    await settle();

    expect(screen.getByTestId('menubar')).toHaveAttribute('role', 'menubar');
  });

  it('sets data-orientation to horizontal by default', async () => {
    await render(<Root data-testid="menubar">Item</Root>);
    await settle();

    expect(screen.getByTestId('menubar')).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('sets data-orientation to vertical', async () => {
    await render(<Root orientation="vertical" data-testid="menubar">Item</Root>);
    await settle();

    expect(screen.getByTestId('menubar')).toHaveAttribute('data-orientation', 'vertical');
    expect(screen.getByTestId('menubar')).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('adds data-modal when modal', async () => {
    await render(<Root modal data-testid="menubar">Item</Root>);
    await settle();

    expect(screen.getByTestId('menubar')).toHaveAttribute('data-modal');
  });

  it('does not add data-modal by default', async () => {
    await render(<Root data-testid="menubar">Item</Root>);
    await settle();

    expect(screen.getByTestId('menubar')).not.toHaveAttribute('data-modal');
  });

  it('renders children', async () => {
    await render(<Root><button>File</button><button>Edit</button></Root>);
    await settle();

    expect(screen.getByRole('button', {name: 'File'})).not.toBe(null);
    expect(screen.getByRole('button', {name: 'Edit'})).not.toBe(null);
  });

  it('provides orientation through context', async () => {
    await render(
      <Root orientation="vertical">
        <ContextReaderDef />
      </Root>,
    );
    await settle();

    expect(screen.getByTestId('reader')).toHaveAttribute('data-orientation', 'vertical');
    expect(screen.getByTestId('reader')).toHaveAttribute('data-modal', 'false');
    expect(screen.getByTestId('reader')).toHaveAttribute('data-submenu', 'false');
  });

  it('supports the children render function with state', async () => {
    await render(
      <Root modal>
        {(state: any) => <div data-testid={`state-${state.modal}-${state.orientation}`} />}
      </Root>,
    );
    await settle();

    expect(screen.getByTestId('state-true-horizontal')).not.toBe(null);
  });
});





