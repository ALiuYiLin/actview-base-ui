import { describe, expect, it, vi, beforeAll, afterEach } from 'vitest';
import { MenuRoot } from '@/menu/root/MenuRoot';
import { MenuTrigger } from '@/menu/trigger/MenuTrigger';
import { MenuPortal } from '@/menu/portal/MenuPortal';
import { MenuPositioner } from '@/menu/positioner/MenuPositioner';
import { MenuPopup } from '@/menu/popup/MenuPopup';
import { MenuItem } from '@/menu/item/MenuItem';
import { MenuCheckboxItem } from '@/menu/checkbox-item/MenuCheckboxItem';
import { MenuCheckboxItemIndicator } from '@/menu/checkbox-item-indicator/MenuCheckboxItemIndicator';
import { MenuRadioGroup } from '@/menu/radio-group/MenuRadioGroup';
import { MenuRadioItem } from '@/menu/radio-item/MenuRadioItem';
import { MenuRadioItemIndicator } from '@/menu/radio-item-indicator/MenuRadioItemIndicator';
import { MenuLinkItem } from '@/menu/link-item/MenuLinkItem';
import { MenuGroup } from '@/menu/group/MenuGroup';
import { MenuGroupLabel } from '@/menu/group-label/MenuGroupLabel';
import { MenuSubmenuRoot } from '@/menu/submenu-root/MenuSubmenuRoot';
import { MenuSubmenuTrigger } from '@/menu/submenu-trigger/MenuSubmenuTrigger';
import { MenuArrow } from '@/menu/arrow/MenuArrow';
import { MenuBackdrop } from '@/menu/backdrop/MenuBackdrop';
import { createRenderer } from '#/test/createRenderer';

beforeAll(() => {
  // jsdom doesn't fully implement PointerEvent
  (window as any).PointerEvent = window.MouseEvent;
});

// `@actview/testing`'s `cleanup` removes the render container without running component
// unmount hooks, so portal nodes appended to `document.body` would leak between tests.
afterEach(() => {
  document
    .querySelectorAll('[data-base-ui-portal], [data-base-ui-focus-guard]')
    .forEach((node) => node.remove());
});

const { render, fireEvent, waitFor } = createRenderer();

// The popup is rendered through a portal into `document.body`, so queries scoped to the
// render container cannot see it. Use global document queries for the popup subtree.
function queryPopup(): HTMLElement | null {
  return document.querySelector('[data-testid="popup"]');
}

function querySubmenuPopup(): HTMLElement | null {
  return document.querySelector('[data-testid="submenu-popup"]');
}

function SimpleMenu(props: any) {
  return (
    <MenuRoot {...props}>
      <MenuTrigger data-testid="trigger">Toggle</MenuTrigger>
      <MenuPortal>
        <MenuPositioner>
          <MenuPopup data-testid="popup">
            <MenuItem data-testid="item-1">Item 1</MenuItem>
            <MenuItem data-testid="item-2">Item 2</MenuItem>
            <MenuItem data-testid="item-3">Item 3</MenuItem>
          </MenuPopup>
        </MenuPositioner>
      </MenuPortal>
    </MenuRoot>
  );
}

function CheckboxMenu(props: any) {
  return (
    <MenuRoot {...props}>
      <MenuTrigger data-testid="trigger">Toggle</MenuTrigger>
      <MenuPortal>
        <MenuPositioner>
          <MenuPopup data-testid="popup">
            <MenuCheckboxItem
              defaultChecked
              onCheckedChange={props.onCheckedChange}
              data-testid="check-item"
            >
              Checkbox
              <MenuCheckboxItemIndicator data-testid="check-indicator" />
            </MenuCheckboxItem>
          </MenuPopup>
        </MenuPositioner>
      </MenuPortal>
    </MenuRoot>
  );
}

function RadioMenu(props: any) {
  return (
    <MenuRoot {...props}>
      <MenuTrigger data-testid="trigger">Toggle</MenuTrigger>
      <MenuPortal>
        <MenuPositioner>
          <MenuPopup data-testid="popup">
            <MenuRadioGroup defaultValue="a" onValueChange={props.onValueChange}>
              <MenuRadioItem value="a" data-testid="radio-a">
                A
                <MenuRadioItemIndicator data-testid="radio-indicator-a" />
              </MenuRadioItem>
              <MenuRadioItem value="b" data-testid="radio-b">
                B
                <MenuRadioItemIndicator data-testid="radio-indicator-b" />
              </MenuRadioItem>
            </MenuRadioGroup>
          </MenuPopup>
        </MenuPositioner>
      </MenuPortal>
    </MenuRoot>
  );
}

