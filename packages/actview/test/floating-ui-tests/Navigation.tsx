import { defineComponent, ref } from '@actview/core';
import { flip, offset, shift } from '@floating-ui/dom';
import {
  FloatingFocusManager,
  FloatingNode,
  FloatingPortal,
  safePolygon,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useFocus,
  useHover,
  useInteractions,
  useMergeRefs,
} from '@floating-ui/actview';
import './Navigation.css?scoped';

interface SubItemProps {
  label: string;
  href: string;
}

/** @internal */
export const NavigationSubItem = defineComponent(function (props: SubItemProps & any) {
  return () => (
    <a {...props} href={props.href} className="SubItem">
      {props.label}
    </a>
  );
});

interface ItemProps {
  label: string;
  href: string;
  children?: any;
}

/** @internal */
export const NavigationItem = defineComponent(function (props: ItemProps) {
  const open = ref(false);
  const hasChildren = !!props.children;

  const nodeId = useFloatingNodeId();

  const { floatingStyles, refs, context } = useFloating({
    open,
    nodeId,
    onOpenChange: (o: boolean) => {
      open.value = o;
    },
    middleware: [offset(8), flip(), shift()],
    placement: 'right-start',
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, {
      enabled: hasChildren,
      handleClose: safePolygon(),
    }),
    useFocus(context, {
      enabled: hasChildren,
    }),
    useDismiss(context, {
      enabled: hasChildren,
    }),
  ]);

  const mergedReferenceRef = useMergeRefs([refs.setReference]);

  return () => (
    <FloatingNode id={nodeId.value}>
      <li>
        <a
          href={props.href}
          ref={mergedReferenceRef}
          className="Item"
          {...getReferenceProps(props as unknown as Record<string, unknown>)}
        >
          {props.label}
        </a>
      </li>
      <FloatingPortal>
        {open.value && (
          <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
            <div
              data-testid="subnavigation"
              ref={refs.setFloating}
              className="Subnav"
              style={floatingStyles.value}
              {...getFloatingProps()}
            >
              <button type="button" onClick={() => (open.value = false)}>
                Close
              </button>
              <ul className="SubnavList">{props.children}</ul>
            </div>
          </FloatingFocusManager>
        )}
      </FloatingPortal>
    </FloatingNode>
  );
});

interface NavigationProps {
  children?: any;
}

/** @internal */
export const Navigation = defineComponent(function (props: NavigationProps) {
  return () => (
    <nav>
      <ul>{props.children}</ul>
    </nav>
  );
});

/** @internal */
export const Main = defineComponent(function () {
  return () => (
    <>
      <h1 className="Heading">Navigation</h1>
      <div className="Container">
        <Navigation>
          <NavigationItem label="Home" href="#" />
          <NavigationItem label="Product" href="#">
            <NavigationSubItem label="Link 1" href="#" />
            <NavigationSubItem label="Link 2" href="#" />
            <NavigationSubItem label="Link 3" href="#" />
          </NavigationItem>
          <NavigationItem label="About" href="#" />
        </Navigation>
      </div>
    </>
  );
});
