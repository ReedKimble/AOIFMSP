import { useEffect, useMemo, useRef, useState } from "react";

import type { TechnicianHomeResponse, WorkflowAvailableAction, WorkflowDetailResponse, WorkflowListItem } from "../api";
import type { JsonObject, JsonValue, WorkflowTriggerType } from "../../../../src/data-layer/common";
import type {
  AIAgentWorkflowNode,
  ConditionWorkflowNode,
  ConnectorActionWorkflowNode,
  JavaScriptWorkflowNode,
  VariableWorkflowNode,
  WorkflowAnnotation,
  WorkflowCanvasPosition,
  WorkflowDocument,
  WorkflowEdge,
  WorkflowEdgeType,
  WorkflowErrorHandlingPolicy,
  WorkflowNode,
  WorkflowNodeGroup,
  WorkflowNodeType,
} from "../../../../src/data-layer/workflows";

interface WorkflowStudioProps {
  detail: WorkflowDetailResponse | null;
  draft: WorkflowDocument | null;
  workflows: WorkflowListItem[];
  highlightedTicket: TechnicianHomeResponse["highlightedTicket"];
  busyIntent: string | null;
  selectedNodeId: string | null;
  isDirty: boolean;
  onSelectWorkflow: (workflowId: string) => void;
  onSelectNode: (nodeId: string | null) => void;
  onDraftChange: (draft: WorkflowDocument) => void;
  onSave: () => void;
  onInsertBuiltInNode: (nodeType: "condition" | "javascript" | "ai-agent" | "variable") => void;
  onInsertActionNode: (action: WorkflowAvailableAction) => void;
  onZoomChange: (zoom: number) => void;
  onSceneStateChange: (snapshot: WorkflowSceneSnapshot) => void;
}

interface WorkflowDragState {
  nodeId: string;
  selectedNodeIds: string[];
  pointerOriginX: number;
  pointerOriginY: number;
  originPositions: Record<string, WorkflowCanvasPosition>;
}

interface WorkflowPanState {
  pointerOriginX: number;
  pointerOriginY: number;
  scrollOriginLeft: number;
  scrollOriginTop: number;
}

interface WorkflowViewportState {
  scrollLeft: number;
  scrollTop: number;
  clientWidth: number;
  clientHeight: number;
}


interface WorkflowConnectionDragState {
  sourceNodeId: string;
  sourcePort: WorkflowEdgeType;
  pointerX: number;
  pointerY: number;
  edgeId?: string;
  reconnectEnd?: "source" | "target";
  targetNodeId?: string;
}

interface WorkflowMarqueeState {
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
  additive: boolean;
  baseNodeIds: string[];
}

interface WorkflowContextMenuState {
  kind: "canvas" | "node" | "edge" | "group";
  viewportX: number;
  viewportY: number;
  canvasX: number;
  canvasY: number;
  nodeId?: string;
  edgeId?: string;
  groupId?: string;
}

interface WorkflowContextAction {
  id: string;
  label: string;
}

export interface WorkflowSceneSnapshot {
  workflowId?: string | undefined;
  workflowDisplayName: string;
  selectedNodeId: string | null;
  selectedNodeLabel?: string | undefined;
  selectedNodeType?: WorkflowNodeType | undefined;
  triggerType?: WorkflowTriggerType | undefined;
  triggerSummary?: string | undefined;
  nodeCount: number;
  edgeCount: number;
  zoom: number;
  isDirty: boolean;
}

const NODE_WIDTH = 216;
const NODE_HEIGHT = 80;
const CANVAS_PADDING = 120;
const GRID_SIZE = 24;
const BRANCH_ROW_OFFSET = 168;