function GroupMenu(props: any) {
  return (
    <MenuRoot {...props}>
      <MenuTrigger data-testid="trigger">Toggle</MenuTrigger>
      <MenuPortal>
        <MenuPositioner>
          <MenuPopup data-testid="popup">
            <MenuGroup>
              <MenuGroupLabel data-testid="group-label">Fruits</MenuGroupLabel>
              <MenuItem data-testid="item-1">Apple</MenuItem>
            </MenuGroup>
          </MenuPopup>
        </MenuPositioner>
      </MenuPortal>
    </MenuRoot>
  );
}

function SubmenuMenu(props: any) {
  return (
    <MenuRoot {...props}>
      <MenuTrigger data-testid="trigger">Toggle</MenuTrigger>
      <MenuPortal>
        <MenuPositioner>
          <MenuPopup data-testid="popup">
            <MenuItem data-testid="item-1">Item 1</MenuItem>
            <MenuSubmenuRoot>
              <MenuSubmenuTrigger data-testid="submenu-trigger" openOnHover={false}>
                More
              </MenuSubmenuTrigger>
              <MenuPortal>
                <MenuPositioner>
                  <MenuPopup data-testid="submenu-popup">
                    <MenuItem data-testid="submenu-item-1">Sub item 1</MenuItem>
                  </MenuPopup>
                </MenuPositioner>
              </MenuPortal>
            </MenuSubmenuRoot>
          </MenuPopup>
        </MenuPositioner>
      </MenuPortal>
    </MenuRoot>
  );
}

function ArrowMenu(props: any) {
  return (
    <MenuRoot {...props}>
      <MenuTrigger data-testid="trigger">Toggle</MenuTrigger>
      <MenuPortal>
        <MenuPositioner side="top" align="start">
          <MenuArrow data-testid="arrow" />
          <MenuPopup data-testid="popup">
            <MenuItem data-testid="item-1">Item 1</MenuItem>
          </MenuPopup>
        </MenuPositioner>
      </MenuPortal>
    </MenuRoot>
  );
}

function BackdropMenu(props: any) {
  return (
    <MenuRoot {...props}>
      <MenuTrigger data-testid="trigger">Toggle</MenuTrigger>
      <MenuPortal>
        <MenuPositioner>
          <MenuBackdrop data-testid="backdrop" />
          <MenuPopup data-testid="popup">
            <MenuItem data-testid="item-1">Item 1</MenuItem>
          </MenuPopup>
        </MenuPositioner>
      </MenuPortal>
    </MenuRoot>
  );
}

function LinkMenu(props: any) {
  return (
    <MenuRoot {...props}>
      <MenuTrigger data-testid="trigger">Toggle</MenuTrigger>
      <MenuPortal>
        <MenuPositioner>
          <MenuPopup data-testid="popup">
            <MenuLinkItem href="https://base-ui.com" data-testid="link-item">
              Base UI
            </MenuLinkItem>
          </MenuPopup>
        </MenuPositioner>
      </MenuPortal>
    </MenuRoot>
  );
}

