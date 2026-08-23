import { DialogHandle } from '@/dialog/store/DialogHandle';

/**
 * Controls an Alert Dialog imperatively and associates detached `AlertDialog.Trigger` components
 * with an `AlertDialog.Root`. Create one with `AlertDialog.createHandle()` and pass it to the
 * `handle` prop of the root and of any triggers rendered outside of it.
 */
export class AlertDialogHandle<Payload> extends DialogHandle<Payload> {
  // Nominal brand: makes this handle type distinct from `DialogHandle` and sibling handles.
  private readonly __alertDialogBrand!: never;
}

/**
 * Creates a new handle to connect an AlertDialog.Root with detached AlertDialog.Trigger components.
 */
export function createAlertDialogHandle<Payload>(): AlertDialogHandle<Payload> {
  return new AlertDialogHandle<Payload>();
}
