import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  ArrowRight, 
  Play, 
  Pause, 
  CheckCircle, 
  EyeOff,
  Settings,
  Workflow,
  Circle,
  Clock,
  AlertTriangle,
  GripVertical
} from 'lucide-react';
import { ticketSystemService, type TicketStatus } from '@/lib/services/ticketSystemService';

interface TicketStatusWorkflowProps {
  statuses: TicketStatus[];
  className?: string;
}

interface WorkflowNode {
  id: string;
  status: TicketStatus;
  x: number;
  y: number;
  connections: string[];
  level: number; // 0: start, 1: middle, 2: end
}

export const TicketStatusWorkflow: React.FC<TicketStatusWorkflowProps> = ({
  statuses,
  className = ''
}) => {
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate improved workflow layout
  useEffect(() => {
    if (statuses.length === 0) return;

    const nodes: WorkflowNode[] = [];
    
    // Sort statuses by sortOrder
    const sortedStatuses = [...statuses].sort((a, b) => a.sortOrder - b.sortOrder);
    
    // Categorize statuses
    const startStatuses = sortedStatuses.filter(s => !s.isClosed && !s.isResolved && s.sortOrder <= 2);
    const endStatuses = sortedStatuses.filter(s => s.isClosed || s.isResolved);
    const middleStatuses = sortedStatuses.filter(s => !s.isClosed && !s.isResolved && s.sortOrder > 2);

    // Calculate layout dimensions - responsive
    const containerWidth = Math.max(800, windowWidth * 0.8);
    const containerHeight = Math.max(400, Math.max(startStatuses.length, middleStatuses.length, endStatuses.length) * 120 + 100);
    const nodeWidth = 140;
    const nodeHeight = 80;
    const horizontalSpacing = Math.max(200, (containerWidth - nodeWidth * 3) / 2);
    const verticalSpacing = 120;

    // Position start statuses (left side)
    startStatuses.forEach((status, index) => {
      nodes.push({
        id: status.id,
        status,
        x: 20,
        y: 60 + index * verticalSpacing,
        connections: status.allowedTransitions?.transitions || [],
        level: 0
      });
    });

    // Position middle statuses (center)
    middleStatuses.forEach((status, index) => {
      nodes.push({
        id: status.id,
        status,
        x: 20 + horizontalSpacing,
        y: 60 + index * verticalSpacing,
        connections: status.allowedTransitions?.transitions || [],
        level: 1
      });
    });

    // Position end statuses (right side)
    endStatuses.forEach((status, index) => {
      nodes.push({
        id: status.id,
        status,
        x: 20 + horizontalSpacing * 2,
        y: 60 + index * verticalSpacing,
        connections: status.allowedTransitions?.transitions || [],
        level: 2
      });
    });

    setWorkflowNodes(nodes);
  }, [statuses, windowWidth]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Drag and drop handlers
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    const node = workflowNodes.find(n => n.id === nodeId);
    if (!node) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggedNode(nodeId);
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;

    setWorkflowNodes(prev => prev.map(node => 
      node.id === draggedNode 
        ? { ...node, x: Math.max(0, Math.min(newX, 800 - 140)), y: Math.max(0, newY) }
        : node
    ));
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Add global mouse event listeners for drag
  useEffect(() => {
    if (draggedNode) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!draggedNode || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const newX = e.clientX - rect.left - dragOffset.x;
        const newY = e.clientY - rect.top - dragOffset.y;

        setWorkflowNodes(prev => prev.map(node => 
          node.id === draggedNode 
            ? { ...node, x: Math.max(0, Math.min(newX, 800 - 140)), y: Math.max(0, newY) }
            : node
        ));
      };

      const handleGlobalMouseUp = () => {
        setDraggedNode(null);
        setDragOffset({ x: 0, y: 0 });
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [draggedNode, dragOffset, workflowNodes]);

  const getStatusIcon = (status: TicketStatus) => {
    if (status.isClosed) return <EyeOff className="h-5 w-5" />;
    if (status.isResolved) return <CheckCircle className="h-5 w-5" />;
    if (status.name.toLowerCase().includes('progress')) return <Play className="h-5 w-5" />;
    if (status.name.toLowerCase().includes('pending')) return <Pause className="h-5 w-5" />;
    if (status.name.toLowerCase().includes('open')) return <Circle className="h-5 w-5" />;
    if (status.name.toLowerCase().includes('escalat')) return <AlertTriangle className="h-5 w-5" />;
    return <Clock className="h-5 w-5" />;
  };

  const getConnectionPath = (from: WorkflowNode, to: WorkflowNode) => {
    const startX = from.x + 140; // Right edge of source node
    const startY = from.y + 40;  // Center of source node
    const endX = to.x;           // Left edge of target node
    const endY = to.y + 40;      // Center of target node
    
    const controlX1 = startX + (endX - startX) * 0.3;
    const controlY1 = startY;
    const controlX2 = startX + (endX - startX) * 0.7;
    const controlY2 = endY;
    
    return `M ${startX} ${startY} C ${controlX1} ${controlY1} ${controlX2} ${controlY2} ${endX} ${endY}`;
  };

  const isConnectionValid = (from: WorkflowNode, to: WorkflowNode) => {
    // Check if the target status name is in the allowed transitions
    return from.connections.includes(to.status.name) || from.connections.includes(to.id);
  };

  const getContainerDimensions = () => {
    if (workflowNodes.length === 0) return { width: 800, height: 400 };
    
    const maxY = Math.max(...workflowNodes.map(n => n.y)) + 120;
    const maxX = Math.max(...workflowNodes.map(n => n.x)) + 160;
    
    return {
      width: Math.max(800, maxX),
      height: Math.max(400, maxY)
    };
  };

  const containerDimensions = getContainerDimensions();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Status Transition Flow
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Visual representation of how tickets can move between different statuses
            </p>
          </div>
          
          {/* Legend in header */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 border shadow-sm">
            <div className="text-xs font-semibold mb-2 text-gray-800">Legend</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-blue-500 rounded" />
                <span className="text-gray-700">Valid transition</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-red-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #ef4444, #ef4444 3px, transparent 3px, transparent 6px)' }} />
                <span className="text-gray-700">Invalid transition</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-gray-700">Resolved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-gray-700">Closed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-gray-700">Active</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 text-sm text-muted-foreground">
          💡 <strong>Tip:</strong> Drag the status cards to rearrange them. Click on a card to view details.
        </div>
        <div className="relative w-full overflow-auto border rounded-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
          <div 
            ref={containerRef}
            className="relative mx-auto"
            style={{ 
              width: Math.min(containerDimensions.width, windowWidth - 100), 
              height: containerDimensions.height,
              minHeight: '400px'
            }}
          >
            {/* SVG for connections */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ 
                width: Math.min(containerDimensions.width, windowWidth - 100), 
                height: containerDimensions.height 
              }}
            >
              {workflowNodes.map((fromNode) => 
                fromNode.connections.map((toId) => {
                  const toNode = workflowNodes.find(n => n.id === toId || n.status.name === toId);
                  if (!toNode) return null;
                  
                  const isValid = isConnectionValid(fromNode, toNode);
                  
                  return (
                    <g key={`${fromNode.id}-${toNode.id}`}>
                      <path
                        d={getConnectionPath(fromNode, toNode)}
                        stroke={isValid ? "#3b82f6" : "#ef4444"}
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray={isValid ? "none" : "8,4"}
                        opacity={isValid ? 0.8 : 0.6}
                      />
                      {/* Arrow head */}
                      <polygon
                        points="0,0 -8,-4 -8,4"
                        fill={isValid ? "#3b82f6" : "#ef4444"}
                        transform={`translate(${toNode.x}, ${toNode.y + 40}) rotate(${toNode.x > fromNode.x ? 0 : 180})`}
                        opacity={isValid ? 0.8 : 0.6}
                      />
                    </g>
                  );
                })
              )}
            </svg>

            {/* Status nodes */}
            {workflowNodes.map((node) => (
              <div
                key={node.id}
                className={`absolute w-[140px] h-[80px] transition-all duration-300 ${
                  selectedNode === node.id ? 'scale-110 z-10' : 'hover:scale-105'
                } ${draggedNode === node.id ? 'z-20 cursor-grabbing' : 'cursor-grab'}`}
                style={{ left: node.x, top: node.y }}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onClick={(e) => {
                  if (draggedNode !== node.id) {
                    setSelectedNode(selectedNode === node.id ? null : node.id);
                  }
                }}
              >
                <div className={`
                  w-full h-full rounded-xl border-2 shadow-lg flex flex-col items-center justify-center p-2
                  ${selectedNode === node.id ? 'ring-4 ring-primary ring-offset-2 shadow-xl' : 'shadow-md hover:shadow-lg'}
                  ${draggedNode === node.id ? 'shadow-2xl ring-2 ring-blue-400' : ''}
                  ${node.status.isClosed ? 'bg-red-50 border-red-300 text-red-800' : 
                    node.status.isResolved ? 'bg-green-50 border-green-300 text-green-800' : 
                    'bg-white border-gray-300 text-gray-800 hover:border-blue-300'}
                `}>
                  {/* Drag handle */}
                  <div className="absolute top-1 right-1 opacity-30 hover:opacity-60">
                    <GripVertical className="h-3 w-3" />
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                    {getStatusIcon(node.status)}
                    <span className="truncate text-center leading-tight">{node.status.name}</span>
                  </div>
                  
                  {/* Status indicators */}
                  <div className="flex items-center gap-2 mt-1">
                    {node.status.isClosed && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span className="text-xs text-red-600">Closed</span>
                      </div>
                    )}
                    {node.status.isResolved && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-xs text-green-600">Resolved</span>
                      </div>
                    )}
                    {!node.status.isClosed && !node.status.isResolved && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="text-xs text-blue-600">Active</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Column labels */}
            <div className="absolute top-4 left-20 text-xs font-medium text-muted-foreground">
              Start States
            </div>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs font-medium text-muted-foreground">
              Processing States
            </div>
            <div className="absolute top-4 right-20 text-xs font-medium text-muted-foreground">
              End States
            </div>
          </div>
        </div>

        {/* Selected node details */}
        {selectedNode && (
          <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Status Details
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNode(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </Button>
            </div>
            
            {(() => {
              const node = workflowNodes.find(n => n.id === selectedNode);
              if (!node) return null;
              
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Status Name</span>
                        <div className="mt-1">
                          <Badge className={`${ticketSystemService.getStatusColorClass(node.status.color)} text-sm px-3 py-1`}>
                            {node.status.name}
                          </Badge>
                        </div>
                      </div>
                      
                      {node.status.description && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Description</span>
                          <p className="mt-1 text-sm text-gray-700">{node.status.description}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Properties</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {node.status.isClosed && (
                            <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">
                              Closes Ticket
                            </Badge>
                          )}
                          {node.status.isResolved && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                              Resolves Ticket
                            </Badge>
                          )}
                          {!node.status.isClosed && !node.status.isResolved && (
                            <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 bg-blue-50">
                              Active Status
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-gray-600">Allowed Transitions</span>
                        <div className="mt-1">
                          <span className="text-sm text-gray-700">
                            {node.connections.length} transition{node.connections.length !== 1 ? 's' : ''} configured
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {node.connections.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Transition Targets</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {node.connections.map((connectionId) => {
                          const targetStatus = statuses.find(s => s.id === connectionId || s.name === connectionId);
                          if (!targetStatus) return null;
                          
                          return (
                            <Badge 
                              key={connectionId}
                              variant="secondary" 
                              className="text-xs bg-gray-100 text-gray-700 border-gray-200"
                            >
                              {targetStatus.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