describe('<Menu />', () => {
  it('renders nothing while closed', async () => {
    const result = await render(SimpleMenu, {});
    expect(queryPopup()).toBe(null);
    expect(result.queryByText('Item 1')).toBe(null);
  });

  it('opens on trigger mousedown', async () => {
    await render(SimpleMenu, {});
    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement;
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });
    const popup = queryPopup()!;
    expect(popup).toHaveAttribute('role', 'menu');
    expect(popup.querySelectorAll('[role="menuitem"]')).toHaveLength(3);
  });

  it('closes on a second trigger mousedown', async () => {
    await render(SimpleMenu, {});
    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement;
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).toBe(null);
    });
  });

  it('closes when an item is clicked (closeOnClick)', async () => {
    const onOpenChange = vi.fn();
    await render(SimpleMenu, { onOpenChange });
    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement;
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const item = queryPopup()!.querySelector('[data-testid="item-2"]') as HTMLElement;
    fireEvent.click(item);

    await waitFor(() => {
      expect(queryPopup()).toBe(null);
    });
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it('respects a controlled open prop', async () => {
    const onOpenChange = vi.fn();
    const result = await render(SimpleMenu, { open: false, onOpenChange });
    expect(queryPopup()).toBe(null);

    await result.setProps({ open: true });
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    await result.setProps({ open: false });
    await waitFor(() => {
      expect(queryPopup()).toBe(null);
    });
  });

  it('does not open when disabled', async () => {
    await render(SimpleMenu, { disabled: true });
    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement;
    fireEvent.mouseDown(trigger);
    // Give any erroneous open a chance to mount.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(queryPopup()).toBe(null);
  });

  it('changes the highlighted item using the arrow keys', async () => {
    await render(SimpleMenu, {});
    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement;
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const popup = queryPopup()!;
    const item1 = popup.querySelector('[data-testid="item-1"]') as HTMLElement;
    const item2 = popup.querySelector('[data-testid="item-2"]') as HTMLElement;

    fireEvent.keyDown(popup, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(item1).toHaveAttribute('data-highlighted', '');
    });

    fireEvent.keyDown(popup, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(item2).toHaveAttribute('data-highlighted', '');
    });
  });

  it('opens with the keyboard via Enter on the trigger', async () => {
    await render(SimpleMenu, {});
    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement;
    // jsdom does not synthesize the native button's Enter → click activation (AD-19), so the
    // browser behavior is simulated by dispatching the click manually.
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });
  });

  it('highlights items on hover', async () => {
    await render(SimpleMenu, {});
    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement;
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const item = queryPopup()!.querySelector('[data-testid="item-2"]') as HTMLElement;
    fireEvent.mouseMove(item);
    await waitFor(() => {
      expect(item).toHaveAttribute('data-highlighted', '');
    });
  });

  it('toggles a checkbox item and updates the indicator', async () => {
    const onCheckedChange = vi.fn();
    await render(CheckboxMenu, { onCheckedChange });
    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement;
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const item = queryPopup()!.querySelector('[data-testid="check-item"]') as HTMLElement;
    expect(item).toHaveAttribute('role', 'menuitemcheckbox');
    expect(item).toHaveAttribute('aria-checked', 'true');
    expect(queryPopup()!.querySelector('[data-testid="check-indicator"]')).not.toBe(null);

    fireEvent.click(item);
    await waitFor(() => {
      expect(onCheckedChange).toHaveBeenCalledWith(false, expect.anything());
    });
    expect(item).toHaveAttribute('aria-checked', 'false');
  });

  it('selects a radio item and updates the indicator', async () => {
    const onValueChange = vi.fn();
    await render(RadioMenu, { onValueChange });
    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement;
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const radioA = queryPopup()!.querySelector('[data-testid="radio-a"]') as HTMLElement;
    const radioB = queryPopup()!.querySelector('[data-testid="radio-b"]') as HTMLElement;
    expect(radioA).toHaveAttribute('aria-checked', 'true');
    expect(queryPopup()!.querySelector('[data-testid="radio-indicator-a"]')).not.toBe(null);

    fireEvent.click(radioB);
    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith('b', expect.anything());
    });
    expect(radioB).toHaveAttribute('aria-checked', 'true');
  });

  it('renders a link item with role menuitem', async () => {
    await render(LinkMenu, {});
    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement;
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const link = queryPopup()!.querySelector('[data-testid="link-item"]') as HTMLElement;
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('role', 'menuitem');
    expect(link).toHaveAttribute('href', 'https://base-ui.com');
  });

  it('associates a group label with the group', async () => {
    await render(GroupMenu, {});
    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement;
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const label = queryPopup()!.querySelector('[data-testid="group-label"]') as HTMLElement;
    const group = queryPopup()!.querySelector('[role="group"]') as HTMLElement;
    expect(group).toHaveAttribute('aria-labelledby', label.id);
  });

  it('opens a submenu on trigger mousedown', async () => {
    await render(SubmenuMenu, {});
    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement;
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const submenuTrigger = queryPopup()!.querySelector(
      '[data-testid="submenu-trigger"]',
    ) as HTMLElement;
    fireEvent.mouseDown(submenuTrigger);
    await waitFor(() => {
      expect(querySubmenuPopup()).not.toBe(null);
    });
    expect(
      querySubmenuPopup()!.querySelector('[data-testid="submenu-item-1"]'),
    ).not.toBe(null);
  });

  it('renders the arrow with the open state', async () => {
    await render(ArrowMenu, {});
    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement;
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const arrow = document.querySelector('[data-testid="arrow"]') as HTMLElement;
    expect(arrow).not.toBe(null);
    expect(arrow).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the backdrop when the menu is open', async () => {
    await render(BackdropMenu, {});
    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement;
    fireEvent.mouseDown(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    const backdrop = document.querySelector('[data-testid="backdrop"]') as HTMLElement;
    expect(backdrop).not.toBe(null);
    expect(backdrop).toHaveAttribute('role', 'presentation');
  });
});
