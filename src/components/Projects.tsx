import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ticketTasks } from '@/data/mockData';
import { ArrowRight, FileText, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useWaveAnimation } from '@/hooks/useWaveAnimation';
import { type FC } from 'react';
import { Link } from 'react-router-dom';

export const Projects: FC = () => {
  const { containerRef, getItemStyle, getItemClassName } = useWaveAnimation();
  
  const recentTasks = ticketTasks.slice(0, 3);
  const pendingTasks = ticketTasks.filter(task => task.status === 'pending').length;
  const inProgressTasks = ticketTasks.filter(task => task.status === 'in-progress').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-gray-600 bg-gray-50 text-gray-700 dark:border-gray-300 dark:bg-gray-100 dark:text-gray-800';
      case 'in-progress':
        return 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-300 dark:bg-blue-100 dark:text-blue-800';
      case 'completed':
        return 'border-green-600 bg-green-50 text-green-700 dark:border-green-300 dark:bg-green-100 dark:text-green-800';
      case 'blocked':
        return 'border-red-600 bg-red-50 text-red-700 dark:border-red-300 dark:bg-red-100 dark:text-red-800';
      default:
        return 'border-muted-foreground/20 bg-muted text-muted-foreground';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return <AlertCircle className="h-3 w-3" />;
      case 'medium':
        return <Clock className="h-3 w-3" />;
      case 'low':
        return <CheckCircle2 className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold">Ticket Tasks</CardTitle>
        <Link to="/tasks">
          <Button variant="ghost" size="sm" className="gap-2 h-8">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent ref={containerRef} className="space-y-4">
        {/* Task Stats */}
        <div 
          className={getItemClassName("grid grid-cols-2 gap-3")}
          style={getItemStyle(0)}
        >
          <div className="space-y-1 p-4 rounded-lg bg-muted/30 border text-center">
            <p className="text-lg font-bold text-blue-600">{pendingTasks}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="space-y-1 p-4 rounded-lg bg-muted/30 border text-center">
            <p className="text-lg font-bold text-orange-600">{inProgressTasks}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
        </div>

        {/* Recent Tasks */}
        <div 
          className={getItemClassName("space-y-3")}
          style={getItemStyle(1)}
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Recent Tasks</h4>
          </div>
          
          {recentTasks.length > 0 ? (
            <div className="space-y-2">
              {recentTasks.map((task, index) => (
                <div 
                  key={task.id} 
                  className={getItemClassName("p-2 rounded-lg bg-muted/30 space-y-2")}
                  style={getItemStyle(2 + index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.ticketId} • {task.assignedTo || 'Unassigned'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Badge className={`${getStatusColor(task.status)} border text-xs px-1.5 py-0.5`}>
                        {task.status.replace('-', ' ')}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground capitalize">
                      {task.priority} Priority
                    </span>
                    <div className="flex items-center gap-1">
                      {getPriorityIcon(task.priority)}
                      <span className="text-xs text-muted-foreground">
                        {task.progress}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              className={getItemClassName("text-center py-4")}
              style={getItemStyle(2)}
            >
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No tasks found</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div 
          className={getItemClassName("pt-3 border-t")}
          style={getItemStyle(5)}
        >
          <Link to="/tasks" className="block">
            <Button variant="outline" size="sm" className="w-full justify-center gap-2 h-8">
              <FileText className="h-3 w-3" />
              <span className="text-xs">View All Tasks</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