export function WorkflowStudio({
  detail,
  draft,
  workflows,
  highlightedTicket,
  busyIntent,
  selectedNodeId,
  isDirty,
  onSelectWorkflow,
  onSelectNode,
  onDraftChange,
  onSave,
  onInsertBuiltInNode,
  onInsertActionNode,
  onZoomChange,
  onSceneStateChange,
}: WorkflowStudioProps) {
  const [dragState, setDragState] = useState<WorkflowDragState | null>(null);
  const [panState, setPanState] = useState<WorkflowPanState | null>(null);
  const [connectionDragState, setConnectionDragState] = useState<WorkflowConnectionDragState | null>(null);
  const [marqueeState, setMarqueeState] = useState<WorkflowMarqueeState | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(selectedNodeId ? [selectedNodeId] : []);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [contextMenuState, setContextMenuState] = useState<WorkflowContextMenuState | null>(null);
  const [viewportState, setViewportState] = useState<WorkflowViewportState>({
    scrollLeft: 0,
    scrollTop: 0,
    clientWidth: 0,
    clientHeight: 0,
  });
  const [spacePressed, setSpacePressed] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const groups = draft?.groups ?? [];
  const annotations = draft?.annotations ?? [];
  const selectedNodes = useMemo(
    () => (draft ? draft.nodes.filter((node) => selectedNodeIds.includes(node.id)) : []),
    [draft, selectedNodeIds],
  );
  const selectedNode = useMemo(
    () => selectedNodes[0] ?? draft?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [draft, selectedNodeId, selectedNodes],
  );
  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );
  const selectedAnnotation = useMemo(
    () => annotations.find((annotation) => annotation.id === selectedAnnotationId) ?? null,
    [annotations, selectedAnnotationId],
  );
  const selectedNodeEdges = useMemo(
    () => (selectedNode ? draft?.edges.filter((edge) => edge.sourceNodeId === selectedNode.id) ?? [] : []),
    [draft, selectedNode],
  );
  const selectedEdge = useMemo(
    () => draft?.edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [draft, selectedEdgeId],
  );
  const collapsedGroups = useMemo(() => groups.filter((group) => group.collapsed), [groups]);
  const collapsedGroupNodeIds = useMemo(() => new Set(collapsedGroups.flatMap((group) => group.nodeIds)), [collapsedGroups]);
  const visibleNodes = useMemo(() => (draft?.nodes ?? []).filter((node) => !collapsedGroupNodeIds.has(node.id)), [draft, collapsedGroupNodeIds]);
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleAnnotations = useMemo(
    () => annotations.filter((annotation) => !(annotation.groupId && collapsedGroups.some((group) => group.id === annotation.groupId)) && !(annotation.nodeIds?.some((nodeId) => collapsedGroupNodeIds.has(nodeId)) ?? false)),
    [annotations, collapsedGroupNodeIds, collapsedGroups],
  );
  const isMultiSelection = selectedNodeIds.length > 1;

  const zoom = clampZoom(getZoomValue(draft));
  const connectorActionPalette = useMemo(() => groupActionsByConnector(detail?.availableActions ?? []), [detail?.availableActions]);
  const triggerCapableActions = useMemo(() => (detail?.availableActions ?? []).filter((action) => action.isTriggerCapable), [detail?.availableActions]);
  const canvasSize = useMemo(() => calculateCanvasSize(draft), [draft]);
  const contextMenuActions = useMemo(() => {
    if (!contextMenuState) {
      return [] as WorkflowContextAction[];
    }

    if (contextMenuState.kind === "canvas") {
      return [
        { id: "canvas-note", label: "Canvas Note" },
        { id: "canvas-fit", label: "Frame" },
        ...(draft?.nodes[0] ? [{ id: "canvas-focus-trigger", label: "Focus Start" }] : []),
      ];
    }

    if (contextMenuState.kind === "node") {
      const node = draft?.nodes.find((item) => item.id === contextMenuState.nodeId);
      if (!node) {
        return [] as WorkflowContextAction[];
      }

      const existingEdges = draft?.edges.filter((edge) => edge.sourceNodeId === node.id) ?? [];
      const routeActions = getNodePortLabels(node).map((port) => {
        const existingEdge = existingEdges.find((edge) => (edge.sourcePort ?? edge.edgeType ?? "success") === port);
        return existingEdge
          ? { id: `node-route-focus:${port}`, label: port === "success" ? "Follow Next" : `Follow ${toDisplay(port)}` }
          : { id: `node-route-add:${port}`, label: port === "success" ? "Add Next" : `Add ${toDisplay(port)}` };
      });
      const currentPolicy = node.errorHandling?.strategy ?? draft?.errorHandling.defaultNodePolicy.strategy;

      return [
        { id: "node-focus", label: "Focus" },
        ...routeActions,
        currentPolicy === "retry" ? { id: "node-policy-fail", label: "Fail Errors" } : { id: "node-policy-retry", label: "Retry Errors" },
        { id: "node-note", label: "Step Note" },
        { id: "node-delete", label: "Delete" },
      ];
    }

    if (contextMenuState.kind === "edge") {
      const edge = draft?.edges.find((item) => item.id === contextMenuState.edgeId);
      return [
        ...(edge ? [{ id: "edge-focus-source", label: "Source" }, { id: "edge-focus-target", label: "Target" }] : []),
        { id: "edge-reconnect-source", label: "Reconnect From" },
        { id: "edge-reconnect-target", label: "Reconnect To" },
        { id: "edge-note", label: "Route Note" },
        { id: "edge-delete", label: "Delete" },
      ];
    }

    const group = groups.find((item) => item.id === contextMenuState.groupId);
    return [
      { id: "group-toggle", label: group?.collapsed ? "Expand" : "Collapse" },
      { id: "group-frame", label: "Frame" },
      { id: "group-select-nodes", label: "Select Steps" },
      { id: "group-note", label: "Step Note" },
      { id: "group-delete", label: "Delete" },
    ];
  }, [contextMenuState, draft, groups]);
  const contextMenuRadius = useMemo(() => {
    if (contextMenuActions.length >= 7) {
      return 112;
    }
    if (contextMenuActions.length >= 5) {
      return 96;
    }
    return 84;
  }, [contextMenuActions.length]);
  const contextMenuTitle = useMemo(() => {
    if (!contextMenuState) {
      return "";
    }

    if (contextMenuState.kind === "node" && contextMenuState.nodeId) {
      const node = draft?.nodes.find((item) => item.id === contextMenuState.nodeId);
      return node?.label ?? toDisplay(contextMenuState.kind);
    }

    if (contextMenuState.kind === "edge" && contextMenuState.edgeId) {
      const edge = draft?.edges.find((item) => item.id === contextMenuState.edgeId);
      return edge ? getEdgeDisplayLabel(edge) ?? "Route" : "Route";
    }

    if (contextMenuState.kind === "group" && contextMenuState.groupId) {
      const group = groups.find((item) => item.id === contextMenuState.groupId);
      return group?.label ?? "Group";
    }

    return "Canvas";
  }, [contextMenuState, draft, groups]);

  useEffect(() => {
    setSelectedEdgeId(null);
    setSelectedGroupId(null);
    setSelectedAnnotationId(null);
    setSelectedNodeIds(selectedNodeId ? [selectedNodeId] : draft?.nodes[0] ? [draft.nodes[0].id] : []);
  }, [detail?.workflow.id]);

  useEffect(() => {
    if (!draft) {
      setSelectedNodeIds([]);
      return;
    }

    if (selectedNodeId) {
      setSelectedNodeIds([selectedNodeId]);
      return;
    }

    setSelectedNodeIds((current) => {
      const valid = current.filter((nodeId) => draft.nodes.some((node) => node.id === nodeId));
      if (valid.length > 0 || selectedEdgeId || selectedGroupId || selectedAnnotationId) {
        return valid;
      }

      return draft.nodes[0] ? [draft.nodes[0].id] : [];
    });
  }, [draft, selectedAnnotationId, selectedEdgeId, selectedGroupId, selectedNodeId]);

  const selectNodes = (nodeIds: string[]) => {
    setSelectedNodeIds(nodeIds);
    setSelectedEdgeId(null);
    setSelectedGroupId(null);
    setSelectedAnnotationId(null);
    onSelectNode(nodeIds[0] ?? null);
  };

  const selectEdge = (edgeId: string | null) => {
    setSelectedEdgeId(edgeId);
    setSelectedNodeIds([]);
    setSelectedGroupId(null);
    setSelectedAnnotationId(null);
    onSelectNode(null);
  };

  const selectGroup = (groupId: string | null) => {
    setSelectedGroupId(groupId);
    setSelectedEdgeId(null);
    setSelectedAnnotationId(null);
    setSelectedNodeIds([]);
    onSelectNode(null);
  };

  const selectAnnotation = (annotationId: string | null) => {
    setSelectedAnnotationId(annotationId);
    setSelectedGroupId(null);
    setSelectedEdgeId(null);
    setSelectedNodeIds([]);
    onSelectNode(null);
  };

  const clearCanvasSelection = () => {
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    setSelectedGroupId(null);
    setSelectedAnnotationId(null);
    onSelectNode(null);
  };

  const closeContextMenu = () => {
    setContextMenuState(null);
  };

  const openContextMenu = (
    event: { clientX: number; clientY: number; preventDefault: () => void; stopPropagation: () => void },
    state: Omit<WorkflowContextMenuState, "viewportX" | "viewportY" | "canvasX" | "canvasY">,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const viewportRect = viewportRef.current?.getBoundingClientRect();
    const canvasPoint = screenToCanvasPoint(event.clientX, event.clientY);
    setContextMenuState({
      ...state,
      viewportX: Math.max(24, event.clientX - (viewportRect?.left ?? 0)),
      viewportY: Math.max(24, event.clientY - (viewportRect?.top ?? 0)),
      canvasX: canvasPoint.x,
      canvasY: canvasPoint.y,
    });
  };

  const startEdgeReconnect = (edge: WorkflowEdge, reconnectEnd: "source" | "target", clientX: number, clientY: number) => {
    const point = screenToCanvasPoint(clientX, clientY);
    setConnectionDragState({
      sourceNodeId: edge.sourceNodeId,
      sourcePort: (edge.sourcePort ?? edge.edgeType ?? "success") as WorkflowEdgeType,
      pointerX: point.x,
      pointerY: point.y,
      edgeId: edge.id,
      reconnectEnd,
      targetNodeId: edge.targetNodeId,
    });
    selectEdge(edge.id);
    closeContextMenu();
  };

  const toggleGroupCollapsed = (groupId: string) => {
    if (!draft) {
      return;
    }

    const group = groups.find((item) => item.id === groupId);
    if (!group) {
      return;
    }

    const bounds = getGroupBounds(group, draft.nodes);
    onDraftChange(
      updateGroupInDraft(draft, groupId, (item) => ({
        ...item,
        collapsed: !item.collapsed,
        ...(bounds ? { bounds } : {}),
      })),
    );
    selectGroup(groupId);
    closeContextMenu();
  };

  const syncViewportState = () => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    setViewportState({
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
      clientWidth: viewport.clientWidth,
      clientHeight: viewport.clientHeight,
    });
  };

  const centerCanvasPoint = (
    x: number,
    y: number,
    targetZoom = zoom,
    behavior: ScrollBehavior = "smooth",
  ) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTo({
      left: Math.max(0, x * targetZoom - viewport.clientWidth / 2),
      top: Math.max(0, y * targetZoom - viewport.clientHeight / 2),
      behavior,
    });
  };

  const centerNodeInViewport = (nodeId: string, targetZoom = zoom, behavior: ScrollBehavior = "smooth") => {
    const node = draft?.nodes.find((item) => item.id === nodeId);
    if (!node?.position) {
      return;
    }

    centerCanvasPoint(node.position.x + NODE_WIDTH / 2, node.position.y + NODE_HEIGHT / 2, targetZoom, behavior);
  };

  const screenToCanvasPoint = (clientX: number, clientY: number): WorkflowCanvasPosition => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return { x: 0, y: 0 };
    }

    const rect = viewport.getBoundingClientRect();
    return {
      x: (viewport.scrollLeft + clientX - rect.left) / zoom,
      y: (viewport.scrollTop + clientY - rect.top) / zoom,
    };
  };

  const fitCanvasToViewport = () => {
    const viewport = viewportRef.current;
    if (!viewport || !draft) {
      return;
    }

    const bounds = getWorkflowBounds(draft);
    const nextZoom = clampZoom(
      Math.min((viewport.clientWidth - 96) / bounds.width, (viewport.clientHeight - 96) / bounds.height, 1.05),
    );

    onZoomChange(nextZoom);
    window.setTimeout(() => {
      centerCanvasPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, nextZoom);
    }, 0);
  };

  useEffect(() => {
    onSceneStateChange({
      ...(detail?.workflow.id ? { workflowId: detail.workflow.id } : {}),
      workflowDisplayName: detail?.workflow.displayName ?? draft?.displayName ?? "Workflow designer",
      selectedNodeId: selectedNode?.id ?? null,
      ...(selectedNode?.label ? { selectedNodeLabel: selectedNode.label } : {}),
      ...(selectedNode?.type ? { selectedNodeType: selectedNode.type } : {}),
      ...(draft?.trigger.type ? { triggerType: draft.trigger.type } : {}),
      ...(draft ? { triggerSummary: describeTrigger(draft.trigger, detail?.availableActions ?? [], detail?.availableConnections ?? []) } : {}),
      nodeCount: draft?.nodes.length ?? 0,
      edgeCount: draft?.edges.length ?? 0,
      zoom,
      isDirty,
    });
  }, [detail?.availableActions, detail?.availableConnections, detail?.workflow.displayName, detail?.workflow.id, draft, isDirty, onSceneStateChange, selectedNode, zoom]);

  useEffect(() => {
    if (!dragState || !draft) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = (event.clientX - dragState.pointerOriginX) / zoom;
      const deltaY = (event.clientY - dragState.pointerOriginY) / zoom;
      onDraftChange(moveNodesFromOrigins(draft, dragState.selectedNodeIds, dragState.originPositions, deltaX, deltaY));
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, draft, onDraftChange, zoom]);

  useEffect(() => {
    if (!connectionDragState) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const point = screenToCanvasPoint(event.clientX, event.clientY);
      setConnectionDragState((current) => (current ? { ...current, pointerX: point.x, pointerY: point.y } : null));
    };

    const handlePointerUp = () => {
      setConnectionDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [connectionDragState, zoom]);

  useEffect(() => {
    if (!marqueeState || !draft) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const point = screenToCanvasPoint(event.clientX, event.clientY);
      setMarqueeState((current) => (current ? { ...current, currentX: point.x, currentY: point.y } : null));
      const rect = normalizeRect(marqueeState.originX, marqueeState.originY, point.x, point.y);
      const hitNodeIds = draft.nodes.filter((node) => doesRectIntersectNode(rect, node)).map((node) => node.id);
      const nextSelection = marqueeState.additive ? dedupeIds([...marqueeState.baseNodeIds, ...hitNodeIds]) : hitNodeIds;
      setSelectedNodeIds(nextSelection);
      setSelectedEdgeId(null);
      setSelectedGroupId(null);
      setSelectedAnnotationId(null);
      onSelectNode(nextSelection[0] ?? null);
    };

    const handlePointerUp = () => {
      setMarqueeState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draft, marqueeState, onSelectNode, zoom]);

  useEffect(() => {
    if (selectedNodeIds.some((nodeId) => collapsedGroupNodeIds.has(nodeId))) {
      setSelectedNodeIds((current) => current.filter((nodeId) => !collapsedGroupNodeIds.has(nodeId)));
    }

    if (selectedEdge && (!visibleNodeIds.has(selectedEdge.sourceNodeId) || !visibleNodeIds.has(selectedEdge.targetNodeId))) {
      setSelectedEdgeId(null);
    }
  }, [collapsedGroupNodeIds, selectedEdge, selectedNodeIds, visibleNodeIds]);

  useEffect(() => {
    if (!contextMenuState) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest(".workflow-context-menu")) {
        return;
      }
      closeContextMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenuState]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    syncViewportState();

    const handleScroll = () => syncViewportState();
    viewport.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => syncViewportState());
    resizeObserver?.observe(viewport);

    const handleWindowResize = () => syncViewportState();
    window.addEventListener("resize", handleWindowResize);

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [draft, zoom]);

  useEffect(() => {
    if (!panState) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      viewport.scrollTo({
        left: Math.max(0, panState.scrollOriginLeft - (event.clientX - panState.pointerOriginX)),
        top: Math.max(0, panState.scrollOriginTop - (event.clientY - panState.pointerOriginY)),
        behavior: "auto",
      });
    };

    const handlePointerUp = () => {
      setPanState(null);
      syncViewportState();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [panState]);

  const handleContextAction = (action: string) => {
    if (!draft || !contextMenuState) {
      return;
    }

    if (action === "canvas-note") {
      const nextDraft = addAnnotationToDraft(draft, { kind: "note", position: { x: contextMenuState.canvasX, y: contextMenuState.canvasY } });
      onDraftChange(nextDraft.draft);
      selectAnnotation(nextDraft.annotationId);
      closeContextMenu();
      return;
    }

    if (action === "canvas-fit") {
      fitCanvasToViewport();
      closeContextMenu();
      return;
    }

    if (action === "canvas-focus-trigger") {
      const firstNode = draft.nodes[0];
      if (firstNode) {
        selectNodes([firstNode.id]);
        centerNodeInViewport(firstNode.id);
      }
      closeContextMenu();
      return;
    }

    if (contextMenuState.kind === "node" && contextMenuState.nodeId) {
      const node = draft.nodes.find((item) => item.id === contextMenuState.nodeId);
      if (!node) {
        closeContextMenu();
        return;
      }

      if (action === "node-focus") {
        selectNodes([node.id]);
        centerNodeInViewport(node.id);
      } else if (action.startsWith("node-route-add:")) {
        const port = action.split(":")[1] as WorkflowEdgeType;
        const nextDraft = appendBranchNode(draft, node, port);
        onDraftChange(nextDraft.draft);
        selectNodes([nextDraft.nextSelectedNodeId]);
      } else if (action.startsWith("node-route-focus:")) {
        const port = action.split(":")[1] as WorkflowEdgeType;
        const edge = draft.edges.find((item) => item.sourceNodeId === node.id && (item.sourcePort ?? item.edgeType ?? "success") === port);
        if (edge) {
          selectNodes([edge.targetNodeId]);
          centerNodeInViewport(edge.targetNodeId);
        }
      } else if (action === "node-policy-retry") {
        onDraftChange(
          updateNode(draft, node.id, (currentNode) => ({
            ...currentNode,
            errorHandling: {
              ...(currentNode.errorHandling ?? draft.errorHandling.defaultNodePolicy),
              strategy: "retry",
              maxRetries: currentNode.errorHandling?.maxRetries ?? 2,
              retryDelaySeconds: currentNode.errorHandling?.retryDelaySeconds ?? 30,
            },
          })),
        );
      } else if (action === "node-policy-fail") {
        onDraftChange(
          updateNode(draft, node.id, (currentNode) => ({
            ...currentNode,
            errorHandling: {
              ...(currentNode.errorHandling ?? draft.errorHandling.defaultNodePolicy),
              strategy: "fail-workflow",
            },
          })),
        );
      } else if (action === "node-note") {
        const nextDraft = addAnnotationToDraft(draft, { kind: "step", position: { x: contextMenuState.canvasX, y: contextMenuState.canvasY }, nodeIds: [node.id] });
        onDraftChange(nextDraft.draft);
        selectAnnotation(nextDraft.annotationId);
      } else if (action === "node-delete") {
        const nextDraft = removeNodeFromDraft(draft, node.id);
        onDraftChange(nextDraft);
        onSelectNode(nextDraft.editor.selectedNodeIds?.[0] ?? null);
      }

      closeContextMenu();
      return;
    }

    if (contextMenuState.kind === "edge" && contextMenuState.edgeId) {
      const edge = draft.edges.find((item) => item.id === contextMenuState.edgeId);
      if (!edge) {
        closeContextMenu();
        return;
      }

      if (action === "edge-focus-source") {
        selectNodes([edge.sourceNodeId]);
        centerNodeInViewport(edge.sourceNodeId);
      } else if (action === "edge-focus-target") {
        selectNodes([edge.targetNodeId]);
        centerNodeInViewport(edge.targetNodeId);
      } else if (action === "edge-delete") {
        onDraftChange(removeEdgeFromDraft(draft, edge.id));
        setSelectedEdgeId(null);
      } else if (action === "edge-note") {
        const nextDraft = addAnnotationToDraft(draft, { kind: "route", position: { x: contextMenuState.canvasX, y: contextMenuState.canvasY }, edgeId: edge.id });
        onDraftChange(nextDraft.draft);
        selectAnnotation(nextDraft.annotationId);
      } else if (action === "edge-reconnect-source") {
        const viewport = viewportRef.current;
        const point = draft.nodes.find((item) => item.id === edge.sourceNodeId);
        const sourceAnchor = point ? getPortAnchor(point, (edge.sourcePort ?? edge.edgeType ?? "success") as WorkflowEdgeType) : { x: contextMenuState.canvasX, y: contextMenuState.canvasY };
        startEdgeReconnect(edge, "source", sourceAnchor.x * zoom - (viewport?.scrollLeft ?? 0) + (viewport?.getBoundingClientRect().left ?? 0), sourceAnchor.y * zoom - (viewport?.scrollTop ?? 0) + (viewport?.getBoundingClientRect().top ?? 0));
        return;
      } else if (action === "edge-reconnect-target") {
        const viewport = viewportRef.current;
        const targetNode = draft.nodes.find((item) => item.id === edge.targetNodeId) ?? draft.nodes[0];
        if (!targetNode) {
          closeContextMenu();
          return;
        }
        const targetAnchor = getTargetAnchor(targetNode);
        startEdgeReconnect(edge, "target", targetAnchor.x * zoom - (viewport?.scrollLeft ?? 0) + (viewport?.getBoundingClientRect().left ?? 0), targetAnchor.y * zoom - (viewport?.scrollTop ?? 0) + (viewport?.getBoundingClientRect().top ?? 0));
        return;
      }

      closeContextMenu();
      return;
    }

    if (contextMenuState.kind === "group" && contextMenuState.groupId) {
      if (action === "group-toggle") {
        toggleGroupCollapsed(contextMenuState.groupId);
        return;
      }

      const group = groups.find((item) => item.id === contextMenuState.groupId);
      if (!group) {
        closeContextMenu();
        return;
      }

      if (action === "group-frame") {
        const bounds = getGroupDisplayBounds(group, draft.nodes);
        if (bounds) {
          centerCanvasPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        }
      } else if (action === "group-select-nodes") {
        const groupNodeIds = draft.nodes.filter((node) => group.nodeIds.includes(node.id)).map((node) => node.id);
        selectNodes(groupNodeIds);
      }

      if (action === "group-note") {
        const nextDraft = addAnnotationToDraft(draft, { kind: "step", position: { x: contextMenuState.canvasX, y: contextMenuState.canvasY }, groupId: contextMenuState.groupId });
        onDraftChange(nextDraft.draft);
        selectAnnotation(nextDraft.annotationId);
      } else if (action === "group-delete") {
        onDraftChange(removeGroupFromDraft(draft, contextMenuState.groupId));
        selectGroup(null);
      }

      closeContextMenu();
    }
  };

  useEffect(() => {
    if (selectedEdgeId && !draft?.edges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId(null);
    }
  }, [draft, selectedEdgeId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        setSpacePressed(true);
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedNode) {
        event.preventDefault();
        handleDeleteSelectedNode();
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedEdge) {
        event.preventDefault();
        handleDeleteSelectedEdge();
        return;
      }

      if (event.key.toLowerCase() === "f" && selectedNode) {
        event.preventDefault();
        centerNodeInViewport(selectedNode.id);
        return;
      }

      if (event.key === "0") {
        event.preventDefault();
        fitCanvasToViewport();
        return;
      }

      if (event.key === "=" || event.key === "+" || event.code === "NumpadAdd") {
        event.preventDefault();
        onZoomChange(clampZoom(zoom + 0.1));
        return;
      }

      if (event.key === "-" || event.code === "NumpadSubtract") {
        event.preventDefault();
        onZoomChange(clampZoom(zoom - 0.1));
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setSpacePressed(false);
      }
    };

    const handleWindowBlur = () => setSpacePressed(false);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [onZoomChange, selectedEdge, selectedNode, zoom]);

  const handleDeleteSelectedNode = () => {
    if (!draft || !selectedNode) {
      return;
    }

    const nextDraft = removeNodeFromDraft(draft, selectedNode.id);
    onDraftChange(nextDraft);
    onSelectNode(nextDraft.editor.selectedNodeIds?.[0] ?? null);
    setSelectedEdgeId(null);
  };

  const handleDeleteSelectedEdge = () => {
    if (!draft || !selectedEdge) {
      return;
    }

    const nextDraft = removeEdgeFromDraft(draft, selectedEdge.id);
    onDraftChange(nextDraft);
    setSelectedEdgeId(null);
    onSelectNode(null);
  };

  if (!detail || !draft) {
    return (
      <section className="surface-page surface-page--workflow">
        <div className="workflow-empty-state panel-scroll">
          <p className="eyebrow">Workflow Designer</p>
          <h3>No workflow selected</h3>
          <p>Select a workflow to start authoring automation steps.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="surface-page surface-page--workflow">
      <div className="workflow-scene workflow-scene--editor">
        <div className="workflow-scene__hud workflow-scene__hud--editor">
          <div className="workflow-scene__hud-main">
            <p className="eyebrow">Workflow Scene</p>
            <div className="workflow-scene__headline-row">
              <h3>{draft.displayName}</h3>
              <select
                className="workflow-scene__select"
                value={detail.workflow.id}
                onChange={(event) => onSelectWorkflow(event.target.value)}
              >
                {workflows.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.displayName}
                  </option>
                ))}
              </select>
            </div>
            <p>
              {detail.workflow.description ?? "Visual workflow authoring with reusable platform actions."}
            </p>
          </div>

          <div className="workflow-scene__hud-meta">
            <div className="ticket-card__tags">
              <span>{highlightedTicket?.tenantDisplayName ?? "No tenant focus"}</span>
              <span>{detail.workflow.status}</span>
              <span>{toDisplay(draft.trigger.type)} trigger</span>
              <span>{detail.workflow.designAssistantMode}</span>
              <span>{isDirty ? "Unsaved changes" : "Draft synced"}</span>
            </div>
            <div className="workflow-scene__hud-actions">
              <button className="secondary-action workflow-action workflow-action--navigation" data-icon="-" type="button" onClick={() => onZoomChange(clampZoom(zoom - 0.1))}>
                Zoom Out
              </button>
              <button className="secondary-action workflow-action workflow-action--utility" data-icon="[]" type="button" onClick={fitCanvasToViewport}>
                Frame Canvas
              </button>
              <button className="secondary-action workflow-action workflow-action--navigation" data-icon="+" type="button" onClick={() => onZoomChange(clampZoom(zoom + 0.1))}>
                Zoom In
              </button>
              <button className="primary-action" type="button" onClick={onSave} disabled={busyIntent === "save-workflow"}>
                {busyIntent === "save-workflow" ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>
        </div>

        <aside className="workflow-scene__toolbelt workflow-scene__toolbelt--editor panel-scroll">
          <div className="panel-scroll__header">
            <p className="eyebrow">Block Palette</p>
            <span>{draft.nodes.length} nodes</span>
          </div>

          <div className="workflow-palette__section">
            <h4>Trigger Modes</h4>
            <div className="workflow-palette__stack">
              {(["manual", "schedule", "polling", "webhook", "queue"] as WorkflowTriggerType[]).map((triggerType) => (
                <button
                  key={triggerType}
                  className={`workflow-palette__item${draft.trigger.type === triggerType ? " workflow-palette__item--active" : ""}`}
                  type="button"
                  onClick={() => onDraftChange(updateTriggerType(draft, triggerType, triggerCapableActions))}
                >
                  <strong>{toDisplay(triggerType)} Trigger</strong>
                  <span>{triggerCaption(triggerType)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="workflow-palette__section">
            <h4>Built-In Blocks</h4>
            <div className="workflow-palette__stack">
              <button className="workflow-palette__item" type="button" onClick={() => onInsertBuiltInNode("condition")}>
                <strong>Condition Gate</strong>
                <span>Branch the flow based on context or prior output.</span>
              </button>
              <button className="workflow-palette__item" type="button" onClick={() => onInsertBuiltInNode("javascript")}>
                <strong>Custom JavaScript</strong>
                <span>Handle bespoke logic without leaving the workflow scene.</span>
              </button>
              <button className="workflow-palette__item" type="button" onClick={() => onInsertBuiltInNode("ai-agent")}>
                <strong>Foundry Agent Step</strong>
                <span>Use AI-assisted reasoning with explicit operating mode and approvals.</span>
              </button>
              <button className="workflow-palette__item" type="button" onClick={() => onInsertBuiltInNode("variable")}>
                <strong>Variable</strong>
                <span>Stage a reusable value or workflow-local scratch field.</span>
              </button>
            </div>
          </div>

          {connectorActionPalette.map((group) => (
            <div key={group.connectorId} className="workflow-palette__section">
              <h4>{group.connectorDisplayName}</h4>
              <div className="workflow-palette__stack">
                {group.items.map((action) => (
                  <button
                    key={action.id}
                    className="workflow-palette__item workflow-palette__item--action"
                    type="button"
                    onClick={() => onInsertActionNode(action)}
                  >
                    <strong>{action.displayName}</strong>
                    <span>
                      {action.method} {action.pathTemplate}{action.isTriggerCapable ? " - trigger-capable" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div className="workflow-scene__stage workflow-stage-shell">
          <div className="workflow-stage-shell__header">
            <div>
              <p className="eyebrow">Main View</p>
              <h4>{describeTrigger(draft.trigger, detail.availableActions, detail.availableConnections)}</h4>
            </div>
            <div className="ticket-card__tags">
              <span>{draft.edges.length} links</span>
              <span>{Math.round(zoom * 100)}% zoom</span>
              <span>Snap {GRID_SIZE}px</span>
              <span>Pan Space-drag</span>
              <span>Zoom Ctrl+Wheel</span>
              {selectedNode ? <span>{selectedNode.type}</span> : null}
              {!selectedNode && selectedEdge ? <span>route</span> : null}
            </div>
          </div>

          <div
            ref={viewportRef}
            className={`workflow-stage-viewport panel-scroll${spacePressed ? " workflow-stage-viewport--grab" : ""}${panState ? " workflow-stage-viewport--panning" : ""}`}
            onClick={(event) => {
              if (panState || marqueeState) {
                return;
              }

              if (!(event.target instanceof HTMLElement)) {
                return;
              }

              if (event.target.closest(".workflow-node, .workflow-group, .workflow-annotation, .workflow-stage-canvas__edges, .workflow-stage-viewport__hud")) {
                return;
              }

              clearCanvasSelection();
            }}
            onPointerDownCapture={(event) => {
              if (event.button !== 1 && !(spacePressed && event.button === 0)) {
                return;
              }

              event.preventDefault();
              setPanState({
                pointerOriginX: event.clientX,
                pointerOriginY: event.clientY,
                scrollOriginLeft: viewportRef.current?.scrollLeft ?? 0,
                scrollOriginTop: viewportRef.current?.scrollTop ?? 0,
              });
            }}
            onPointerDown={(event) => {
              if (event.button !== 0 || spacePressed || panState || connectionDragState) {
                return;
              }

              if (!(event.target instanceof HTMLElement)) {
                return;
              }

              if (event.target.closest(".workflow-node, .workflow-group, .workflow-annotation, .workflow-stage-canvas__edges, .workflow-stage-viewport__hud")) {
                return;
              }

              const point = screenToCanvasPoint(event.clientX, event.clientY);
              setSelectedEdgeId(null);
              setSelectedGroupId(null);
              setSelectedAnnotationId(null);
              setMarqueeState({
                originX: point.x,
                originY: point.y,
                currentX: point.x,
                currentY: point.y,
                additive: event.shiftKey,
                baseNodeIds: event.shiftKey ? selectedNodeIds : [],
              });

              if (!event.shiftKey) {
                setSelectedNodeIds([]);
                onSelectNode(null);
              }
            }}
            onContextMenu={(event) => {
              if (event.target instanceof HTMLElement && event.target.closest(".workflow-node, .workflow-group, .workflow-annotation, .workflow-stage-canvas__edges, .workflow-stage-viewport__hud")) {
                return;
              }

              openContextMenu(event, { kind: "canvas" });
            }}
            onWheel={(event) => {
              if (!(event.ctrlKey || event.metaKey)) {
                return;
              }

              event.preventDefault();
              const viewport = viewportRef.current;
              if (!viewport) {
                return;
              }

              const rect = viewport.getBoundingClientRect();
              const pointerCanvasX = (viewport.scrollLeft + event.clientX - rect.left) / zoom;
              const pointerCanvasY = (viewport.scrollTop + event.clientY - rect.top) / zoom;
              const nextZoom = clampZoom(zoom + (event.deltaY < 0 ? 0.08 : -0.08));
              onZoomChange(nextZoom);
              window.setTimeout(() => {
                centerCanvasPoint(pointerCanvasX, pointerCanvasY, nextZoom, "auto");
              }, 0);
            }}
          >
            <div className="workflow-stage-canvas" style={{ width: `${canvasSize.width * zoom}px`, height: `${canvasSize.height * zoom}px` }}>
              <div
                className="workflow-stage-canvas__world"
                style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px`, transform: `scale(${zoom})` }}
              >
                <div className="workflow-trigger-banner">
                  <span className="workflow-trigger-banner__label">Trigger</span>
                  <strong>{toDisplay(draft.trigger.type)}</strong>
                  <span>{describeTrigger(draft.trigger, detail.availableActions, detail.availableConnections)}</span>
                </div>

                {groups.map((group) => {
                  const bounds = getGroupDisplayBounds(group, draft.nodes);
                  if (!bounds) {
                    return null;
                  }

                  return (
                    <div
                      key={group.id}
                      className={`workflow-group${selectedGroupId === group.id ? " workflow-group--selected" : ""}${group.collapsed ? " workflow-group--collapsed" : ""}`}
                      style={{
                        left: `${bounds.x}px`,
                        top: `${bounds.y}px`,
                        width: `${bounds.width}px`,
                        height: `${bounds.height}px`,
                        borderColor: group.color ?? "#10634a",
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectGroup(group.id);
                      }}
                      onContextMenu={(event) => openContextMenu(event, { kind: "group", groupId: group.id })}
                    >
                      <div className="workflow-group__header">
                        <span className="workflow-group__label">{group.label}</span>
                        <button
                          type="button"
                          className="workflow-group__toggle workflow-action workflow-action--utility"
                          data-icon="="
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleGroupCollapsed(group.id);
                          }}
                        >
                          {group.collapsed ? "Expand" : "Collapse"}
                        </button>
                      </div>
                      {group.description ? <span className="workflow-group__summary">{group.description}</span> : null}
                      <span className="workflow-group__count">{group.nodeIds.length} step{group.nodeIds.length === 1 ? "" : "s"}</span>
                    </div>
                  );
                })}

                {visibleAnnotations.map((annotation) => (
                  <button
                    key={annotation.id}
                    type="button"
                    className={`workflow-annotation workflow-annotation--${annotation.kind}${selectedAnnotationId === annotation.id ? " workflow-annotation--selected" : ""}`}
                    style={{
                      left: `${annotation.position.x}px`,
                      top: `${annotation.position.y}px`,
                      width: `${annotation.size?.width ?? 196}px`,
                      minHeight: `${annotation.size?.height ?? 104}px`,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      selectAnnotation(annotation.id);
                    }}
                  >
                    <span className="workflow-annotation__kind">{toDisplay(annotation.kind)}</span>
                    <strong>{annotation.label}</strong>
                    {annotation.content ? <span>{annotation.content}</span> : null}
                  </button>
                ))}

                <svg className="workflow-stage-canvas__edges" viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`} preserveAspectRatio="none">
                  {draft.edges.filter((edge) => visibleNodeIds.has(edge.sourceNodeId) && visibleNodeIds.has(edge.targetNodeId)).map((edge) => {
                    const sourceNode = draft.nodes.find((node) => node.id === edge.sourceNodeId);
                    const targetNode = draft.nodes.find((node) => node.id === edge.targetNodeId);
                    if (!sourceNode || !targetNode) {
                      return null;
                    }

                    const path = buildEdgePath(sourceNode, targetNode);
                    const edgeLabel = getEdgeDisplayLabel(edge);
                    return (
                      <g key={edge.id}>
                        <path
                          d={path}
                          className="workflow-stage-canvas__edge-hit"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectEdge(edge.id);
                          }}
                          onContextMenu={(event) => openContextMenu(event, { kind: "edge", edgeId: edge.id })}
                        />
                        <path
                          d={path}
                          className={`workflow-stage-canvas__edge-path workflow-stage-canvas__edge-path--${edge.edgeType ?? edge.sourcePort ?? "default"}${selectedEdge?.id === edge.id ? " workflow-stage-canvas__edge-path--selected" : ""}`}
                          onContextMenu={(event) => openContextMenu(event, { kind: "edge", edgeId: edge.id })}
                        />
                        {edgeLabel || edge.annotation ? (
                          <text
                            className={`workflow-stage-canvas__edge-label workflow-stage-canvas__edge-label--${edge.edgeType ?? edge.sourcePort ?? "default"}${selectedEdge?.id === edge.id ? " workflow-stage-canvas__edge-label--selected" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              selectEdge(edge.id);
                            }}
                            onContextMenu={(event) => openContextMenu(event, { kind: "edge", edgeId: edge.id })}
                            x={((sourceNode.position?.x ?? 0) + (targetNode.position?.x ?? 0)) / 2 + 16}
                            y={((sourceNode.position?.y ?? 0) + (targetNode.position?.y ?? 0)) / 2 - 12}
                          >
                            {edgeLabel ? <tspan x={((sourceNode.position?.x ?? 0) + (targetNode.position?.x ?? 0)) / 2 + 16}>{edgeLabel}</tspan> : null}
                            {edge.annotation ? <tspan className="workflow-stage-canvas__edge-note" x={((sourceNode.position?.x ?? 0) + (targetNode.position?.x ?? 0)) / 2 + 16} dy={edgeLabel ? "1.2em" : 0}>{edge.annotation}</tspan> : null}
                          </text>
                        ) : null}
                        {selectedEdge?.id === edge.id ? (
                          <>
                            <circle
                              className={`workflow-stage-canvas__edge-handle workflow-stage-canvas__edge-handle--source workflow-action-outline--${getWorkflowToneForPort((edge.sourcePort ?? edge.edgeType ?? "success") as WorkflowEdgeType)}`}
                              cx={getPortAnchor(sourceNode, (edge.sourcePort ?? edge.edgeType ?? "success") as WorkflowEdgeType).x}
                              cy={getPortAnchor(sourceNode, (edge.sourcePort ?? edge.edgeType ?? "success") as WorkflowEdgeType).y}
                              r="10"
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                startEdgeReconnect(edge, "source", event.clientX, event.clientY);
                              }}
                            />
                            <circle
                              className="workflow-stage-canvas__edge-handle workflow-stage-canvas__edge-handle--target workflow-action-outline--navigation"
                              cx={getTargetAnchor(targetNode).x}
                              cy={getTargetAnchor(targetNode).y}
                              r="10"
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                startEdgeReconnect(edge, "target", event.clientX, event.clientY);
                              }}
                            />
                          </>
                        ) : null}
                      </g>
                    );
                  })}
                </svg>

                {connectionDragState ? (
                  <svg className="workflow-stage-canvas__edges" viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`} preserveAspectRatio="none">
                    <path
                      d={buildPreviewEdgePath(connectionDragState, draft.nodes)}
                      className={`workflow-stage-canvas__edge-path workflow-stage-canvas__edge-path--draft workflow-stage-canvas__edge-path--${connectionDragState.sourcePort}`}
                    />
                  </svg>
                ) : null}

                {visibleNodes.map((node) => {
                  const position = node.position ?? { x: 32, y: 32 };
                  const isSelected = selectedNodeIds.includes(node.id);
                  return (
                    <button
                      key={node.id}
                      className={`workflow-node workflow-node--${node.type}${isSelected ? " workflow-node--selected" : ""}`}
                      type="button"
                      style={{ left: `${position.x}px`, top: `${position.y}px` }}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (event.shiftKey) {
                          selectNodes(selectedNodeIds.includes(node.id) ? selectedNodeIds.filter((item) => item !== node.id) : [...selectedNodeIds, node.id]);
                          return;
                        }
                        selectNodes([node.id]);
                      }}
                      onPointerUp={(event) => {
                        if (!connectionDragState || connectionDragState.sourceNodeId === node.id) {
                          return;
                        }

                        event.stopPropagation();
                        onDraftChange(applyConnectionDrop(draft, connectionDragState, node));
                        setConnectionDragState(null);
                        selectNodes([node.id]);
                      }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (spacePressed || event.button !== 0 || connectionDragState) {
                          return;
                        }
                        const nextSelection = selectedNodeIds.includes(node.id) ? selectedNodeIds : [node.id];
                        selectNodes(nextSelection);
                        setDragState({
                          nodeId: node.id,
                          selectedNodeIds: nextSelection,
                          pointerOriginX: event.clientX,
                          pointerOriginY: event.clientY,
                          originPositions: Object.fromEntries(
                            draft.nodes
                              .filter((item) => nextSelection.includes(item.id))
                              .map((item) => [item.id, item.position ?? { x: 24, y: 24 }]),
                          ),
                        });
                      }}
                      onContextMenu={(event) => openContextMenu(event, { kind: "node", nodeId: node.id })}
                    >
                      <div className="workflow-node__ports">
                        {getNodePortLabels(node).map((port) => (
                          <button
                            key={port}
                            type="button"
                            className={`workflow-node__port-handle workflow-action workflow-action--${getWorkflowToneForPort(port)} workflow-node__port-handle--${port}`}
                            data-icon={getWorkflowIconForPort(port)}
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              const point = screenToCanvasPoint(event.clientX, event.clientY);
                              setConnectionDragState({
                                sourceNodeId: node.id,
                                sourcePort: port,
                                pointerX: point.x,
                                pointerY: point.y,
                              });
                              selectNodes([node.id]);
                            }}
                            title={`Connect ${toDisplay(port)} route`}
                          >
                            {toDisplay(port)}
                          </button>
                        ))}
                      </div>
                      <span className="workflow-node__type">{toDisplay(node.type)}</span>
                      <strong>{node.label}</strong>
                      <span>{describeNode(node, detail.availableActions, detail.availableConnections)}</span>
                      <div className="workflow-node__meta">
                        {getNodePortLabels(node).map((port) => (
                          <span
                            key={port}
                            className={`workflow-node__port workflow-status-pill workflow-status-pill--${getWorkflowToneForPort(port)} workflow-node__port--${port}`}
                            data-icon={getWorkflowIconForPort(port)}
                          >
                            {toDisplay(port)}
                          </span>
                        ))}
                        <span
                          className={`workflow-node__policy workflow-status-pill workflow-status-pill--${getErrorPolicyTone(node.errorHandling)}`}
                          data-icon={getErrorPolicyIcon(node.errorHandling)}
                        >
                          {describeNodeErrorPolicy(node.errorHandling)}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {marqueeState ? (() => {
                  const rect = normalizeRect(marqueeState.originX, marqueeState.originY, marqueeState.currentX, marqueeState.currentY);
                  return <div className="workflow-stage-canvas__marquee" style={{ left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` }} />;
                })() : null}

                <div className="workflow-stage-viewport__hud">
                  <div className="workflow-stage-viewport__actions">
                    {selectedNode ? (
                      <>
                        <button className="secondary-action workflow-action workflow-action--navigation" data-icon=">" type="button" onClick={() => centerNodeInViewport(selectedNode.id)}>
                          Focus Block
                        </button>
                        <button className="secondary-action workflow-action workflow-action--danger" data-icon="!" type="button" onClick={handleDeleteSelectedNode}>
                          Delete Block
                        </button>
                      </>
                    ) : null}
                    {isMultiSelection ? (
                      <button className="secondary-action workflow-action workflow-action--progressive" data-icon="+" type="button" onClick={() => { const nextDraft = createGroupFromSelection(draft, selectedNodeIds); onDraftChange(nextDraft.draft); selectGroup(nextDraft.groupId); }}>
                        Group Selection
                      </button>
                    ) : null}
                    {selectedGroup ? (
                      <button className="secondary-action workflow-action workflow-action--danger" data-icon="!" type="button" onClick={() => { onDraftChange(removeGroupFromDraft(draft, selectedGroup.id)); selectGroup(null); }}>
                        Remove Group
                      </button>
                    ) : null}
                    {selectedEdge ? (
                      <button className="secondary-action workflow-action workflow-action--danger" data-icon="!" type="button" onClick={handleDeleteSelectedEdge}>
                        Delete Route
                      </button>
                    ) : null}
                    <button className="secondary-action workflow-action workflow-action--utility" data-icon="+" type="button" onClick={() => { const nextDraft = addAnnotationToDraft(draft, { kind: selectedEdge ? "route" : selectedGroup ? "step" : "note", position: getViewportCenter(viewportRef.current, zoom), ...(selectedEdge?.id ? { edgeId: selectedEdge.id } : {}), ...(selectedGroup?.id ? { groupId: selectedGroup.id } : {}), ...(isMultiSelection ? { nodeIds: selectedNodeIds } : {}) }); onDraftChange(nextDraft.draft); selectAnnotation(nextDraft.annotationId); }}>
                      {selectedEdge ? "Add Route Note" : selectedGroup ? "Add Step Note" : isMultiSelection ? "Add Group Note" : "Add Canvas Note"}
                    </button>
                  </div>
                  <CanvasMinimap
                    draft={draft}
                    nodes={visibleNodes}
                    canvasSize={canvasSize}
                    zoom={zoom}
                    viewportState={viewportState}
                    selectedNodeId={selectedNode?.id ?? null}
                    onSelectNode={(nodeId) => {
                      selectNodes([nodeId]);
                      centerNodeInViewport(nodeId);
                    }}
                    onNavigate={(x, y) => centerCanvasPoint(x, y)}
                  />
                </div>
              </div>
            </div>
            {contextMenuState ? (
              <div className="workflow-context-menu" style={{ left: `${contextMenuState.viewportX}px`, top: `${contextMenuState.viewportY}px` }}>
                <div className="workflow-context-menu__core">{contextMenuTitle}</div>
                {contextMenuActions.map((action, index) => {
                  const angle = (index / Math.max(contextMenuActions.length, 1)) * Math.PI * 2 - Math.PI / 2;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={`workflow-context-menu__action workflow-context-menu__action--${getContextActionTone(action.id)}`}
                      style={{ transform: `translate(${Math.cos(angle) * contextMenuRadius}px, ${Math.sin(angle) * contextMenuRadius}px)` }}
                      onClick={() => handleContextAction(action.id)}
                    >
                      <span className="workflow-context-menu__action-icon">{getContextActionIcon(action.id)}</span>
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="workflow-scene__inspector workflow-scene__inspector--editor panel-scroll">
          <div className="panel-scroll__header">
            <p className="eyebrow">Inspector</p>
            <span>{isMultiSelection ? selectedNodeIds.length + " blocks" : selectedGroup ? "group" : selectedAnnotation ? "note" : selectedNode ? selectedNode.type : selectedEdge ? "edge" : "workflow"}</span>
          </div>

          <div className="workflow-inspector__section">
            <label className="form-field">
              <span>Workflow Name</span>
              <input
                value={draft.displayName}
                onChange={(event) => onDraftChange({ ...draft, displayName: event.target.value })}
              />
            </label>
          </div>

          <TriggerInspector
            draft={draft}
            triggerCapableActions={triggerCapableActions}
            connections={detail.availableConnections}
            onChange={(nextTrigger) => onDraftChange({ ...draft, trigger: nextTrigger })}
          />

          <WorkflowErrorHandlingInspector
            errorHandling={draft.errorHandling}
            nodes={draft.nodes}
            onChange={(nextErrorHandling) => onDraftChange({ ...draft, errorHandling: nextErrorHandling })}
          />

          {isMultiSelection ? (
            <MultiSelectionInspector selectedNodes={selectedNodes} onCreateGroup={() => { const nextDraft = createGroupFromSelection(draft, selectedNodeIds); onDraftChange(nextDraft.draft); selectGroup(nextDraft.groupId); }} />
          ) : selectedGroup ? (
            <GroupInspector group={selectedGroup} onChange={(group) => onDraftChange(updateGroupInDraft(draft, group.id, () => group))} onDelete={() => { onDraftChange(removeGroupFromDraft(draft, selectedGroup.id)); selectGroup(null); }} onToggleCollapse={() => toggleGroupCollapsed(selectedGroup.id)} />
          ) : selectedAnnotation ? (
            <AnnotationInspector annotation={selectedAnnotation} onChange={(annotation) => onDraftChange(updateAnnotationInDraft(draft, annotation.id, () => annotation))} onDelete={() => { onDraftChange(removeAnnotationFromDraft(draft, selectedAnnotation.id)); selectAnnotation(null); }} />
          ) : selectedNode ? (
            <>
              <div className="workflow-inspector__section">
                <label className="form-field">
                  <span>Block Label</span>
                  <input
                    value={selectedNode.label}
                    onChange={(event) => onDraftChange(updateNode(draft, selectedNode.id, (node) => ({ ...node, label: event.target.value })))}
                  />
                </label>
                <label className="form-field">
                  <span>Step Notes</span>
                  <textarea
                    rows={4}
                    value={selectedNode.documentation ?? ""}
                    onChange={(event) =>
                      onDraftChange(
                        updateNode(
                          draft,
                          selectedNode.id,
                          (node) => (event.target.value ? { ...node, documentation: event.target.value } : omitNodeField(node, "documentation")),
                        ),
                      )
                    }
                  />
                </label>
              </div>

              {selectedNode.type === "trigger" ? (
                <div className="workflow-inspector__section">
                  <EditableRecord
                    label="Trigger Config"
                    value={selectedNode.config}
                    onChange={(value) =>
                      onDraftChange(updateNode(draft, selectedNode.id, (node) => ({ ...node, config: value })))
                    }
                  />
                </div>
              ) : null}

              {selectedNode.type === "connector-action" ? (
                <ConnectorActionInspector
                  node={selectedNode}
                  actions={detail.availableActions}
                  connections={detail.availableConnections}
                  onChange={(node) => onDraftChange(updateNode(draft, selectedNode.id, () => node))}
                />
              ) : null}

              {selectedNode.type === "condition" ? (
                <div className="workflow-inspector__section">
                  <label className="form-field">
                    <span>Expression</span>
                    <textarea
                      rows={4}
                      value={selectedNode.expression}
                      onChange={(event) =>
                        onDraftChange(updateNode(draft, selectedNode.id, (node) => ({ ...node, expression: event.target.value })))
                      }
                    />
                  </label>
                </div>
              ) : null}

              {selectedNode.type === "javascript" ? (
                <div className="workflow-inspector__section">
                  <label className="form-field">
                    <span>Inline Script</span>
                    <textarea
                      rows={7}
                      value={selectedNode.inlineScript ?? ""}
                      onChange={(event) =>
                        onDraftChange(updateNode(draft, selectedNode.id, (node) => ({ ...node, inlineScript: event.target.value })))
                      }
                    />
                  </label>
                </div>
              ) : null}

              {selectedNode.type === "ai-agent" ? (
                <AIAgentInspector
                  node={selectedNode}
                  onChange={(node) => onDraftChange(updateNode(draft, selectedNode.id, () => node))}
                />
              ) : null}

              {selectedNode.type === "variable" ? (
                <div className="workflow-inspector__section workflow-inspector__grid-two">
                  <label className="form-field">
                    <span>Variable Name</span>
                    <input
                      value={selectedNode.variableName}
                      onChange={(event) =>
                        onDraftChange(updateNode(draft, selectedNode.id, (node) => ({ ...node, variableName: event.target.value })))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Value Expression</span>
                    <input
                      value={selectedNode.valueExpression ?? ""}
                      onChange={(event) =>
                        onDraftChange(updateNode(draft, selectedNode.id, (node) => ({ ...node, valueExpression: event.target.value })))}
                    />
                  </label>
                </div>
              ) : null}

              <BranchingInspector
                draft={draft}
                node={selectedNode}
                edges={selectedNodeEdges}
                onChange={(nextDraft, nextSelectedNodeId) => {
                  onDraftChange(nextDraft);
                  if (nextSelectedNodeId) {
                    onSelectNode(nextSelectedNodeId);
                  }
                }}
              />

              <NodeErrorHandlingInspector
                node={selectedNode}
                nodes={draft.nodes}
                fallbackPolicy={draft.errorHandling.defaultNodePolicy}
                onChange={(policy) => onDraftChange(updateNode(draft, selectedNode.id, (node) => ({ ...node, errorHandling: policy })))}
              />

              <div className="workflow-inspector__section workflow-inspector__section--minor">
                <p className="eyebrow">Position</p>
                <div className="workflow-inspector__grid-two">
                  <label className="form-field">
                    <span>X</span>
                    <input
                      type="number"
                      value={selectedNode.position?.x ?? 0}
                      onChange={(event) =>
                        onDraftChange(
                          updateNode(draft, selectedNode.id, (node) => ({
                            ...node,
                            position: {
                              x: snapToGrid(Number(event.target.value) || 0),
                              y: node.position?.y ?? 0,
                            },
                          })),
                        )
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Y</span>
                    <input
                      type="number"
                      value={selectedNode.position?.y ?? 0}
                      onChange={(event) =>
                        onDraftChange(
                          updateNode(draft, selectedNode.id, (node) => ({
                            ...node,
                            position: {
                              x: node.position?.x ?? 0,
                              y: snapToGrid(Number(event.target.value) || 0),
                            },
                          })),
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            </>
          ) : selectedEdge ? (
            <EdgeInspector
              edge={selectedEdge}
              nodes={draft.nodes}
              onChange={(nextEdge) => onDraftChange(updateEdge(draft, selectedEdge.id, () => nextEdge))}
              onDelete={handleDeleteSelectedEdge}
            />
          ) : (
            <div className="workflow-empty-state workflow-empty-state--compact">
              <h4>No block selected</h4>
              <p>Select a node or route on the canvas to edit it here.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function WorkflowErrorHandlingInspector({
  errorHandling,
  nodes,
  onChange,
}: {
  errorHandling: WorkflowDocument["errorHandling"];
  nodes: WorkflowNode[];
  onChange: (value: WorkflowDocument["errorHandling"]) => void;
}) {
  return (
    <div className="workflow-inspector__section workflow-error-policy-card">
      <div className="workflow-trigger-inspector__header">
        <div>
          <p className="eyebrow">Workflow Error Policy</p>
          <h4>Default Failure Handling</h4>
        </div>
        <span
          className={`workflow-trigger-inspector__summary workflow-status-pill workflow-status-pill--${getErrorPolicyTone(errorHandling.defaultNodePolicy)}`}
          data-icon={getErrorPolicyIcon(errorHandling.defaultNodePolicy)}
        >
          {describeNodeErrorPolicy(errorHandling.defaultNodePolicy)}
        </span>
      </div>

      <ErrorPolicyEditor
        policy={errorHandling.defaultNodePolicy}
        nodes={nodes}
        onChange={(policy) => onChange({ ...errorHandling, defaultNodePolicy: policy })}
      />

      <div className="workflow-inspector__grid-two">
        <div className="workflow-error-policy-card__section">
          <p className="eyebrow">Trigger Failures</p>
          <ErrorPolicyEditor
            policy={errorHandling.onTriggerFailure ?? { strategy: "continue", captureAs: "triggerError" }}
            nodes={nodes}
            onChange={(policy) => onChange({ ...errorHandling, onTriggerFailure: policy })}
          />
        </div>
        <div className="workflow-error-policy-card__section">
          <p className="eyebrow">Unhandled Errors</p>
          <ErrorPolicyEditor
            policy={errorHandling.onUnhandledError ?? { strategy: "fail-workflow", captureAs: "unhandledError" }}
            nodes={nodes}
            onChange={(policy) => onChange({ ...errorHandling, onUnhandledError: policy })}
          />
        </div>
      </div>
    </div>
  );
}

function BranchingInspector({
  draft,
  node,
  edges,
  onChange,
}: {
  draft: WorkflowDocument;
  node: WorkflowNode;
  edges: WorkflowEdge[];
  onChange: (draft: WorkflowDocument, nextSelectedNodeId?: string) => void;
}) {
  const availablePorts = getNodePortLabels(node);

  return (
    <div className="workflow-inspector__section workflow-branch-card">
      <div className="workflow-trigger-inspector__header">
        <div>
          <p className="eyebrow">Branching</p>
          <h4>Routes From This Block</h4>
        </div>
        <span className="workflow-trigger-inspector__summary workflow-status-pill workflow-status-pill--utility" data-icon="#">{availablePorts.length} outputs</span>
      </div>

      <div className="workflow-branch-card__routes">
        {availablePorts.map((port) => {
          const existingEdge = edges.find((edge) => (edge.sourcePort ?? edge.edgeType ?? "success") === port);
          const targetNode = existingEdge ? draft.nodes.find((item) => item.id === existingEdge.targetNodeId) : undefined;
          return (
            <div key={port} className="workflow-branch-card__route">
              <div className="workflow-branch-card__route-copy">
                <div className="workflow-branch-card__pill-row">
                  <span className={`workflow-status-pill workflow-status-pill--${getWorkflowToneForPort(port)}`} data-icon={getWorkflowIconForPort(port)}>
                    {toDisplay(port)}
                  </span>
                  <span className={`workflow-status-pill workflow-status-pill--${existingEdge ? "navigation" : "utility"}`} data-icon={existingEdge ? ">" : "."}>
                    {existingEdge ? "Connected" : "Open"}
                  </span>
                </div>
                <span>{targetNode ? `Connected to ${targetNode.label}` : "No branch connected yet."}</span>
              </div>
              <button
                className={`secondary-action workflow-action workflow-action--${existingEdge ? "navigation" : getWorkflowToneForPort(port)}`}
                data-icon={existingEdge ? ">" : getWorkflowIconForPort(port)}
                type="button"
                onClick={() => {
                  if (existingEdge) {
                    onChange(draft, existingEdge.targetNodeId);
                    return;
                  }

                  const result = appendBranchNode(draft, node, port);
                  onChange(result.draft, result.nextSelectedNodeId);
                }}
              >
                {existingEdge ? "Focus Route" : `Add ${toDisplay(port)} Route`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NodeErrorHandlingInspector({
  node,
  nodes,
  fallbackPolicy,
  onChange,
}: {
  node: WorkflowNode;
  nodes: WorkflowNode[];
  fallbackPolicy: WorkflowErrorHandlingPolicy;
  onChange: (policy: WorkflowErrorHandlingPolicy) => void;
}) {
  return (
    <div className="workflow-inspector__section workflow-error-policy-card">
      <div className="workflow-trigger-inspector__header">
        <div>
          <p className="eyebrow">Block Error Policy</p>
          <h4>{node.label}</h4>
        </div>
        <span
          className={`workflow-trigger-inspector__summary workflow-status-pill workflow-status-pill--${getErrorPolicyTone(node.errorHandling ?? fallbackPolicy)}`}
          data-icon={getErrorPolicyIcon(node.errorHandling ?? fallbackPolicy)}
        >
          {describeNodeErrorPolicy(node.errorHandling ?? fallbackPolicy)}
        </span>
      </div>
      <ErrorPolicyEditor policy={node.errorHandling ?? fallbackPolicy} nodes={nodes.filter((item) => item.id !== node.id)} onChange={onChange} />
    </div>
  );
}

function ErrorPolicyEditor({
  policy,
  nodes,
  onChange,
}: {
  policy: WorkflowErrorHandlingPolicy;
  nodes: WorkflowNode[];
  onChange: (policy: WorkflowErrorHandlingPolicy) => void;
}) {
  return (
    <div className="workflow-error-policy-editor">
      <div className="workflow-inspector__grid-two">
        <label className="form-field">
          <span>Strategy</span>
          <select value={policy.strategy} onChange={(event) => onChange({ ...policy, strategy: event.target.value as WorkflowErrorHandlingPolicy["strategy"] })}>
            <option value="fail-workflow">Fail Workflow</option>
            <option value="continue">Continue</option>
            <option value="retry">Retry</option>
            <option value="branch">Branch</option>
          </select>
        </label>
        <label className="form-field">
          <span>Capture As</span>
          <input value={policy.captureAs ?? "lastError"} onChange={(event) => onChange({ ...policy, captureAs: event.target.value })} />
        </label>
      </div>

      {policy.strategy === "retry" ? (
        <div className="workflow-inspector__grid-two">
          <label className="form-field">
            <span>Max Retries</span>
            <input type="number" min={0} value={policy.maxRetries ?? 1} onChange={(event) => onChange({ ...policy, maxRetries: Number(event.target.value) || 0 })} />
          </label>
          <label className="form-field">
            <span>Retry Delay Seconds</span>
            <input type="number" min={0} value={policy.retryDelaySeconds ?? 15} onChange={(event) => onChange({ ...policy, retryDelaySeconds: Number(event.target.value) || 0 })} />
          </label>
        </div>
      ) : null}

      {policy.strategy === "branch" ? (
        <label className="form-field">
          <span>Error Route Target</span>
          <select value={policy.branchTargetNodeId ?? ""} onChange={(event) => onChange(event.target.value ? { ...policy, branchTargetNodeId: event.target.value } : omitPolicyField(policy, "branchTargetNodeId"))}>
            <option value="">Select a branch target</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="form-field">
        <span>Notes</span>
        <input value={policy.notes ?? ""} onChange={(event) => onChange(event.target.value ? { ...policy, notes: event.target.value } : omitPolicyField(policy, "notes"))} />
      </label>
    </div>
  );
}
function EdgeInspector({
  edge,
  nodes,
  onChange,
  onDelete,
}: {
  edge: WorkflowEdge;
  nodes: WorkflowNode[];
  onChange: (edge: WorkflowEdge) => void;
  onDelete: () => void;
}) {
  return (
    <div className="workflow-inspector__section workflow-edge-card">
      <div className="workflow-trigger-inspector__header">
        <div>
          <p className="eyebrow">Route Inspector</p>
          <h4>{getEdgeDisplayLabel(edge) ?? "Untitled Route"}</h4>
        </div>
        <button className="secondary-action workflow-action workflow-action--danger" data-icon="!" type="button" onClick={onDelete}>
          Delete Route
        </button>
      </div>

      <div className="workflow-inspector__grid-two">
        <label className="form-field">
          <span>Route Type</span>
          <select value={edge.edgeType ?? edge.sourcePort ?? "default"} onChange={(event) => onChange({ ...edge, edgeType: event.target.value as WorkflowEdgeType, sourcePort: event.target.value })}>
            <option value="default">Default</option>
            <option value="success">Success</option>
            <option value="true">True</option>
            <option value="false">False</option>
            <option value="error">Error</option>
          </select>
        </label>
        <label className="form-field">
          <span>Target Block</span>
          <select value={edge.targetNodeId} onChange={(event) => onChange({ ...edge, targetNodeId: event.target.value })}>
            {nodes.filter((node) => node.id !== edge.sourceNodeId).map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="workflow-inspector__grid-two">
        <label className="form-field">
          <span>Label</span>
          <input value={edge.label ?? ""} onChange={(event) => onChange(event.target.value ? { ...edge, label: event.target.value } : omitEdgeField(edge, "label"))} />
        </label>
        <label className="form-field">
          <span>Condition</span>
          <input value={edge.conditionExpression ?? ""} onChange={(event) => onChange(event.target.value ? { ...edge, conditionExpression: event.target.value } : omitEdgeField(edge, "conditionExpression"))} />
        </label>
      </div>

      <label className="form-field">
        <span>Route Note</span>
        <textarea rows={4} value={edge.annotation ?? ""} onChange={(event) => onChange(event.target.value ? { ...edge, annotation: event.target.value } : omitEdgeField(edge, "annotation"))} />
      </label>
    </div>
  );
}

function CanvasMinimap({
  draft,
  nodes,
  canvasSize,
  zoom,
  viewportState,
  selectedNodeId,
  onSelectNode,
  onNavigate,
}: {
  draft: WorkflowDocument;
  nodes: WorkflowNode[];
  canvasSize: { width: number; height: number };
  zoom: number;
  viewportState: WorkflowViewportState;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onNavigate: (x: number, y: number) => void;
}) {
  const viewportStyle = {
    left: `${Math.max(0, Math.min(100, (viewportState.scrollLeft / zoom / canvasSize.width) * 100))}%`,
    top: `${Math.max(0, Math.min(100, (viewportState.scrollTop / zoom / canvasSize.height) * 100))}%`,
    width: `${Math.max(8, Math.min(100, (viewportState.clientWidth / zoom / canvasSize.width) * 100))}%`,
    height: `${Math.max(10, Math.min(100, (viewportState.clientHeight / zoom / canvasSize.height) * 100))}%`,
  };

  return (
    <div className="workflow-minimap">
      <div className="workflow-minimap__header">
        <span>Overview</span>
        <span className="workflow-status-pill workflow-status-pill--utility" data-icon="#">{draft.nodes.length} blocks</span>
      </div>
      <div className="workflow-minimap__legend">
        <span className="workflow-status-pill workflow-status-pill--navigation" data-icon="[]">Viewport</span>
        <span className="workflow-status-pill workflow-status-pill--progressive" data-icon="+">Primary Flow</span>
        <span className="workflow-status-pill workflow-status-pill--danger" data-icon="!">Error Paths</span>
      </div>
      <div
        className="workflow-minimap__surface"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * canvasSize.width;
          const y = ((event.clientY - rect.top) / rect.height) * canvasSize.height;
          onNavigate(x, y);
        }}
      >
        <div className="workflow-minimap__viewport" style={viewportStyle} />
        {nodes.map((node) => {
          const position = node.position ?? { x: 0, y: 0 };
          return (
            <button
              key={node.id}
              className={`workflow-minimap__node${selectedNodeId === node.id ? " workflow-minimap__node--selected" : ""}`}
              type="button"
              style={{
                left: `${(position.x / canvasSize.width) * 100}%`,
                top: `${(position.y / canvasSize.height) * 100}%`,
              }}
              onClick={(event) => {
                event.stopPropagation();
                onSelectNode(node.id);
              }}
              title={node.label}
            />
          );
        })}
      </div>
    </div>
  );
}
function MultiSelectionInspector({
  selectedNodes,
  onCreateGroup,
}: {
  selectedNodes: WorkflowNode[];
  onCreateGroup: () => void;
}) {
  return (
    <div className="workflow-inspector__section workflow-edge-card">
      <div className="workflow-trigger-inspector__header">
        <div>
          <p className="eyebrow">Multi-Select</p>
          <h4>{selectedNodes.length} Blocks Selected</h4>
        </div>
        <button className="secondary-action workflow-action workflow-action--progressive" data-icon="+" type="button" onClick={onCreateGroup}>
          Create Group
        </button>
      </div>
      <div className="workflow-selection-list">
        {selectedNodes.map((node) => (
          <div key={node.id} className="workflow-selection-list__item">
            <strong>{node.label}</strong>
            <span>{toDisplay(node.type)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupInspector({
  group,
  onChange,
  onDelete,
  onToggleCollapse,
}: {
  group: WorkflowNodeGroup;
  onChange: (group: WorkflowNodeGroup) => void;
  onDelete: () => void;
  onToggleCollapse: () => void;
}) {
  return (
    <div className="workflow-inspector__section workflow-edge-card">
      <div className="workflow-trigger-inspector__header">
        <div>
          <p className="eyebrow">Step Group</p>
          <h4>{group.label}</h4>
        </div>
        <div className="workflow-inline-actions">
          <button className="secondary-action workflow-action workflow-action--utility" data-icon="=" type="button" onClick={onToggleCollapse}>
            {group.collapsed ? "Expand Group" : "Collapse Group"}
          </button>
          <button className="secondary-action workflow-action workflow-action--danger" data-icon="!" type="button" onClick={onDelete}>
            Delete Group
          </button>
        </div>
      </div>
      <label className="form-field">
        <span>Group Label</span>
        <input value={group.label} onChange={(event) => onChange({ ...group, label: event.target.value })} />
      </label>
      <label className="form-field">
        <span>Step Notes</span>
        <textarea rows={4} value={group.description ?? ""} onChange={(event) => onChange(event.target.value ? { ...group, description: event.target.value } : omitGroupField(group, "description"))} />
      </label>
      <label className="form-field">
        <span>Color</span>
        <input value={group.color ?? "#10634a"} onChange={(event) => onChange({ ...group, color: event.target.value })} />
      </label>
    </div>
  );
}

function AnnotationInspector({
  annotation,
  onChange,
  onDelete,
}: {
  annotation: WorkflowAnnotation;
  onChange: (annotation: WorkflowAnnotation) => void;
  onDelete: () => void;
}) {
  return (
    <div className="workflow-inspector__section workflow-edge-card">
      <div className="workflow-trigger-inspector__header">
        <div>
          <p className="eyebrow">Canvas Note</p>
          <h4>{annotation.label}</h4>
        </div>
        <button className="secondary-action workflow-action workflow-action--danger" data-icon="!" type="button" onClick={onDelete}>
          Delete Note
        </button>
      </div>
      <div className="workflow-inspector__grid-two">
        <label className="form-field">
          <span>Label</span>
          <input value={annotation.label} onChange={(event) => onChange({ ...annotation, label: event.target.value })} />
        </label>
        <label className="form-field">
          <span>Kind</span>
          <select value={annotation.kind} onChange={(event) => onChange({ ...annotation, kind: event.target.value as WorkflowAnnotation["kind"] })}>
            <option value="note">Note</option>
            <option value="step">Step</option>
            <option value="route">Route</option>
          </select>
        </label>
      </div>
      <label className="form-field">
        <span>Content</span>
        <textarea rows={5} value={annotation.content ?? ""} onChange={(event) => onChange(event.target.value ? { ...annotation, content: event.target.value } : omitAnnotationField(annotation, "content"))} />
      </label>
    </div>
  );
}

function TriggerInspector({
  draft,
  triggerCapableActions,
  connections,
  onChange,
}: {
  draft: WorkflowDocument;
  triggerCapableActions: WorkflowAvailableAction[];
  connections: WorkflowDetailResponse["availableConnections"];
  onChange: (trigger: WorkflowDocument["trigger"]) => void;
}) {
  const config = ensureJsonObject(draft.trigger.config);
  const selectedPollingAction = draft.trigger.type === "polling"
    ? triggerCapableActions.find((action) => action.actionId === asString(config.actionId))
    : undefined;
  const pollingConnections = selectedPollingAction
    ? connections.filter((connection) => connection.connectorId === selectedPollingAction.connectorId)
    : connections;
  const updateConfig = (patch: Record<string, JsonValue>) => {
    onChange({
      ...draft.trigger,
      config: {
        ...config,
        ...patch,
      },
    });
  };
  return (
    <div className="workflow-inspector__section workflow-trigger-inspector">
      <div className="workflow-trigger-inspector__header">
        <div>
          <p className="eyebrow">Workflow Trigger</p>
          <h4>{toDisplay(draft.trigger.type)} Trigger</h4>
        </div>
        <span
          className={`workflow-trigger-inspector__summary workflow-status-pill workflow-status-pill--${getTriggerTone(draft.trigger.type)}`}
          data-icon={getTriggerIcon(draft.trigger.type)}
        >
          {describeTrigger(draft.trigger, triggerCapableActions, connections)}
        </span>
      </div>
      {draft.trigger.type === "manual" ? (
        <div className="workflow-inspector__grid-two">
          <label className="form-field">
            <span>Launch Surface</span>
            <select value={asString(config.launchSurface) ?? "technician-workspace"} onChange={(event) => updateConfig({ launchSurface: event.target.value })}>
              <option value="technician-workspace">Technician Workspace</option>
              <option value="tenant-admin">Tenant Administration</option>
              <option value="workflow-designer">Workflow Designer</option>
              <option value="connectors">Connector Studio</option>
            </select>
          </label>
          <label className="form-field">
            <span>Context Source</span>
            <select value={asString(config.contextSource) ?? "ticket"} onChange={(event) => updateConfig({ contextSource: event.target.value })}>
              <option value="ticket">Ticket</option>
              <option value="tenant">Tenant</option>
              <option value="device">Device</option>
              <option value="manual">Manual</option>
            </select>
          </label>
        </div>
      ) : null}
      {draft.trigger.type === "schedule" ? (
        <div className="workflow-inspector__grid-two">
          <label className="form-field">
            <span>Cron Expression</span>
            <input value={asString(config.cron) ?? "0 */4 * * *"} onChange={(event) => updateConfig({ cron: event.target.value })} />
          </label>
          <label className="form-field">
            <span>Timezone</span>
            <input value={asString(config.timezone) ?? "America/New_York"} onChange={(event) => updateConfig({ timezone: event.target.value })} />
          </label>
        </div>
      ) : null}
      {draft.trigger.type === "polling" ? (
        <>
          <div className="workflow-inspector__grid-two">
            <label className="form-field">
              <span>Trigger Action</span>
              <select
                value={asString(config.actionId) ?? ""}
                disabled={triggerCapableActions.length === 0}
                onChange={(event) => {
                  const nextAction = triggerCapableActions.find((action) => action.actionId === event.target.value);
                  if (!nextAction) {
                    return;
                  }
                  onChange({
                    ...draft.trigger,
                    config: {
                      ...config,
                      connectorId: nextAction.connectorId,
                      connectorVersionId: nextAction.connectorVersionId,
                      actionId: nextAction.actionId,
                      connectionId: nextAction.suggestedConnectionIds[0] ?? "",
                    },
                  });
                }}
              >
                {triggerCapableActions.map((action) => (
                  <option key={action.id} value={action.actionId}>
                    {action.connectorDisplayName} - {action.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Polling Interval (minutes)</span>
              <input
                type="number"
                min={1}
                value={asNumber(config.intervalMinutes) ?? 15}
                onChange={(event) => updateConfig({ intervalMinutes: Number(event.target.value) || 15 })}
              />
            </label>
          </div>
          <div className="workflow-inspector__grid-two">
            <label className="form-field">
              <span>Connection</span>
              <select value={asString(config.connectionId) ?? ""} onChange={(event) => updateConfig({ connectionId: event.target.value })}>
                {pollingConnections.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Detection Mode</span>
              <select value={asString(config.matchMode) ?? "new-items"} onChange={(event) => updateConfig({ matchMode: event.target.value })}>
                <option value="new-items">New Items</option>
                <option value="changed-items">Changed Items</option>
                <option value="custom-filter">Custom Filter</option>
              </select>
            </label>
          </div>
        </>
      ) : null}
      {draft.trigger.type === "webhook" ? (
        <div className="workflow-inspector__grid-two">
          <label className="form-field">
            <span>Webhook Path</span>
            <input value={asString(config.webhookPath) ?? "/hooks/inbound"} onChange={(event) => updateConfig({ webhookPath: event.target.value })} />
          </label>
          <label className="form-field">
            <span>HTTP Method</span>
            <select value={asString(config.method) ?? "POST"} onChange={(event) => updateConfig({ method: event.target.value })}>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
            </select>
          </label>
          <label className="form-field">
            <span>Signature Mode</span>
            <select value={asString(config.signatureMode) ?? "secret-header"} onChange={(event) => updateConfig({ signatureMode: event.target.value })}>
              <option value="secret-header">Secret Header</option>
              <option value="hmac">HMAC</option>
              <option value="none">None</option>
            </select>
          </label>
          <label className="form-field">
            <span>Payload Binding</span>
            <select value={asString(config.payloadBinding) ?? "body"} onChange={(event) => updateConfig({ payloadBinding: event.target.value })}>
              <option value="body">Request Body</option>
              <option value="query">Query String</option>
              <option value="headers">Headers</option>
            </select>
          </label>
        </div>
      ) : null}
      {draft.trigger.type === "queue" ? (
        <div className="workflow-inspector__grid-two">
          <label className="form-field">
            <span>Queue Name</span>
            <input value={asString(config.queueName) ?? "workflow-start"} onChange={(event) => updateConfig({ queueName: event.target.value })} />
          </label>
          <label className="form-field">
            <span>Message Type</span>
            <input value={asString(config.messageType) ?? "custom"} onChange={(event) => updateConfig({ messageType: event.target.value })} />
          </label>
        </div>
      ) : null}
    </div>
  );
}
function ConnectorActionInspector({
  node,
  actions,
  connections,
  onChange,
}: {
  node: ConnectorActionWorkflowNode;
  actions: WorkflowAvailableAction[];
  connections: WorkflowDetailResponse["availableConnections"];
  onChange: (node: ConnectorActionWorkflowNode) => void;
}) {
  const availableActions = actions.filter((action) => action.connectorId === node.connectorId);
  const availableConnections = connections.filter((connection) => connection.connectorId === node.connectorId);

  return (
    <>
      <div className="workflow-inspector__section workflow-inspector__grid-two">
        <label className="form-field">
          <span>Action</span>
          <select
            value={node.actionId}
            onChange={(event) => {
              const nextAction = actions.find((action) => action.actionId === event.target.value);
              if (!nextAction) {
                return;
              }
              onChange({
                ...node,
                connectorId: nextAction.connectorId,
                connectorVersionId: nextAction.connectorVersionId,
                actionId: nextAction.actionId,
                connectionId: nextAction.suggestedConnectionIds[0] ?? node.connectionId,
              });
            }}
          >
            {availableActions.map((action) => (
              <option key={action.id} value={action.actionId}>
                {action.displayName}
              </option>
            ))}
              </select>
        </label>
        <label className="form-field">
          <span>Connection</span>
          <select value={node.connectionId} onChange={(event) => onChange({ ...node, connectionId: event.target.value })}>
            {availableConnections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.displayName}
              </option>
            ))}
              </select>
        </label>
      </div>
      <div className="workflow-inspector__section">
        <EditableRecord label="Inputs" value={node.inputs} onChange={(value) => onChange({ ...node, inputs: value })} />
      </div>
    </>
  );
}

function AIAgentInspector({
  node,
  onChange,
}: {
  node: AIAgentWorkflowNode;
  onChange: (node: AIAgentWorkflowNode) => void;
}) {
  return (
    <>
      <div className="workflow-inspector__section workflow-inspector__grid-two">
        <label className="form-field">
          <span>Operating Mode</span>
          <select value={node.operatingMode} onChange={(event) => onChange({ ...node, operatingMode: event.target.value as AIAgentWorkflowNode["operatingMode"] })}>
            <option value="suggest-only">Suggest Only</option>
            <option value="act-with-tools">Act With Tools</option>
            <option value="approval-required">Approval Required</option>
          </select>
        </label>
        <label className="form-field">
          <span>Timeout Seconds</span>
          <input type="number" value={node.timeoutSeconds} onChange={(event) => onChange({ ...node, timeoutSeconds: Number(event.target.value) || 30 })} />
        </label>
      </div>
      <div className="workflow-inspector__section">
        <EditableRecord
          label="Input Template"
          value={node.inputTemplate}
          onChange={(value) => onChange({ ...node, inputTemplate: value })}
        />
      </div>
      <div className="workflow-inspector__section">
        <EditableRecord
          label="Output Schema"
          value={node.outputSchema}
          onChange={(value) => onChange({ ...node, outputSchema: value })}
        />
      </div>
    </>
  );
}

function EditableRecord({
  label,
  value,
  onChange,
}: {
  label: string;
  value: JsonObject;
  onChange: (value: JsonObject) => void;
}) {
  const entries = Object.entries(value ?? {});

  return (
    <div className="editable-record">
      <div className="editable-record__header">
        <span>{label}</span>
        <button className="secondary-action workflow-action workflow-action--progressive" data-icon="+" type="button" onClick={() => onChange({ ...value, newKey: "" })}>
          Add Field
        </button>
      </div>
      <div className="editable-record__rows">
        {entries.length === 0 ? <p className="editable-record__empty">No fields yet.</p> : null}
        {entries.map(([key, currentValue]) => (
          <div key={key} className="editable-record__row">
            <input
              value={key}
              onChange={(event) => {
                const nextValue = { ...value };
                delete nextValue[key];
                nextValue[event.target.value] = currentValue;
                onChange(nextValue);
              }}
            />
            <input
              value={stringifyLooseValue(currentValue)}
              onChange={(event) => onChange({ ...value, [key]: parseLooseValue(event.target.value) })}
            />
            <button
              className="secondary-action workflow-action workflow-action--danger"
              data-icon="!"
              type="button"
              onClick={() => {
                const nextValue = { ...value };
                delete nextValue[key];
                onChange(nextValue);
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function groupActionsByConnector(actions: WorkflowAvailableAction[]) {
  const groups = new Map<string, { connectorId: string; connectorDisplayName: string; items: WorkflowAvailableAction[] }>();

  for (const action of actions) {
    const existing = groups.get(action.connectorId);
    if (existing) {
      existing.items.push(action);
      continue;
    }

    groups.set(action.connectorId, {
      connectorId: action.connectorId,
      connectorDisplayName: action.connectorDisplayName,
      items: [action],
    });
  }

  return [...groups.values()].map((group) => ({
    ...group,
    items: group.items.slice().sort((left, right) => left.displayName.localeCompare(right.displayName)),
  }));
}

function getZoomValue(draft: WorkflowDocument | null): number {
  const value = draft?.editor.viewport.zoom;
  return typeof value === "number" ? value : 1;
}

function clampZoom(value: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? value : 1, 0.55), 1.4);
}

function calculateCanvasSize(draft: WorkflowDocument | null) {
  const defaultSize = { width: 1280, height: 820 };
  if (!draft || draft.nodes.length === 0) {
    return defaultSize;
  }

  const bounds = getWorkflowBounds(draft);

  return {
    width: Math.max(defaultSize.width, bounds.left + bounds.width + CANVAS_PADDING),
    height: Math.max(defaultSize.height, bounds.top + bounds.height + CANVAS_PADDING),
  };
}

function getWorkflowBounds(draft: WorkflowDocument) {
  const positions = draft.nodes.map((node) => node.position ?? { x: 0, y: 0 });
  const minX = Math.min(...positions.map((position) => position.x), 0);
  const minY = Math.min(...positions.map((position) => position.y), 0);
  const maxX = Math.max(...positions.map((position) => position.x + NODE_WIDTH), NODE_WIDTH);
  const maxY = Math.max(...positions.map((position) => position.y + NODE_HEIGHT), NODE_HEIGHT);

  return {
    left: Math.max(0, minX),
    top: Math.max(0, minY),
    width: Math.max(NODE_WIDTH + CANVAS_PADDING, maxX - minX + CANVAS_PADDING),
    height: Math.max(NODE_HEIGHT + CANVAS_PADDING, maxY - minY + CANVAS_PADDING),
  };
}

function buildEdgePath(sourceNode: WorkflowNode, targetNode: WorkflowNode): string {
  const sourceX = (sourceNode.position?.x ?? 0) + NODE_WIDTH;
  const sourceY = (sourceNode.position?.y ?? 0) + NODE_HEIGHT / 2;
  const targetX = targetNode.position?.x ?? 0;
  const targetY = (targetNode.position?.y ?? 0) + NODE_HEIGHT / 2;
  const midX = sourceX + (targetX - sourceX) / 2;
  return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
}

function updateNode(draft: WorkflowDocument, nodeId: string, updater: (node: WorkflowNode) => WorkflowNode): WorkflowDocument {
  const nextNodes = draft.nodes.map((node) => (node.id === nodeId ? updater(node) : node));
  return {
    ...draft,
    nodes: nextNodes,
    editor: {
      ...draft.editor,
      selectedNodeIds: [nodeId],
    },
  };
}

function describeNode(
  node: WorkflowNode,
  actions: WorkflowAvailableAction[],
  connections: WorkflowDetailResponse["availableConnections"],
): string {
  if (node.type === "connector-action") {
    const action = actions.find((item) => item.actionId === node.actionId && item.connectorId === node.connectorId);
    const connection = connections.find((item) => item.id === node.connectionId);
    return `${action?.displayName ?? node.actionId} via ${connection?.displayName ?? node.connectionId}`;
  }

  if (node.type === "condition") {
    return node.expression;
  }

  if (node.type === "javascript") {
    return node.inlineScript ? "Inline script step" : "Custom script reference";
  }

  if (node.type === "ai-agent") {
    return `${node.operatingMode} · ${node.agentId}`;
  }

  if (node.type === "variable") {
    return node.variableName;
  }

  if (node.type === "trigger") {
    return node.triggerType;
  }

  return toDisplay(node.type);
}

function omitEdgeField<K extends keyof WorkflowEdge>(edge: WorkflowEdge, key: K): WorkflowEdge {
  const nextEdge = { ...edge };
  delete nextEdge[key];
  return nextEdge;
}

function omitNodeField<K extends keyof WorkflowNode>(node: WorkflowNode, key: K): WorkflowNode {
  const nextNode = { ...node };
  delete nextNode[key];
  return nextNode;
}

function omitGroupField<K extends keyof WorkflowNodeGroup>(group: WorkflowNodeGroup, key: K): WorkflowNodeGroup {
  const nextGroup = { ...group };
  delete nextGroup[key];
  return nextGroup;
}

function omitAnnotationField<K extends keyof WorkflowAnnotation>(annotation: WorkflowAnnotation, key: K): WorkflowAnnotation {
  const nextAnnotation = { ...annotation };
  delete nextAnnotation[key];
  return nextAnnotation;
}

function updateEdge(draft: WorkflowDocument, edgeId: string, updater: (edge: WorkflowEdge) => WorkflowEdge): WorkflowDocument {
  return {
    ...draft,
    edges: draft.edges.map((edge) => (edge.id === edgeId ? updater(edge) : edge)),
  };
}

function removeEdgeFromDraft(draft: WorkflowDocument, edgeId: string): WorkflowDocument {
  const nextEdges = draft.edges.filter((edge) => edge.id !== edgeId);
  return {
    ...draft,
    edges: nextEdges,
  };
}

function moveNodesFromOrigins(
  draft: WorkflowDocument,
  nodeIds: string[],
  originPositions: Record<string, WorkflowCanvasPosition>,
  deltaX: number,
  deltaY: number,
): WorkflowDocument {
  const nodeIdSet = new Set(nodeIds);
  return {
    ...draft,
    nodes: draft.nodes.map((node) => {
      if (!nodeIdSet.has(node.id)) {
        return node;
      }

      const origin = originPositions[node.id] ?? node.position ?? { x: 24, y: 24 };
      return {
        ...node,
        position: {
          x: snapToGrid(Math.max(24, origin.x + deltaX)),
          y: snapToGrid(Math.max(24, origin.y + deltaY)),
        },
      };
    }),
  };
}

function normalizeRect(startX: number, startY: number, endX: number, endY: number) {
  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
}

function doesRectIntersectNode(rect: { x: number; y: number; width: number; height: number }, node: WorkflowNode) {
  const position = node.position ?? { x: 0, y: 0 };
  return !(
    position.x > rect.x + rect.width ||
    position.x + NODE_WIDTH < rect.x ||
    position.y > rect.y + rect.height ||
    position.y + NODE_HEIGHT < rect.y
  );
}

function dedupeIds(values: string[]) {
  return [...new Set(values)];
}

function getPortAnchor(node: WorkflowNode, port: WorkflowEdgeType): WorkflowCanvasPosition {
  const position = node.position ?? { x: 0, y: 0 };
  const ports = getNodePortLabels(node);
  const index = Math.max(0, ports.indexOf(port));
  const gap = NODE_HEIGHT / (ports.length + 1);
  return {
    x: position.x + NODE_WIDTH,
    y: position.y + gap * (index + 1),
  };
}

function getTargetAnchor(node: WorkflowNode): WorkflowCanvasPosition {
  const position = node.position ?? { x: 0, y: 0 };
  return {
    x: position.x,
    y: position.y + NODE_HEIGHT / 2,
  };
}

function resolvePortForNode(node: WorkflowNode, desiredPort: WorkflowEdgeType): WorkflowEdgeType {
  const ports = getNodePortLabels(node);
  return (ports.includes(desiredPort) ? desiredPort : ports[0] ?? "success") as WorkflowEdgeType;
}

function buildPreviewEdgePath(connection: WorkflowConnectionDragState, nodes: WorkflowNode[]) {
  const sourceNode = nodes.find((node) => node.id === connection.sourceNodeId);
  if (!sourceNode) {
    return "";
  }

  if (connection.reconnectEnd === "source" && connection.targetNodeId) {
    const targetNode = nodes.find((node) => node.id === connection.targetNodeId);
    if (!targetNode) {
      return "";
    }

    const target = getTargetAnchor(targetNode);
    const midX = connection.pointerX + (target.x - connection.pointerX) / 2;
    return `M ${connection.pointerX} ${connection.pointerY} C ${midX} ${connection.pointerY}, ${midX} ${target.y}, ${target.x} ${target.y}`;
  }

  const source = getPortAnchor(sourceNode, connection.sourcePort);
  const midX = source.x + (connection.pointerX - source.x) / 2;
  return `M ${source.x} ${source.y} C ${midX} ${source.y}, ${midX} ${connection.pointerY}, ${connection.pointerX} ${connection.pointerY}`;
}

function applyConnectionDrop(draft: WorkflowDocument, connection: WorkflowConnectionDragState, targetNode: WorkflowNode): WorkflowDocument {
  if (connection.edgeId && connection.reconnectEnd === "target") {
    return updateEdge(draft, connection.edgeId, (edge) => ({ ...edge, targetNodeId: targetNode.id }));
  }

  if (connection.edgeId && connection.reconnectEnd === "source") {
    const resolvedPort = resolvePortForNode(targetNode, connection.sourcePort);
    return updateEdge(draft, connection.edgeId, (edge) => ({
      ...edge,
      sourceNodeId: targetNode.id,
      sourcePort: resolvedPort,
      edgeType: resolvedPort,
    }));
  }

  return upsertConnectionEdge(draft, connection.sourceNodeId, connection.sourcePort, targetNode.id);
}

function upsertConnectionEdge(draft: WorkflowDocument, sourceNodeId: string, sourcePort: WorkflowEdgeType, targetNodeId: string): WorkflowDocument {
  const existingEdge = draft.edges.find((edge) => edge.sourceNodeId === sourceNodeId && (edge.sourcePort ?? edge.edgeType ?? "success") === sourcePort);
  const nextEdge: WorkflowEdge = {
    id: createGraphNodeId("edge"),
    sourceNodeId,
    sourcePort,
    targetNodeId,
    edgeType: sourcePort,
    label: sourcePort === "success" ? "Next" : toDisplay(sourcePort),
  };

  return {
    ...draft,
    edges: existingEdge
      ? draft.edges.map((edge) => (edge.id === existingEdge.id ? { ...edge, targetNodeId, edgeType: sourcePort, sourcePort } : edge))
      : [...draft.edges, nextEdge],
  };
}
function getGroupBounds(group: WorkflowNodeGroup, nodes: WorkflowNode[]) {
  const groupNodes = nodes.filter((node) => group.nodeIds.includes(node.id));
  if (groupNodes.length === 0) {
    return group.bounds;
  }

  const left = Math.min(...groupNodes.map((node) => node.position?.x ?? 0)) - 28;
  const top = Math.min(...groupNodes.map((node) => node.position?.y ?? 0)) - 36;
  const right = Math.max(...groupNodes.map((node) => (node.position?.x ?? 0) + NODE_WIDTH)) + 28;
  const bottom = Math.max(...groupNodes.map((node) => (node.position?.y ?? 0) + NODE_HEIGHT)) + 28;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function getGroupDisplayBounds(group: WorkflowNodeGroup, nodes: WorkflowNode[]) {
  const bounds = group.bounds ?? getGroupBounds(group, nodes);
  if (!bounds) {
    return null;
  }

  if (!group.collapsed) {
    return bounds;
  }

  return {
    x: bounds.x,
    y: bounds.y,
    width: Math.max(220, Math.min(bounds.width, 320)),
    height: 84,
  };
}

function createGroupFromSelection(draft: WorkflowDocument, nodeIds: string[]) {
  const groupId = createGraphNodeId("group");
  const group: WorkflowNodeGroup = {
    id: groupId,
    label: "Grouped Step",
    nodeIds,
    description: "Document the intent of this multi-action step.",
    color: "#10634a",
  };

  return {
    draft: {
      ...draft,
      groups: [...(draft.groups ?? []), group],
    },
    groupId,
  };
}

function updateGroupInDraft(draft: WorkflowDocument, groupId: string, updater: (group: WorkflowNodeGroup) => WorkflowNodeGroup): WorkflowDocument {
  return {
    ...draft,
    groups: (draft.groups ?? []).map((group) => (group.id === groupId ? updater(group) : group)),
  };
}

function removeGroupFromDraft(draft: WorkflowDocument, groupId: string): WorkflowDocument {
  return {
    ...draft,
    groups: (draft.groups ?? []).filter((group) => group.id !== groupId),
    annotations: (draft.annotations ?? []).filter((annotation) => annotation.groupId !== groupId),
  };
}

function addAnnotationToDraft(
  draft: WorkflowDocument,
  options: { kind: WorkflowAnnotation["kind"]; position: WorkflowCanvasPosition; edgeId?: string; groupId?: string; nodeIds?: string[] },
) {
  const annotationId = createGraphNodeId("note");
  const annotation: WorkflowAnnotation = {
    id: annotationId,
    kind: options.kind,
    label: options.kind === "route" ? "Route Note" : options.kind === "step" ? "Step Note" : "Canvas Note",
    content: options.kind === "route" ? "Document the purpose of this route." : "Add implementation notes for this part of the workflow.",
    position: options.position,
    size: { width: 220, height: 118 },
    ...(options.edgeId ? { edgeIds: [options.edgeId] } : {}),
    ...(options.groupId ? { groupId: options.groupId } : {}),
    ...(options.nodeIds?.length ? { nodeIds: options.nodeIds } : {}),
  };

  return {
    draft: {
      ...draft,
      annotations: [...(draft.annotations ?? []), annotation],
    },
    annotationId,
  };
}

function updateAnnotationInDraft(draft: WorkflowDocument, annotationId: string, updater: (annotation: WorkflowAnnotation) => WorkflowAnnotation): WorkflowDocument {
  return {
    ...draft,
    annotations: (draft.annotations ?? []).map((annotation) => (annotation.id === annotationId ? updater(annotation) : annotation)),
  };
}

function removeAnnotationFromDraft(draft: WorkflowDocument, annotationId: string): WorkflowDocument {
  return {
    ...draft,
    annotations: (draft.annotations ?? []).filter((annotation) => annotation.id !== annotationId),
  };
}

function getViewportCenter(viewport: HTMLDivElement | null, zoom: number): WorkflowCanvasPosition {
  if (!viewport) {
    return { x: 240, y: 180 };
  }

  return {
    x: (viewport.scrollLeft + viewport.clientWidth / 2) / zoom - 96,
    y: (viewport.scrollTop + viewport.clientHeight / 2) / zoom - 48,
  };
}

function removeNodeFromDraft(draft: WorkflowDocument, nodeId: string): WorkflowDocument {
  const node = draft.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return draft;
  }

  const incomingEdges = draft.edges.filter((edge) => edge.targetNodeId === nodeId);
  const outgoingEdges = draft.edges.filter((edge) => edge.sourceNodeId === nodeId);
  let nextEdges = draft.edges.filter((edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId);

  if (incomingEdges.length === 1 && outgoingEdges.length === 1) {
    const incomingEdge = incomingEdges[0]!;
    const outgoingEdge = outgoingEdges[0]!;
    nextEdges = [
      ...nextEdges,
      {
        ...incomingEdge,
        id: createGraphNodeId("edge"),
        targetNodeId: outgoingEdge.targetNodeId,
        ...(incomingEdge.conditionExpression ?? outgoingEdge.conditionExpression
          ? { conditionExpression: incomingEdge.conditionExpression ?? outgoingEdge.conditionExpression }
          : {}),
        ...(incomingEdge.edgeType ?? outgoingEdge.edgeType ? { edgeType: incomingEdge.edgeType ?? outgoingEdge.edgeType } : {}),
        ...(incomingEdge.sourcePort ?? outgoingEdge.sourcePort ? { sourcePort: incomingEdge.sourcePort ?? outgoingEdge.sourcePort } : {}),
      },
    ];
  }

  const nextDraft: WorkflowDocument = {
    ...draft,
    nodes: draft.nodes.filter((item) => item.id !== nodeId),
    edges: nextEdges,
    errorHandling: sanitizeWorkflowErrorHandling(draft.errorHandling, nodeId),
    editor: {
      ...draft.editor,
      selectedNodeIds: incomingEdges[0] ? [incomingEdges[0].sourceNodeId] : [],
    },
  };

  return {
    ...nextDraft,
    nodes: nextDraft.nodes.map((item) => {
      const nextPolicy = sanitizeNodeErrorHandling(item.errorHandling, nodeId);
      return nextPolicy ? { ...item, errorHandling: nextPolicy } : omitNodeField(item, "errorHandling");
    }),
  };
}

function sanitizeWorkflowErrorHandling(errorHandling: WorkflowDocument["errorHandling"], removedNodeId: string): WorkflowDocument["errorHandling"] {
  return {
    defaultNodePolicy: sanitizeNodeErrorHandling(errorHandling.defaultNodePolicy, removedNodeId) ?? errorHandling.defaultNodePolicy,
    ...(errorHandling.onTriggerFailure ? { onTriggerFailure: sanitizeNodeErrorHandling(errorHandling.onTriggerFailure, removedNodeId) ?? omitPolicyField(errorHandling.onTriggerFailure, "branchTargetNodeId") } : {}),
    ...(errorHandling.onUnhandledError ? { onUnhandledError: sanitizeNodeErrorHandling(errorHandling.onUnhandledError, removedNodeId) ?? omitPolicyField(errorHandling.onUnhandledError, "branchTargetNodeId") } : {}),
  };
}

function sanitizeNodeErrorHandling(policy: WorkflowErrorHandlingPolicy | undefined, removedNodeId: string): WorkflowErrorHandlingPolicy | undefined {
  if (!policy || policy.branchTargetNodeId !== removedNodeId) {
    return policy;
  }

  const nextPolicy = omitPolicyField(policy, "branchTargetNodeId");
  return {
    ...nextPolicy,
    strategy: "fail-workflow",
  };
}
function getNodePortLabels(node: WorkflowNode): WorkflowEdgeType[] {
  if (node.type === "condition") {
    return ["true", "false", "error"];
  }

  if (node.type === "trigger") {
    return ["success", "error"];
  }

  return ["success", "error"];
}

function getEdgeDisplayLabel(edge: WorkflowEdge): string | undefined {
  if (edge.label) {
    return edge.label;
  }

  if (edge.conditionExpression) {
    return edge.conditionExpression;
  }

  if (edge.edgeType && edge.edgeType !== "default") {
    return toDisplay(edge.edgeType);
  }

  if (edge.sourcePort && edge.sourcePort !== "default") {
    return toDisplay(edge.sourcePort);
  }

  return undefined;
}

function describeNodeErrorPolicy(policy?: WorkflowErrorHandlingPolicy): string {
  if (!policy) {
    return "Uses workflow default";
  }

  if (policy.strategy === "retry") {
    return `Retry ${policy.maxRetries ?? 1}x`;
  }

  if (policy.strategy === "branch") {
    return policy.branchTargetNodeId ? "Branch on error" : "Branch target needed";
  }

  if (policy.strategy === "continue") {
    return "Continue on error";
  }

  return "Fail workflow";
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function createGraphNodeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function appendBranchNode(
  draft: WorkflowDocument,
  sourceNode: WorkflowNode,
  port: WorkflowEdgeType,
): { draft: WorkflowDocument; nextSelectedNodeId: string } {
  const existingEdge = draft.edges.find((edge) => edge.sourceNodeId === sourceNode.id && (edge.sourcePort ?? edge.edgeType ?? "success") === port);
  if (existingEdge) {
    return { draft, nextSelectedNodeId: existingEdge.targetNodeId };
  }

  const sourcePosition = sourceNode.position ?? { x: 72, y: 72 };
  const nextPosition = getBranchNodePosition(sourcePosition, port);
  const nextNode = buildBranchNode(port, nextPosition);
  const nextEdge: WorkflowEdge = {
    id: createGraphNodeId("edge"),
    sourceNodeId: sourceNode.id,
    sourcePort: port,
    targetNodeId: nextNode.id,
    edgeType: port,
    label: port === "success" ? "Next" : toDisplay(port),
  };

  let nextDraft: WorkflowDocument = {
    ...draft,
    nodes: [...draft.nodes, nextNode],
    edges: [...draft.edges, nextEdge],
    editor: {
      ...draft.editor,
      selectedNodeIds: [nextNode.id],
    },
  };

  if (port === "error") {
    nextDraft = updateNode(nextDraft, sourceNode.id, (node) => ({
      ...node,
      errorHandling: {
        ...(node.errorHandling ?? draft.errorHandling.defaultNodePolicy),
        strategy: "branch",
        branchTargetNodeId: nextNode.id,
        captureAs: node.errorHandling?.captureAs ?? "nodeError",
      },
    }));

    nextDraft = {
      ...nextDraft,
      editor: {
        ...nextDraft.editor,
        selectedNodeIds: [nextNode.id],
      },
    };
  }

  return { draft: nextDraft, nextSelectedNodeId: nextNode.id };
}

function getBranchNodePosition(position: { x: number; y: number }, port: WorkflowEdgeType) {
  if (port === "true") {
    return { x: snapToGrid(position.x + 272), y: Math.max(24, snapToGrid(position.y - BRANCH_ROW_OFFSET)) };
  }

  if (port === "false" || port === "error") {
    return { x: snapToGrid(position.x + 272), y: Math.max(24, snapToGrid(position.y + BRANCH_ROW_OFFSET)) };
  }

  return { x: snapToGrid(position.x + 272), y: Math.max(24, snapToGrid(position.y)) };
}

function buildBranchNode(port: WorkflowEdgeType, position: { x: number; y: number }): WorkflowNode {
  if (port === "error") {
    return {
      id: createGraphNodeId("error_handler"),
      type: "javascript",
      label: "Handle Error",
      inlineScript: "return { resolved: false, message: input.lastError };",
      timeoutSeconds: 20,
      position,
      errorHandling: {
        strategy: "continue",
        captureAs: "handlerError",
      },
    };
  }

  return {
    id: createGraphNodeId(port === "true" ? "true_branch" : port === "false" ? "false_branch" : "next_step"),
    type: "variable",
    label: port === "true" ? "True Branch" : port === "false" ? "False Branch" : "Next Step",
    variableName: port === "true" ? "truePath" : port === "false" ? "falsePath" : "nextStep",
    valueExpression: "",
    position,
    errorHandling: {
      strategy: "continue",
      captureAs: "branchError",
    },
  };
}
function defaultTriggerDefinition(triggerType: WorkflowTriggerType, triggerCapableActions: WorkflowAvailableAction[]): WorkflowDocument["trigger"] {
  if (triggerType === "schedule") {
    return {
      type: "schedule",
      config: {
        cron: "0 */4 * * *",
        timezone: "America/New_York",
      },
    };
  }

  if (triggerType === "polling") {
    const action = triggerCapableActions[0];
    return {
      type: "polling",
      config: {
        connectorId: action?.connectorId ?? "",
        connectorVersionId: action?.connectorVersionId ?? "",
        actionId: action?.actionId ?? "",
        connectionId: action?.suggestedConnectionIds[0] ?? "",
        intervalMinutes: 15,
      },
    };
  }

  if (triggerType === "webhook") {
    return {
      type: "webhook",
      config: {
        webhookPath: "/hooks/inbound",
        method: "POST",
        signatureMode: "secret-header",
        payloadBinding: "body",
      },
    };
  }

  if (triggerType === "queue") {
    return {
      type: "queue",
      config: {
        queueName: "workflow-start",
        messageType: "custom",
      },
    };
  }

  return {
    type: "manual",
    config: {
      launchSurface: "technician-workspace",
      contextSource: "ticket",
    },
  };
}

function updateTriggerType(
  draft: WorkflowDocument,
  triggerType: WorkflowTriggerType,
  triggerCapableActions: WorkflowAvailableAction[],
): WorkflowDocument {
  return {
    ...draft,
    trigger: defaultTriggerDefinition(triggerType, triggerCapableActions),
  };
}

function describeTrigger(
  trigger: WorkflowDocument["trigger"],
  actions: WorkflowAvailableAction[],
  connections: WorkflowDetailResponse["availableConnections"],
): string {
  const config = ensureJsonObject(trigger.config);

  if (trigger.type === "schedule") {
    return `Cron ${asString(config.cron) || "0 */4 * * *"}${asString(config.timezone) ? ` · ${asString(config.timezone)}` : ""}`;
  }

  if (trigger.type === "polling") {
    const action = actions.find((item) => item.actionId === asString(config.actionId));
    const connection = connections.find((item) => item.id === asString(config.connectionId));
    return `${action?.displayName ?? "API trigger"}${connection ? ` via ${connection.displayName}` : ""}${asNumber(config.intervalMinutes) ? ` every ${asNumber(config.intervalMinutes)}m` : ""}`;
  }

  if (trigger.type === "webhook") {
    return `${asString(config.method) || "POST"} ${asString(config.webhookPath) || "/hooks/inbound"}`;
  }

  if (trigger.type === "queue") {
    return `${asString(config.queueName) || "workflow-start"} queue`;
  }

  return `${asString(config.launchSurface) || "workspace"} launch`;
}

function triggerCaption(triggerType: WorkflowTriggerType): string {
  switch (triggerType) {
    case "schedule":
      return "Run on a cron schedule without user interaction.";
    case "polling":
      return "Poll a trigger-capable API action and start when matches appear.";
    case "webhook":
      return "Expose an inbound endpoint for external integrations.";
    case "queue":
      return "Start from queue messages inside the platform runtime.";
    default:
      return "Launch from technician, admin, or other in-app context.";
  }
}

function omitPolicyField<K extends keyof WorkflowErrorHandlingPolicy>(policy: WorkflowErrorHandlingPolicy, key: K): WorkflowErrorHandlingPolicy {
  const nextPolicy = { ...policy };
  delete nextPolicy[key];
  return nextPolicy;
}

function ensureJsonObject(value: JsonObject | Record<string, unknown>): JsonObject {
  return value as JsonObject;
}

function asString(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: JsonValue | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function parseLooseValue(value: string): JsonValue {
  const trimmed = value.trim();
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (trimmed === "null") {
    return null;
  }
  if (trimmed !== "" && !Number.isNaN(Number(trimmed))) {
    return Number(trimmed);
  }
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function stringifyLooseValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

function getErrorPolicyTone(policy?: WorkflowErrorHandlingPolicy): "danger" | "utility" | "navigation" | "progressive" {
  if (!policy) {
    return "utility";
  }

  if (policy.strategy === "fail-workflow") {
    return "danger";
  }

  if (policy.strategy === "retry") {
    return "progressive";
  }

  if (policy.strategy === "branch") {
    return policy.branchTargetNodeId ? "navigation" : "danger";
  }

  return "utility";
}

function getErrorPolicyIcon(policy?: WorkflowErrorHandlingPolicy): string {
  if (!policy) {
    return ".";
  }

  if (policy.strategy === "fail-workflow") {
    return "!";
  }

  if (policy.strategy === "retry") {
    return "R";
  }

  if (policy.strategy === "branch") {
    return policy.branchTargetNodeId ? ">" : "?";
  }

  return ".";
}

function getTriggerTone(triggerType: WorkflowTriggerType): "danger" | "utility" | "navigation" | "progressive" {
  switch (triggerType) {
    case "polling":
      return "progressive";
    case "webhook":
      return "navigation";
    case "schedule":
    case "queue":
    case "manual":
    default:
      return "utility";
  }
}

function getTriggerIcon(triggerType: WorkflowTriggerType): string {
  switch (triggerType) {
    case "schedule":
      return "@";
    case "polling":
      return "~";
    case "webhook":
      return ">";
    case "queue":
      return "#";
    case "manual":
    default:
      return "+";
  }
}

function getWorkflowToneForPort(port: WorkflowEdgeType): "danger" | "utility" | "navigation" | "progressive" {
  if (port === "error") {
    return "danger";
  }

  if (port === "false") {
    return "navigation";
  }

  if (port === "true" || port === "success") {
    return "progressive";
  }

  return "utility";
}

function getWorkflowIconForPort(port: WorkflowEdgeType): string {
  if (port === "error") {
    return "!";
  }

  if (port === "false") {
    return "?";
  }

  if (port === "true" || port === "success") {
    return "+";
  }

  return ".";
}

function getContextActionTone(actionId: string): "danger" | "utility" | "navigation" | "progressive" {
  if (actionId.endsWith("delete") || actionId === "node-policy-fail") {
    return "danger";
  }

  if (actionId.includes("focus") || actionId.includes("follow") || actionId.includes("reconnect") || actionId.includes("source") || actionId.includes("target")) {
    return "navigation";
  }

  if (actionId.includes("add") || actionId.includes("retry")) {
    return "progressive";
  }

  return "utility";
}

function getContextActionIcon(actionId: string): string {
  if (actionId.endsWith("delete") || actionId === "node-policy-fail") {
    return "!";
  }

  if (actionId.includes("note")) {
    return "+";
  }

  if (actionId.includes("fit") || actionId.includes("frame")) {
    return "[]";
  }

  if (actionId.includes("focus") || actionId.includes("follow") || actionId.includes("source") || actionId.includes("target")) {
    return ">";
  }

  if (actionId.includes("reconnect")) {
    return "o";
  }

  if (actionId.includes("retry")) {
    return "R";
  }

  if (actionId.includes("select")) {
    return "#";
  }

  if (actionId.includes("toggle")) {
    return "=";
  }

  if (actionId.includes("add")) {
    return "+";
  }

  return ".";
}

function toDisplay(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)\S/g, (segment) => segment.toUpperCase());
}











































