import { defineComponent, ref } from '@actview/core';
import { flip, offset, shift, type Placement } from '@floating-ui/dom';
import {
  FloatingFocusManager,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  safePolygon,
  useClick,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useHover,
  useId,
  useInteractions,
} from '@actview/floating-ui';
import { Button } from './Button';
import './Popover.css?scoped';

interface RenderData {
  close: () => void;
  labelId: string;
  descriptionId: string;
}

interface Props {
  render: (data: RenderData) => any;
  placement?: Placement;
  modal?: boolean;
  children?: any;
  bubbles?: boolean;
  hover?: boolean;
}

const PopoverComponent = defineComponent(function (props: Props) {
  const open = ref(false);

  const nodeId = useFloatingNodeId();
  const { floatingStyles, refs, context } = useFloating({
    nodeId,
    open,
    placement: props.placement,
    onOpenChange: (o: boolean) => {
      open.value = o;
    },
    middleware: [offset(10), flip(), shift()],
  });

  const id = useId();
  const labelId = `${id.value}-label`;
  const descriptionId = `${id.value}-description`;
  const triggerId = `${id.value}-trigger`;

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, {
      enabled: props.hover ?? false,
      handleClose: safePolygon({ blockPointerEvents: true }),
    }),
    useClick(context),
    useDismiss(context, {
      bubbles: props.bubbles ?? true,
    }),
  ]);

  return () => {
    const child = props.children;
    // cloneElement(children, getReferenceProps({ref, aria-*})) 的 actview
    // 等价：重建 VNode 并合并 reference props。
    const clonedChild = child
      ? {
          ...child,
          props: {
            ...child.props,
            ...getReferenceProps({
              ref: refs.setReference,
              id: triggerId,
              'aria-haspopup': 'dialog',
              'aria-expanded': open.value,
              'aria-controls': open.value ? context.floatingId.value : undefined,
              'data-open': open.value ? '' : undefined,
            }),
          },
        }
      : null;

    return (
      <FloatingNode id={nodeId.value}>
        {clonedChild}
        <FloatingPortal>
          {open.value && (
            <FloatingFocusManager context={context} modal={props.modal ?? true}>
              <div
                className="Floating"
                ref={refs.setFloating}
                style={floatingStyles.value}
                id={context.floatingId.value}
                role="dialog"
                aria-labelledby={labelId}
                aria-describedby={descriptionId}
                {...getFloatingProps()}
              >
                {props.render({
                  labelId,
                  descriptionId,
                  close: () => {
                    open.value = false;
                  },
                })}
              </div>
            </FloatingFocusManager>
          )}
        </FloatingPortal>
      </FloatingNode>
    );
  };
});

/** @internal */
export const Popover = defineComponent(function (props: Props) {
  // useFloatingParentNodeId 返回 string | null（非 Ref）
  const parentId = useFloatingParentNodeId();

  // This is a root, so we wrap it with the tree
  if (parentId === null) {
    return () => (
      <FloatingTree>
        <PopoverComponent {...props} />
      </FloatingTree>
    );
  }

  return () => <PopoverComponent {...props} />;
});

/** @internal */
export const Main = defineComponent(function () {
  return () => (
    <>
      <h1 className="Heading">Popover</h1>
      <div className="Container">
        <Popover
          modal
          bubbles
          render={({ labelId, descriptionId, close }) => (
            <>
              <h2 id={labelId} className="Title">
                Title
              </h2>
              <p id={descriptionId} className="Description">
                Description
              </p>
              <Popover
                modal
                bubbles
                render={({ labelId, descriptionId, close }) => (
                  <>
                    <h2 id={labelId} className="Title">
                      Title
                    </h2>
                    <p id={descriptionId} className="Description">
                      Description
                    </p>
                    <Popover
                      modal
                      bubbles={false}
                      render={({ labelId, descriptionId, close }) => (
                        <>
                          <h2 id={labelId} className="Title">
                            Title
                          </h2>
                          <p id={descriptionId} className="Description">
                            Description
                          </p>
                          <button type="button" onClick={close} className="CloseButton">
                            Close
                          </button>
                        </>
                      )}
                    >
                      <Button>My button</Button>
                    </Popover>
                    <button type="button" onClick={close} className="CloseButton">
                      Close
                    </button>
                  </>
                )}
              >
                <Button>My button</Button>
              </Popover>
              <button type="button" onClick={close} className="CloseButton">
                Close
              </button>
            </>
          )}
        >
          <Button>My button</Button>
        </Popover>
      </div>
    </>
  );
});
