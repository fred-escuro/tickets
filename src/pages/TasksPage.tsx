import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { PageWrapper, PageSection } from '@/components/PageWrapper';
import { Breadcrumb } from '@/components/Breadcrumb';
import { type FC, useEffect, useState } from 'react';
import { type TicketTask } from '@/data/mockData';
import { apiClient, API_ENDPOINTS } from '@/lib/api';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  UserPlus,
  User
} from 'lucide-react';
 
import { Link, useNavigate } from 'react-router-dom';

const getStatusColor = (status: any) => {
  const s = String(status || '').toLowerCase().replace(/_/g, '-');
  switch (s) {
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

const getPriorityColor = (priority: any) => {
  const p = String(priority || '').toLowerCase();
  switch (p) {
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

const getPriorityIcon = (priority: any) => {
  const p = String(priority || '').toLowerCase();
  switch (p) {
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

export const TaskPage: FC = () => {
  const navigate = useNavigate();
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<any>('medium');
  const [newTaskTicketId, setNewTaskTicketId] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  
  // Assignment dialog state
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<any>(null);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [ticketsRes, usersRes] = await Promise.all([
        apiClient.get(API_ENDPOINTS.TICKETS.LIST + '?limit=100'),
        apiClient.get(API_ENDPOINTS.USERS.LIST)
      ]);
      if (ticketsRes.success) setTickets((ticketsRes.data as any[]) || []);
      if (usersRes.success) {
        setUsers((usersRes.data as any[]) || []);
      }
      // Flatten tasks: fetch tasks for each ticket (basic version)
      const allTasks: any[] = [];
      const ticketsData: any[] = ((ticketsRes.data as any[]) || []);
      for (const t of ticketsData) {
        const tr = await apiClient.get(API_ENDPOINTS.TICKETS.GET(t.id));
        const trData: any = tr.data || {};
        if (tr.success && Array.isArray(trData.tasks)) {
          for (const task of trData.tasks) allTasks.push({ ...task, ticketId: t.id, ticketNumber: t.ticketNumber, ticketTitle: t.title });
        }
      }
      setTasksList(allTasks);
    };
    load();
  }, []);

  // Filter tasks based on search query, status, and priority (normalize when tasks have related objects)
  const filteredTasks = tasksList.filter(task => {
    const title = String(task.title || '');
    const description = String(task.description || '');
    const rawStatus = typeof task.status === 'object' ? (task.status?.key || task.status?.name) : task.status;
    const rawPriority = typeof task.priority === 'object' ? (task.priority?.key || task.priority?.name) : task.priority;
    const statusNorm = String(rawStatus || '').toLowerCase().replace(/_/g, '-');
    const priorityNorm = String(rawPriority || '').toLowerCase();
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || statusNorm === filterStatus;
    const matchesPriority = filterPriority === 'all' || priorityNorm === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const addTask = async () => {
    if (!newTaskTitle.trim() || !newTaskTicketId) return;
    try {
      const res = await apiClient.post(API_ENDPOINTS.TICKETS.TASKS_CREATE(newTaskTicketId), {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
        priority: newTaskPriority.toUpperCase()
      });
      if (!res.success) throw new Error(res.error || 'Failed to create task');
      setIsAddDialogOpen(false);
      setNewTaskTitle(''); setNewTaskDescription(''); setNewTaskPriority('medium'); setNewTaskTicketId('');
      // reload one ticket details and append
      const created: any = res.data || {};
      const tr = await apiClient.get(API_ENDPOINTS.TICKETS.GET(created.ticketId || newTaskTicketId));
      const trData: any = tr.data || {};
      if (tr.success && Array.isArray(trData.tasks)) {
        const t: any = trData;
        const fresh = trData.tasks.map((task: any) => ({ ...task, ticketId: t.id, ticketNumber: t.ticketNumber, ticketTitle: t.title }));
        setTasksList(prev => [...prev.filter(x => x.ticketId !== t.id), ...fresh]);
      }
      toast.success('Task created');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create task');
    }
  };

  const handleAssignTask = (task: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setSelectedTaskForAssignment(task);
    setSelectedAssignee(task.assignedTo || 'unassigned');
    setIsAssignDialogOpen(true);
  };

  const assignTask = async () => {
    if (!selectedTaskForAssignment) return;
    try {
      const assigneeValue = selectedAssignee === 'unassigned' ? null : selectedAssignee;
      const res = await apiClient.patch(API_ENDPOINTS.TICKETS.TASK_ASSIGN(selectedTaskForAssignment.ticketId, selectedTaskForAssignment.id), {
        assignedTo: assigneeValue
      });
      if (!res.success) throw new Error(res.error || 'Failed to assign task');
      
      // Update the task in the list
      setTasksList(prev => prev.map(task => 
        task.id === selectedTaskForAssignment.id 
          ? { ...task, assignedTo: assigneeValue }
          : task
      ));
      
      toast.success('Task assigned successfully');
      setIsAssignDialogOpen(false);
      setSelectedTaskForAssignment(null);
      setSelectedAssignee('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to assign task');
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  };

  const getTicketTitle = (ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    return ticket ? ticket.title : 'Unknown Ticket';
  };

  return (
    <div className="min-h-screen bg-background">
      <PageWrapper className="max-w-[1500px] lg:pl-[calc(var(--sidebar-width,14rem)+1.5rem)] py-6">
        {/* Header Section */}
        <PageSection index={0}>
          <div className="mb-6">
            <Breadcrumb 
              items={[
                { label: 'Tasks', current: true }
              ]} 
              className="mb-4"
            />
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
                            {tickets.map((ticket) => (
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
        <PageSection index={1} className="mt-2">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-base">Search & Filter</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
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
                
                <div className="space-y-2 md:justify-self-end">
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
                
                <div className="space-y-2 md:justify-self-end">
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
                
                <div className="text-right text-sm text-muted-foreground">
                  Showing {filteredTasks.length} of {tasksList.length} tasks
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>

        {/* Tasks Grid */}
        <PageSection index={2} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task, index) => (
              <Card 
                key={task.id} 
                className="group hover:shadow-xl hover:bg-gradient-to-br hover:from-blue-50/60 hover:to-blue-100/30 dark:hover:from-white/5 dark:hover:to-white/[0.03] hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-300 cursor-pointer border-border hover:border-primary/20 dark:hover:border-white/10 hover:ring-2 hover:ring-primary/10 dark:hover:ring-white/10 relative overflow-hidden"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
                role="button"
                onClick={() => navigate(`/tasks/${task.id}?ticketId=${task.ticketId}`)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <CardContent className="p-4 flex flex-col h-full">
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1 flex-1">
                        <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors duration-300">{task.title}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">#{task.id}</Badge>
                          {task.ticketNumber && (
                            <Badge variant="secondary" className="text-xs font-mono">Ticket #{task.ticketNumber}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 group-hover:scale-110 transition-transform duration-300 p-2 bg-primary/10 rounded-lg ml-2">
                        {getPriorityIcon(task.priority)}
                      </div>
                    </div>
                    
                    {/* Status and Priority */}
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className={`${getStatusColor(typeof task.status === 'object' ? (task.status?.key || task.status?.name) : task.status)} border text-xs rounded-full px-2.5 py-0.5 group-hover:scale-105 transition-transform duration-300 shadow-sm hover:brightness-95`}> 
                        <div className="flex items-center gap-1">
                          {(() => {
                            const s = String(task.status || '').toLowerCase();
                            if (s.includes('progress')) return <Clock className="h-3 w-3" />;
                            if (s.includes('complete')) return <CheckCircle2 className="h-3 w-3" />;
                            if (s.includes('block')) return <AlertCircle className="h-3 w-3" />;
                            return <FileText className="h-3 w-3" />;
                          })()}
                          <span className="capitalize font-medium">{String(typeof task.status === 'object' ? (task.status?.name || task.status?.key) : task.status || '').replace(/-/g, ' ')}</span>
                        </div>
                      </Badge>
                      <Badge variant="outline" className={`${getPriorityColor(typeof task.priority === 'object' ? (task.priority?.key || task.priority?.name) : task.priority)} text-xs rounded-full px-2.5 py-0.5 group-hover:scale-105 transition-transform duration-300 shadow-sm font-medium`}>
                        {(String(typeof task.priority === 'object' ? (task.priority?.name || task.priority?.key) : task.priority || '') || 'unknown').toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs rounded-full px-2.5 py-0.5 group-hover:scale-105 transition-transform duration-300 shadow-sm font-medium bg-purple-100 text-purple-700 border-purple-200">
                        Assigned: {task.assignedTo ? (() => {
                          const user = users.find(u => u.id === task.assignedTo);
                          return user ? `${user.firstName} ${user.lastName}` : task.assignedTo;
                        })() : 'Unassigned'}
                      </Badge>
                    </div>
                    
                    {/* Progress */}
                    <div className="space-y-2 mb-3">
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
                    
                    {/* Details */}
                    <div className="space-y-2 mb-3 flex-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Assigned:</span>
                        <span className="font-medium">
                          {task.assignedTo ? (() => {
                            const user = users.find(u => u.id === task.assignedTo);
                            return user ? `${user.firstName} ${user.lastName}` : task.assignedTo;
                          })() : 'Unassigned'}
                        </span>
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
                    
                    {/* Footer - Description and Ticket Info */}
                    <div className="pt-2 border-t border-border/50 space-y-1">
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {task.description || 'No description provided'}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {getTicketTitle(task.ticketId)}
                      </p>
                      
                      {/* Assign To Button */}
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={(e) => handleAssignTask(task, e)}
                        >
                          <UserPlus className="h-3 w-3" />
                          {task.assignedTo ? 'Reassign' : 'Assign To'}
                        </Button>
                      </div>
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

        {/* Assignment Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Assign Task
              </DialogTitle>
              <DialogDescription>
                Assign this task to a team member
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Task Title */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Task</Label>
                <div className="text-sm text-muted-foreground truncate" title={selectedTaskForAssignment?.title}>
                  {selectedTaskForAssignment?.title}
                </div>
              </div>

              {/* Current Assignee */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Current Assignee</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {selectedTaskForAssignment?.assignedTo ? (() => {
                      const user = users.find(u => u.id === selectedTaskForAssignment.assignedTo);
                      return user ? `${user.firstName} ${user.lastName}` : selectedTaskForAssignment.assignedTo;
                    })() : 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Assignee Selection */}
              <div className="space-y-2">
                <Label htmlFor="assignee" className="text-sm font-medium">
                  Assign To
                </Label>
                <div className="relative">
                  <Input
                    id="assignee"
                    placeholder="Type to search assignees..."
                    value={selectedAssignee === 'unassigned' ? 'Unassigned' : 
                           selectedAssignee ? (() => {
                             const user = users.find(u => u.id === selectedAssignee);
                             if (user) {
                               const roleText = (user.roles && user.roles.length > 0) ? ` (${user.roles[0].role.name})` : '';
                               return `${user.firstName} ${user.lastName}${roleText}`;
                             }
                             return '';
                           })() : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.toLowerCase() === 'unassigned') {
                        setSelectedAssignee('unassigned');
                      } else {
                        // Find matching user
                        const matchingUser = users.find(user => 
                          `${user.firstName} ${user.lastName}`.toLowerCase().includes(value.toLowerCase()) ||
                          user.email.toLowerCase().includes(value.toLowerCase()) ||
                          (user.roles && user.roles.length > 0 && user.roles[0].role.name.toLowerCase().includes(value.toLowerCase()))
                        );
                        if (matchingUser) {
                          setSelectedAssignee(matchingUser.id);
                        } else {
                          setSelectedAssignee('');
                        }
                      }
                    }}
                    onFocus={() => setShowUserSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowUserSuggestions(false), 200)}
                  />
                  {showUserSuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div 
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => {
                          setSelectedAssignee('unassigned');
                          setShowUserSuggestions(false);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>Unassigned</span>
                        </div>
                      </div>
                      {users.map((user) => (
                        <div 
                          key={user.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => {
                            setSelectedAssignee(user.id);
                            setShowUserSuggestions(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                              {user.roles && user.roles.length > 0 && (
                                <div className="text-xs text-blue-600 font-medium mt-1">
                                  {user.roles[0].role.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={assignTask}>
                Assign Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageWrapper>
    </div>
  );
};
