import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { PageWrapper, PageSection } from '@/components/PageWrapper';
import { ticketTasks, helpdeskTickets, type TicketTask } from '@/data/mockData';
import { generateId } from '@/lib/utils';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Plus, 
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  FileText,
  Target
} from 'lucide-react';
import { useState, type FC } from 'react';
import { Link } from 'react-router-dom';

const getStatusColor = (status: TicketTask['status']) => {
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

const getPriorityColor = (priority: TicketTask['priority']) => {
  switch (priority) {
    case 'critical':
      return 'text-red-600';
    case 'high':
      return 'text-orange-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-green-600';
    default:
      return 'text-muted-foreground';
  }
};

const getPriorityIcon = (priority: TicketTask['priority']) => {
  switch (priority) {
    case 'critical':
      return <AlertCircle className="h-4 w-4" />;
    case 'high':
      return <AlertCircle className="h-4 w-4" />;
    case 'medium':
      return <Clock className="h-4 w-4" />;
    case 'low':
      return <CheckCircle2 className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

export const ProjectsPage: FC = () => {
  const [tasksList, setTasksList] = useState<TicketTask[]>(ticketTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TicketTask['priority']>('medium');
  const [newTaskTicketId, setNewTaskTicketId] = useState('');

  // Filter tasks based on search query, status, and priority
  const filteredTasks = tasksList.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const addTask = () => {
    if (!newTaskTitle.trim() || !newTaskDescription.trim() || !newTaskTicketId) return;

    const newTask: TicketTask = {
      id: generateId(),
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim(),
      status: 'pending',
      priority: newTaskPriority,
      progress: 0,
      ticketId: newTaskTicketId,
      startDate: new Date(),
      estimatedHours: 2
    };

    setTasksList([...tasksList, newTask]);
    setIsAddDialogOpen(false);
    
    // Reset form
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskPriority('medium');
    setNewTaskTicketId('');
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getTicketTitle = (ticketId: string) => {
    const ticket = helpdeskTickets.find(t => t.id === ticketId);
    return ticket ? ticket.title : 'Unknown Ticket';
  };

  return (
    <div className="min-h-screen bg-background">
      <PageWrapper className="max-w-[1500px] lg:pl-[calc(var(--sidebar-width,14rem)+1.5rem)] py-6">
        {/* Header Section */}
        <PageSection index={0}>
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Ticket Tasks</h1>
                <p className="text-muted-foreground">
                  Manage and track tasks related to support tickets
                </p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Task</DialogTitle>
                    <DialogDescription>
                      Create a new task for a support ticket
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Task Title</Label>
                      <Input
                        id="title"
                        placeholder="Enter task title"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Enter task description"
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={newTaskPriority} onValueChange={(value: TicketTask['priority']) => setNewTaskPriority(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ticket">Ticket</Label>
                        <Select value={newTaskTicketId} onValueChange={setNewTaskTicketId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ticket" />
                          </SelectTrigger>
                          <SelectContent>
                            {helpdeskTickets.map((ticket) => (
                              <SelectItem key={ticket.id} value={ticket.id}>
                                #{ticket.ticketNumber} - {ticket.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addTask}>Add Task</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </PageSection>

        {/* Filters Section */}
        <PageSection index={1}>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredTasks.length} of {tasksList.length} tasks
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>

        {/* Tasks Grid */}
        <PageSection index={2}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task, index) => (
              <Card 
                key={task.id} 
                className="hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-300"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium text-sm line-clamp-2">{task.title}</h3>
                        <p className="text-xs text-muted-foreground">#{task.id}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {getPriorityIcon(task.priority)}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Progress</span>
                        <span className="text-xs font-medium">{task.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge className={`${getStatusColor(task.status)} text-xs`}>
                        {task.status.replace('-', ' ')}
                      </Badge>
                      <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
                        {task.priority}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Ticket:</span>
                        <span className="font-medium">{task.ticketId}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Assigned:</span>
                        <span className="font-medium">{task.assignedTo || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Started:</span>
                        <span className="font-medium">{formatDate(task.startDate)}</span>
                      </div>
                      {task.dueDate && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Due:</span>
                          <span className="font-medium">{formatDate(task.dueDate)}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {getTicketTitle(task.ticketId)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </PageSection>

        {filteredTasks.length === 0 && (
          <PageSection index={3}>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                <p className="text-muted-foreground text-center">
                  No tasks match your current search criteria.
                </p>
              </CardContent>
            </Card>
          </PageSection>
        )}
      </PageWrapper>
    </div>
  );
};
