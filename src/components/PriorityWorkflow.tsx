import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  ArrowUp, 
  ArrowDown, 
  Clock, 
  AlertCircle,
  Zap,
  Flame,
  Star,
  Settings,
  TrendingUp
} from 'lucide-react';
import { type TicketPriority } from '@/lib/services/ticketSystemService';

interface PriorityWorkflowProps {
  priorities: TicketPriority[];
  className?: string;
}

interface PriorityNode {
  id: string;
  priority: TicketPriority;
  x: number;
  y: number;
  connections: string[];
}

export const PriorityWorkflow: React.FC<PriorityWorkflowProps> = ({
  priorities,
  className = ''
}) => {
  const [workflowNodes, setWorkflowNodes] = useState<PriorityNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    // Sort priorities by level
    const sortedPriorities = [...priorities].sort((a, b) => (a.level || 1) - (b.level || 1));
    
    // Create workflow nodes
    const nodes: PriorityNode[] = sortedPriorities.map((priority, index) => ({
      id: priority.id,
      priority,
      x: 50 + (index * 150),
      y: 100,
      connections: []
    }));

    // Add connections between adjacent priorities
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].connections.push(nodes[i + 1].id);
    }

    setWorkflowNodes(nodes);
  }, [priorities]);

  const getPriorityIcon = (level: number) => {
    if (level >= 5) {
      return <Flame className="h-4 w-4 text-red-600" />;
    } else if (level >= 4) {
      return <Zap className="h-4 w-4 text-orange-600" />;
    } else if (level >= 3) {
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    } else if (level >= 2) {
      return <Clock className="h-4 w-4 text-blue-600" />;
    } else {
      return <Star className="h-4 w-4 text-green-600" />;
    }
  };

  const getPriorityColorClasses = (level: number) => {
    if (level >= 5) {
      return 'bg-red-100 text-red-700 border-red-200';
    } else if (level >= 4) {
      return 'bg-orange-100 text-orange-700 border-orange-200';
    } else if (level >= 3) {
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    } else if (level >= 2) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    } else {
      return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getSLAStatus = (slaHours: number) => {
    if (slaHours <= 2) {
      return { status: 'Critical', color: 'text-red-600' };
    } else if (slaHours <= 8) {
      return { status: 'Urgent', color: 'text-orange-600' };
    } else if (slaHours <= 24) {
      return { status: 'Standard', color: 'text-yellow-600' };
    } else {
      return { status: 'Low', color: 'text-green-600' };
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Priority Flow Visualization */}
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Priority Escalation Flow</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Higher Priority → Lower SLA</span>
          </div>
        </div>
        
        <div className="relative h-32 overflow-x-auto">
          <div className="flex items-center gap-4 min-w-full">
            {workflowNodes.map((node, index) => (
              <div key={node.id} className="flex items-center">
                {/* Priority Node */}
                <div
                  className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                    selectedNode === node.id 
                      ? 'border-primary shadow-md' 
                      : 'border-gray-200'
                  } ${getPriorityColorClasses(node.priority.level || 1)}`}
                  onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                >
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(node.priority.level || 1)}
                    <div className="text-center">
                      <div className="font-medium text-sm">{node.priority.name}</div>
                      <div className="text-xs opacity-75">
                        Level {node.priority.level || 1}
                      </div>
                    </div>
                  </div>
                  
                  {/* SLA Indicator */}
                  <div className="absolute -top-2 -right-2">
                    <Badge variant="outline" className="text-xs bg-white">
                      {node.priority.slaHours}h
                    </Badge>
                  </div>
                </div>
                
                {/* Arrow to next priority */}
                {index < workflowNodes.length - 1 && (
                  <div className="flex items-center mx-2">
                    <ArrowUp className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Priority Details */}
      {selectedNode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Priority Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const node = workflowNodes.find(n => n.id === selectedNode);
              if (!node) return null;
              
              const priority = node.priority;
              const slaStatus = getSLAStatus(priority.slaHours || 24);
              
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Priority Level</h4>
                      <p className="text-lg font-semibold">{priority.name}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">SLA Status</h4>
                      <p className={`text-lg font-semibold ${slaStatus.color}`}>
                        {slaStatus.status}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Response Time</h4>
                      <p className="text-lg font-semibold">{priority.slaHours || 24} hours</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Escalation</h4>
                      <p className="text-lg font-semibold">
                        {Math.floor((priority.slaHours || 24) * 0.8)} hours
                      </p>
                    </div>
                  </div>
                  
                  {priority.description && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Description</h4>
                      <p className="text-sm">{priority.description}</p>
                    </div>
                  )}
                  
                  {/* Escalation Rules */}
                  {priority.escalationRules?.rules && priority.escalationRules.rules.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Escalation Rules</h4>
                      <div className="space-y-1">
                        {priority.escalationRules.rules.map((rule: any, index: number) => (
                          <div key={index} className="text-sm p-2 bg-muted/50 rounded">
                            {rule.description || `Rule ${index + 1}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  

                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* SLA Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            SLA Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {priorities.map((priority) => {
              const slaStatus = getSLAStatus(priority.slaHours || 24);
              return (
                <div key={priority.id} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getPriorityIcon(priority.level || 1)}
                    <span className="font-medium text-sm">{priority.name}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">SLA:</span>
                      <span className="font-medium">{priority.slaHours || 24}h</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={`font-medium ${slaStatus.color}`}>
                        {slaStatus.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
