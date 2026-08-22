import type { MenuRoot } from '@/menu/root/MenuRoot';

export interface MenuOpenEventDetails {
  open: boolean;
  reason: MenuRoot.ChangeEventReason | null;
  nodeId: string | undefined;
  parentNodeId: string | null;
}
