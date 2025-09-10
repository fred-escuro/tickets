import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TicketStatusBadge } from '@/components/TicketStatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { TicketStatusChange } from '@/components/TicketStatusChange';
import { AttachmentDisplay } from '@/components/ui/attachment-display';
import { RichTextDisplay } from '@/components/ui/rich-text-display';
import { AddCommentDialog } from '@/components/ui/add-comment-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TicketDetailPanel from '@/components/TicketDetailPanel';
import { CommentService } from '@/lib/services/commentService';
import { UserService, type User as UserType } from '@/lib/services/userService';
import type { FileAttachment } from '@/components/ui/file-upload';
import { apiClient, API_ENDPOINTS } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Paperclip, MessageSquare, ChevronDown, ChevronRight, FileText, Settings, Clock, ChevronUp, CheckSquare, UserPlus, User } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TicketStatusHistory } from '@/components/TicketStatusHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ticketSystemService } from '@/lib/services/ticketSystemService';
import { TaskStatusChangeDialog } from '@/components/TaskStatusChangeDialog';
import { TaskCommentDialog } from '@/components/TaskCommentDialog';
import { Breadcrumb } from '@/components/Breadcrumb';

type LoadedTicket = any;

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [ticket, setTicket] = useState<LoadedTicket | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [isOverviewOpen, setIsOverviewOpen] = useState(true);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [taskComments, setTaskComments] = useState<Record<string, any[]>>({});
  const [taskCommentDraft, setTaskCommentDraft] = useState<Record<string, string>>({});
  const [taskCommentsLoading, setTaskCommentsLoading] = useState<Record<string, boolean>>({});
  const [taskStatusHistory, setTaskStatusHistory] = useState<Record<string, any[]>>({});
  const [taskStatusHistoryLoading, setTaskStatusHistoryLoading] = useState<Record<string, boolean>>({});
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [showTaskStatusDialog, setShowTaskStatusDialog] = useState(false);
  const [selectedTaskForStatusChange, setSelectedTaskForStatusChange] = useState<{ id: string; title: string; currentStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' } | null>(null);
  const [showTaskCommentDialog, setShowTaskCommentDialog] = useState(false);
  const [selectedTaskForComment, setSelectedTaskForComment] = useState<{ id: string; title: string } | null>(null);
  
  // Assignment dialog state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<{ id: string; title: string; assignedTo?: string } | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);

  // Persist selected tab via URL param (?tab=overview|status|timeline|tasks)
  const initialTab = (searchParams.get('tab') || 'overview') as 'overview' | 'status' | 'timeline' | 'tasks';
  const [activeTab, setActiveTab] = useState<'overview' | 'status' | 'timeline' | 'tasks'>(initialTab);

  useEffect(() => {
    const tab = (searchParams.get('tab') as any) as 'overview' | 'status' | 'timeline' | 'tasks' | null;
    if (tab && tab !== activeTab) setActiveTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    const next = (val as any) as 'overview' | 'status' | 'timeline' | 'tasks';
    setActiveTab(next);
    const p = new URLSearchParams(searchParams);
    p.set('tab', next);
    setSearchParams(p, { replace: true });
  };

  const fetchTicket = async () => {
    if (!id) return;
    setLoading(true);
    const res = await apiClient.get(API_ENDPOINTS.TICKETS.GET(id));
    if (res.success) {
      setTicket(res.data);
    } else {
      toast.error(res.error || 'Failed to load ticket');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTicket();
    loadUsers();
  }, [id]);

  useEffect(() => {
    if (id) void loadComments();
  }, [id]);

  const statusName = useMemo(() => {
    if (!ticket) return '';
    return typeof ticket.status === 'string' ? ticket.status : ticket.status?.name || '';
  }, [ticket]);

  // priorityName no longer used

  const canWriteTasks = useMemo(() => {
    try {
      const u: any = JSON.parse(localStorage.getItem('user') || 'null');
      const roleNames: string[] = Array.isArray(u?.roles) ? u.roles.map((r: any) => r?.role?.name?.toLowerCase()).filter(Boolean) : (u?.role ? [String(u.role).toLowerCase()] : []);
      const perms: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
      return roleNames.includes('admin') || perms.includes('tickets:write');
    } catch { return false; }
  }, []);

  const getPriorityPillClasses = (priorityLabel: string): string => {
    const p = String(priorityLabel || '').toLowerCase();
    if (p === 'low') return 'bg-green-100 text-green-700 border-green-200';
    if (p === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (p === 'high') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (p === 'critical') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const addTask = async () => {
    if (!id) return;
    const title = newTaskTitle.trim();
    const description = newTaskDescription.trim();
    const assignee = newTaskAssignee.trim();
    if (!title) { toast.error('Task title is required'); return; }
    try {
      const res = await apiClient.post(API_ENDPOINTS.TICKETS.TASKS_CREATE(id), {
        title,
        description,
        priority: newTaskPriority,
        ...(assignee && { assignee })
      });
      if (!res.success) throw new Error(res.error || 'Failed to create task');
      
      // Automatically add a comment to the ticket timeline
      try {
        const assignedUser = assignee ? users.find(u => u.id === assignee) : null;
        const assigneeText = assignedUser 
          ? ` assigned to ${assignedUser.firstName} ${assignedUser.lastName}`
          : '';
        
        const commentContent = `Task "${title}" created${assigneeText} with ${newTaskPriority.toLowerCase()} priority.`;
        
        await CommentService.createComment({
          ticketId: id,
          content: commentContent,
          isInternal: false
        });
        
        console.log('Task creation comment added successfully');
      } catch (commentError) {
        console.error('Failed to add task creation comment:', commentError);
        // Don't fail the task creation if comment fails
      }
      
      toast.success('Task created');
      setShowAddTask(false);
      setNewTaskTitle(''); setNewTaskDescription(''); setNewTaskPriority('MEDIUM'); setNewTaskAssignee('');
      await fetchTicket();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create task');
    }
  };

  const loadTaskComments = async (taskId: string) => {
    try {
      setTaskCommentsLoading(prev => ({ ...prev, [taskId]: true }));
      const res = await apiClient.get(`/api/tickets/${id}/tasks/${taskId}/comments`);
      if (res.success) setTaskComments((prev: Record<string, any[]>) => ({ ...prev, [taskId]: (res.data as any[]) || [] }));
      else toast.error(res.error || 'Failed to load task comments');
    } catch (e) {
      toast.error('Failed to load task comments');
    } finally {
      setTaskCommentsLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const loadTaskStatusHistory = async (taskId: string) => {
    try {
      setTaskStatusHistoryLoading(prev => ({ ...prev, [taskId]: true }));
      const res = await apiClient.get(API_ENDPOINTS.TICKETS.TASK_STATUS_HISTORY(id as string, taskId));
      if (res.success) setTaskStatusHistory((prev: Record<string, any[]>) => ({ ...prev, [taskId]: (res.data as any[]) || [] }));
    } catch (e) {
      // ignore; UI shows empty
    } finally {
      setTaskStatusHistoryLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const addTaskComment = async (taskId: string, content?: string) => {
    const commentContent = content || (taskCommentDraft[taskId] || '').trim();
    console.log('Adding task comment:', { taskId, content, commentContent });
    if (!commentContent) { toast.error('Please enter a comment'); return; }
    try {
      const res = await apiClient.post(`/api/tickets/${id}/tasks/${taskId}/comments`, { content: commentContent, isInternal: false });
      console.log('Task comment API response:', res);
      if (!res.success) throw new Error(res.error || 'Failed to add comment');
      setTaskCommentDraft(prev => ({ ...prev, [taskId]: '' }));
      await loadTaskComments(taskId);
      toast.success('Comment added');
    } catch (e: any) {
      console.error('Task comment error:', e);
      toast.error(e?.message || 'Failed to add comment');
      throw e; // Re-throw to handle in calling function
    }
  };

  const updateTaskStatus = async (taskId: string, toStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED', reason?: string) => {
    try {
      const res = await apiClient.patch(`/api/tickets/${id}/tasks/${taskId}/status`, { 
        toStatus,
        ...(reason ? { reason } : {})
      });
      if (!res.success) throw new Error(res.error || 'Failed to update task status');
      toast.success('Task status updated');
      await fetchTicket();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update task status');
    }
  };

  const handleTaskStatusChange = (task: any) => {
    const statusValue: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' = ((): any => {
      if (!task) return 'PENDING';
      if (typeof task.status === 'string') return task.status as any;
      if (task.status && typeof task.status.name === 'string') return (task.status.name as string).toUpperCase() as any;
      if (typeof task.taskStatus === 'string') return (task.taskStatus as string).toUpperCase() as any;
      if (task.taskStatus && typeof task.taskStatus.name === 'string') return (task.taskStatus.name as string).toUpperCase() as any;
      return 'PENDING';
    })();
    
    setSelectedTaskForStatusChange({
      id: task.id,
      title: task.title,
      currentStatus: statusValue
    });
    setShowTaskStatusDialog(true);
  };

  const handleTaskStatusConfirm = async (newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED', reason: string) => {
    if (!selectedTaskForStatusChange) return;
    await updateTaskStatus(selectedTaskForStatusChange.id, newStatus, reason);
    setSelectedTaskForStatusChange(null);
  };

  const handleTaskCommentConfirm = async (comment: string) => {
    if (!selectedTaskForComment) return;
    try {
      // Pass the comment directly to addTaskComment
      await addTaskComment(selectedTaskForComment.id, comment);
      // Close the dialog after successful submission
      setShowTaskCommentDialog(false);
      setSelectedTaskForComment(null);
    } catch (error) {
      console.error('Error adding task comment:', error);
      // Don't close dialog on error so user can retry
    }
  };

  // Load users for assignment
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await UserService.getUsers({ isActive: true });
      if (response.success && response.data) {
        setUsers(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAssignTask = (task: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setSelectedTaskForAssignment({
      id: task.id,
      title: task.title,
      assignedTo: task.assignedTo
    });
    setSelectedAssignee(task.assignedTo || 'unassigned');
    setShowAssignDialog(true);
  };

  const assignTask = async () => {
    if (!selectedTaskForAssignment || !id) return;
    try {
      const assigneeValue = selectedAssignee === 'unassigned' ? null : selectedAssignee;
      const res = await apiClient.patch(API_ENDPOINTS.TICKETS.TASK_ASSIGN(id, selectedTaskForAssignment.id), {
        assignedTo: assigneeValue
      });
      if (!res.success) throw new Error(res.error || 'Failed to assign task');
      
      // Update the task in the ticket data
      setTicket((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map((task: any) => 
            task.id === selectedTaskForAssignment.id 
              ? { ...task, assignedTo: assigneeValue }
              : task
          )
        };
      });
      
      // Assignment history will be loaded when the task detail page is opened
      
      toast.success('Task assigned successfully');
      setShowAssignDialog(false);
      setSelectedTaskForAssignment(null);
      setSelectedAssignee('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to assign task');
    }
  };

  const handleBack = () => {
    try {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/tickets');
      }
    } catch {
      navigate('/tickets');
    }
  };

  const handleStatusChange = async (newStatusId: string, reason?: string, commentText?: string) => {
    if (!id) return;
    const oldStatusName = statusName || 'Unknown';
    const res = await apiClient.put(API_ENDPOINTS.TICKETS.UPDATE(id), {
      statusId: newStatusId,
      ...(reason ? { statusChangeReason: reason } : {}),
      ...(commentText ? { statusChangeComment: commentText } : {})
    });
    if (!res.success) {
      toast.error(res.error || 'Failed to update status');
      return;
    }
    toast.success('Status updated');
    // Record reason/comment as a ticket comment, with old/new status context
    try {
      // Resolve new status name
      let newStatusName = newStatusId;
      try {
        const statuses = await ticketSystemService.getStatuses();
        const match = statuses.find(s => s.id === newStatusId);
        if (match) newStatusName = match.name;
      } catch {}

      const lines: string[] = [];
      if ((reason && reason.trim()) || (commentText && commentText.trim())) {
        lines.push(`Status change: ${oldStatusName} → ${newStatusName}`);
        if (reason && reason.trim().length > 0) lines.push(`Reason: ${reason.trim()}`);
        if (commentText && commentText.trim().length > 0) lines.push(`Comment: ${commentText.trim()}`);
        await CommentService.createComment({
          ticketId: id,
          content: lines.join('\n\n'),
          isInternal: false,
          attachments: []
        });
      }
    } catch (e) {
      console.warn('Status updated but failed to add comment:', e);
    }
    await fetchTicket();
    await loadComments();
    setHistoryRefreshToken(prev => prev + 1);
  };

  const loadComments = async () => {
    if (!id) return;
    setIsLoadingComments(true);
    try {
      const response = await CommentService.getComments(id);
      if (response.success) setComments(response.data);
    } catch (e) {
      console.error('Failed to load comments:', e);
      toast.error('Failed to load comments');
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleAddComment = async (commentData: { content: string; attachments: FileAttachment[]; isInternal: boolean }) => {
    if (!id) return;
    try {
      const response = await CommentService.createComment({
        ticketId: id,
        content: commentData.content,
        isInternal: commentData.isInternal,
        attachments: commentData.attachments
      });
      if (response.success) {
        toast.success('Comment added successfully!');
        setShowAddComment(false);
        await loadComments();
      } else {
        toast.error(response.message || 'Failed to create comment');
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
      toast.error('Failed to add comment. Please try again.');
    }
  };

  const groupedTimeline = useMemo(() => {
    const items: Array<{ type: 'issue' | 'comment'; timestamp: Date; data: any }> = [];
    if (ticket) {
      items.push({ type: 'issue', timestamp: new Date(ticket.submittedAt), data: ticket });
    }
    for (const c of comments) {
      items.push({ type: 'comment', timestamp: new Date(c.createdAt), data: {
        ...c,
        author: c.author ? `${c.author.firstName} ${c.author.lastName}` : 'Unknown User',
        attachments: c.attachments || []
      }});
    }
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return items;
  }, [ticket, comments]);

  // Expand the latest (first) timeline item by default
  useEffect(() => {
    if (groupedTimeline.length > 0 && expandedKeys.size === 0) {
      setExpandedKeys(new Set(['item-0']));
    }
  }, [groupedTimeline]);

  const toggleExpand = (key: string) => {
    const next = new Set(expandedKeys);
    if (next.has(key)) next.delete(key); else next.add(key);
    setExpandedKeys(next);
  };

  const expandAll = () => {
    const next = new Set(groupedTimeline.map((_, i) => `item-${i}`));
    setExpandedKeys(next);
  };

  const collapseAll = () => setExpandedKeys(new Set());

  return (
    <div className="relative z-0 mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6 lg:pl-[calc(var(--sidebar-width,14rem)+1.5rem)]">
      <Breadcrumb 
        items={[
          { label: 'Tickets', href: '/tickets' },
          { label: ticket?.title || (loading ? 'Loading…' : 'Ticket'), current: true }
        ]} 
        className="mb-4"
      />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">
            {ticket?.title || (loading ? 'Loading…' : 'Ticket')}
          </h1>
          {ticket && (
            <Badge variant="outline" className="ml-1">#{ticket.ticketNumber}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2"></div>
      </div>

      <div className="w-full">
        {/* Main */}
        <div className="w-full">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="w-full grid grid-cols-4 sm:w-auto sm:inline-flex">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="status">Status & Actions</TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-1">
                Timeline
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {comments.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-1">
                Tasks
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {ticket?.tasks?.length || 0}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <CardTitle className="text-base">Ticket Overview</CardTitle>
              </div>
              <button type="button" className="text-muted-foreground" onClick={() => setIsOverviewOpen(v => !v)} aria-label={isOverviewOpen ? 'Collapse' : 'Expand'}>
                {isOverviewOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </CardHeader>
            {isOverviewOpen && (
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Ticket Number</div>
                  {ticket && <div className="text-sm font-medium">#{ticket.ticketNumber}</div>}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  {ticket && <TicketStatusBadge status={ticket.status as any} size="sm" />}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Priority</div>
                  {ticket && <PriorityBadge priority={ticket.priority as any} size="sm" />}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Category</div>
                  {(() => {
                    const catObj = typeof (ticket as any)?.category === 'object' ? (ticket as any).category : (ticket as any)?.categoryInfo;
                    const catName = typeof (ticket as any)?.category === 'object' ? (ticket as any).category?.name : ((ticket as any)?.category || (ticket as any)?.categoryInfo?.name);
                    const color = (catObj?.color || '').toLowerCase();
                    const classes = color === 'blue' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      color === 'green' ? 'bg-green-100 text-green-700 border-green-200' :
                      color === 'red' ? 'bg-red-100 text-red-700 border-red-200' :
                      color === 'yellow' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                      color === 'orange' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      color === 'purple' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                      'bg-gray-100 text-gray-700 border-gray-200';
                    return (
                      <Badge variant="outline" className={`text-xs rounded-full px-2.5 py-0.5 border ${classes}`}>
                        <span className="capitalize">{catName || 'Unknown'}</span>
                      </Badge>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Date Created</div>
                  {ticket && <div className="text-sm">{new Date(ticket.submittedAt).toLocaleString()}</div>}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Created By</div>
                  {ticket && (
                    <div className="text-sm">
                      {ticket.submitter ? `${ticket.submitter.firstName} ${ticket.submitter.lastName}` : ticket.submittedBy}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Submitter Department</div>
                  {ticket && ticket.submitter?.departmentEntity ? (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      {ticket.submitter.departmentEntity.name}
                    </Badge>
                  ) : (
                    <div className="text-sm text-muted-foreground">No department</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Assigned Department</div>
                  {ticket && ticket.assignee?.departmentEntity ? (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      {ticket.assignee.departmentEntity.name}
                    </Badge>
                  ) : (
                    <div className="text-sm text-muted-foreground">No assignment</div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="max-w-none max-h-[320px] overflow-y-auto rounded-md border bg-muted/30 p-3">
                {ticket ? (
                  <RichTextDisplay
                    content={ticket.description}
                    className="prose max-w-none ticket-prose-compact prose-[9px]"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{loading ? 'Loading description…' : 'No description'}</p>
                )}
              </div>
              {ticket?.attachments && ticket.attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                    Attachments ({ticket.attachments.length})
                  </div>
                  <AttachmentDisplay attachments={ticket.attachments} />
                </div>
              )}
            </CardContent>
            )}
          </Card>

            </TabsContent>

            <TabsContent value="status" className="space-y-4">
          {/* Status & Actions Tab */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <CardTitle className="text-base">Status & Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              {ticket && (
                <div className="flex items-center justify-between gap-2">
                  <TicketStatusBadge status={ticket.status as any} size="sm" />
                  <TicketStatusChange
                    ticketId={ticket.id}
                    currentStatus={statusName}
                    currentStatusId={typeof ticket.status === 'object' ? ticket.status?.id : undefined}
                    onStatusChange={async (newId, reason, addComment) => { await handleStatusChange(newId, reason, addComment); }}
                    className="ml-1"
                    triggerMode="button"
                    triggerLabel="Change Status"
                    disabled={!(() => {
                      try {
                        const u: any = JSON.parse(localStorage.getItem('user') || 'null');
                        const roleNames: string[] = Array.isArray(u?.roles) ? u.roles.map((r: any) => r?.role?.name?.toLowerCase()).filter(Boolean) : (u?.role ? [String(u.role).toLowerCase()] : []);
                        const perms: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
                        return roleNames.includes('admin') || perms.includes('ticket-status:change');
                      } catch { return false; }
                    })()}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {ticket && (
            <TicketStatusHistory
              ticketId={ticket.id}
              defaultExpanded
              maxItems={6}
              refreshToken={historyRefreshToken}
            />
          )}

            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <CardTitle className="text-base">Timeline ({groupedTimeline.length} items)</CardTitle>
              </div>
              <button type="button" className="text-muted-foreground" onClick={() => setIsTimelineOpen(v => !v)} aria-label={isTimelineOpen ? 'Collapse' : 'Expand'}>
                {isTimelineOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </CardHeader>
            {isTimelineOpen && (
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
                </div>
                <Button onClick={() => setShowAddComment(true)} className="gap-2" disabled={isLoadingComments || !(() => {
                  try {
                    const u: any = JSON.parse(localStorage.getItem('user') || 'null');
                    const roleNames: string[] = Array.isArray(u?.roles) ? u.roles.map((r: any) => r?.role?.name?.toLowerCase()).filter(Boolean) : (u?.role ? [String(u.role).toLowerCase()] : []);
                    const perms: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
                    return roleNames.includes('admin') || perms.includes('comments:write');
                  } catch { return false; }
                })()}>
                  <MessageSquare className="h-4 w-4" />
                  Add Comment
                </Button>
              </div>

              <div className="space-y-2">
                {groupedTimeline.map((item, index) => {
                  const key = `item-${index}`;
                  const isExpanded = expandedKeys.has(key);
                  return (
                    <div key={key} className="border border-border rounded-lg overflow-hidden bg-background/80">
                      <div className="w-full flex items-center justify-between p-4 cursor-pointer" onClick={() => toggleExpand(key)}>
                        <div className="flex items-center gap-3">
                          <div className="font-semibold text-sm">
                            {item.type === 'issue' ? `Original Issue - ${item.data.submittedBy}` : `Comment - ${item.data.author}${item.data.isInternal ? ' (Internal)' : ''}`}
                          </div>
                          <div className="text-xs text-muted-foreground">{item.timestamp.toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(item.type === 'issue' ? (item.data.attachments?.length || 0) : (item.data.attachments?.length || 0)) > 0 && (
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                          )}
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="p-4">
                          {item.type === 'issue' ? (
                            <div className="space-y-3">
                              <RichTextDisplay content={item.data.description} className="ticket-prose-compact" />
                              {item.data.attachments?.length > 0 && <AttachmentDisplay attachments={item.data.attachments} />}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <RichTextDisplay content={item.data.content} className="ticket-prose-compact" />
                              {item.data.attachments?.length > 0 && <AttachmentDisplay attachments={item.data.attachments} />}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
            )}
          </Card>

            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
          {/* Tasks */}
          {ticket && (
            <Card>
              <CardHeader className="pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  <CardTitle className="text-base">Tasks ({(ticket.tasks?.length || 0)})</CardTitle>
                </div>
                <Button onClick={() => setShowAddTask(true)} className="gap-2" disabled={!canWriteTasks}>
                  <MessageSquare className="h-4 w-4" />
                  Add Task
                </Button>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {Array.isArray(ticket.tasks) && ticket.tasks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ticket.tasks.map((task: any) => {
                  const expanded = !!expandedTasks[task.id];
                  const statusValue: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' = ((): any => {
                    if (!task) return 'PENDING';
                    if (typeof task.status === 'string') return task.status as any;
                    if (task.status && typeof task.status.name === 'string') return (task.status.name as string).toUpperCase() as any;
                    if (typeof task.taskStatus === 'string') return (task.taskStatus as string).toUpperCase() as any;
                    if (task.taskStatus && typeof task.taskStatus.name === 'string') return (task.taskStatus.name as string).toUpperCase() as any;
                    return 'PENDING';
                  })();
                  const priorityLabel: string = ((): string => {
                    const raw = (task.priority?.name ?? task.priority ?? task.taskPriority?.name ?? task.taskPriority ?? '') as string;
                    return String(raw).toLowerCase();
                  })();
                  return (
                    <div 
                      key={task.id} 
                      className="border rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 hover:bg-blue-50/30"
                      onClick={() => {
                        const next = { ...expandedTasks, [task.id]: !expanded };
                        setExpandedTasks(next);
                        if (!expanded) { if (!taskComments[task.id]) void loadTaskComments(task.id); if (!taskStatusHistory[task.id]) void loadTaskStatusHistory(task.id);} 
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{task.title}</div>
                          <div className="text-xs text-muted-foreground">{task.description || ''}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xxs px-2 py-1 rounded-full ${
                                statusValue === 'PENDING' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                                statusValue === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                statusValue === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200' :
                                statusValue === 'BLOCKED' ? 'bg-red-100 text-red-700 border-red-200' :
                                'bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                            >
                              Current Status: {statusValue === 'PENDING' ? 'Pending' :
                               statusValue === 'IN_PROGRESS' ? 'In Progress' :
                               statusValue === 'COMPLETED' ? 'Completed' :
                               statusValue === 'BLOCKED' ? 'Blocked' : statusValue}
                            </Badge>
                            <Badge variant="outline" className={`text-xxs border ${getPriorityPillClasses(priorityLabel)}`}>Priority: {priorityLabel || 'unknown'}</Badge>
                            <Badge variant="outline" className="text-xxs border bg-purple-100 text-purple-700 border-purple-200">
                              Assigned: {task.assignedTo ? (() => {
                                const user = users.find(u => u.id === task.assignedTo);
                                return user ? `${user.firstName} ${user.lastName}` : task.assignedTo;
                              })() : 'Unassigned'}
                            </Badge>
                            {task.dueDate && <Badge variant="outline" className="text-xxs">Due: {new Date(task.dueDate).toLocaleDateString()}</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = { ...expandedTasks, [task.id]: !expanded };
                              setExpandedTasks(next);
                              if (!expanded) { if (!taskComments[task.id]) void loadTaskComments(task.id); if (!taskStatusHistory[task.id]) void loadTaskStatusHistory(task.id);} 
                            }} 
                            aria-label={expanded ? 'Collapse' : 'Expand'}
                          >
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Action Buttons - Always visible at bottom */}
                      <div className="flex justify-end gap-2 pt-3 mt-3 border-t">
                        <Button 
                          onClick={(e) => handleAssignTask(task, e)} 
                          disabled={!canWriteTasks}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <UserPlus className="h-4 w-4" />
                          {task.assignedTo ? 'Reassign' : 'Assign To'}
                        </Button>
                        {statusValue !== 'COMPLETED' && (
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTaskForComment({ id: task.id, title: task.title });
                              setShowTaskCommentDialog(true);
                            }} 
                            disabled={!canWriteTasks}
                            className="gap-2"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Post Comment
                          </Button>
                        )}
                        {statusValue !== 'COMPLETED' && (
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTaskStatusChange(task);
                            }} 
                            disabled={!canWriteTasks}
                            className="gap-2"
                          >
                            <Settings className="h-4 w-4" />
                            Change Task Status
                          </Button>
                        )}
                      </div>

                      {expanded && (
                        <div className="mt-3 space-y-3">
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" />Comments</div>
                            <div className="space-y-2">
                              {taskCommentsLoading[task.id] && <div className="text-xs text-muted-foreground">Loading comments…</div>}
                              {(taskComments[task.id] || []).map((c: any) => (
                                <div key={c.id} className="text-sm border rounded p-2">
                                  <div className="text-xs text-muted-foreground">{c.author ? `${c.author.firstName} ${c.author.lastName}` : c.authorId} • {new Date(c.createdAt).toLocaleString()}</div>
                                  <div>{c.content}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Status History</div>
                            {taskStatusHistoryLoading[task.id] && <div className="text-xs text-muted-foreground">Loading history…</div>}
                            <div className="space-y-2">
                              {(taskStatusHistory[task.id] || []).map((h: any) => {
                                const getStatusPillClasses = (status: string) => {
                                  const statusKey = status.toUpperCase();
                                  switch (statusKey) {
                                    case 'PENDING':
                                      return 'text-xxs px-2 py-1 rounded-full bg-gray-100 text-gray-700 border-gray-200';
                                    case 'IN_PROGRESS':
                                      return 'text-xxs px-2 py-1 rounded-full bg-blue-100 text-blue-700 border-blue-200';
                                    case 'COMPLETED':
                                      return 'text-xxs px-2 py-1 rounded-full bg-green-100 text-green-700 border-green-200';
                                    case 'BLOCKED':
                                      return 'text-xxs px-2 py-1 rounded-full bg-red-100 text-red-700 border-red-200';
                                    default:
                                      return 'text-xxs px-2 py-1 rounded-full bg-gray-100 text-gray-700 border-gray-200';
                                  }
                                };

                                return (
                                  <div key={h.id} className="text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge 
                                        variant="outline" 
                                        className={getStatusPillClasses(h.fromStatusName || h.fromStatusId)}
                                      >
                                        {h.fromStatusName || h.fromStatusId}
                                      </Badge>
                                      <ChevronRight className="h-3 w-3" />
                                      <Badge 
                                        variant="outline" 
                                        className={getStatusPillClasses(h.toStatusName || h.toStatusId)}
                                      >
                                        {h.toStatusName || h.toStatusId}
                                      </Badge>
                                      <span>• {new Date(h.changedAt).toLocaleString()}</span>
                                    </div>
                                    {h.reason && (
                                      <div className="ml-2 text-xs text-muted-foreground italic bg-gray-50 p-2 rounded border-l-2 border-gray-200">
                                        <span className="font-medium">Reason:</span> {h.reason}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {(taskStatusHistory[task.id] || []).length === 0 && !taskStatusHistoryLoading[task.id] && (
                                <div className="text-xs text-muted-foreground">No history</div>
                              )}
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No tasks yet.</div>
                )}
              </CardContent>
            </Card>
          )}
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* Open Panel Modal */}
      <Dialog open={showDetailPanel} onOpenChange={setShowDetailPanel}>
        <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-4">
            <DialogTitle>Ticket Detail</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-4 pb-4">
            {ticket && <TicketDetailPanel ticketId={ticket.id} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea id="task-desc" rows={3} value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} placeholder="Task description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-assignee" className="text-sm font-medium">
                  Assigned To
                </Label>
                <div className="relative">
                  <Input
                    id="task-assignee"
                    placeholder="Type to search assignees..."
                    value={newTaskAssignee === 'unassigned' ? 'Unassigned' : 
                           newTaskAssignee ? (() => {
                             const user = users.find(u => u.id === newTaskAssignee);
                             if (user) {
                               return `${user.firstName} ${user.lastName}`;
                             }
                             return '';
                           })() : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.toLowerCase() === 'unassigned') {
                        setNewTaskAssignee('unassigned');
                      } else {
                        // Find matching user
                        const matchingUser = users.find(user => 
                          `${user.firstName} ${user.lastName}`.toLowerCase().includes(value.toLowerCase()) ||
                          user.email.toLowerCase().includes(value.toLowerCase())
                        );
                        if (matchingUser) {
                          setNewTaskAssignee(matchingUser.id);
                        } else {
                          setNewTaskAssignee('');
                        }
                      }
                    }}
                    onFocus={() => setShowUserSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowUserSuggestions(false), 200)}
                  />
                  {showUserSuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-32 overflow-auto">
                      <div 
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => {
                          setNewTaskAssignee('unassigned');
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
                            setNewTaskAssignee(user.id);
                            setShowUserSuggestions(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddTask(false)}>Cancel</Button>
              <Button onClick={addTask}>Add Task</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Comment Dialog */}
      {ticket && (
        <AddCommentDialog
          isOpen={showAddComment}
          onClose={() => setShowAddComment(false)}
          onSubmit={handleAddComment}
          ticketId={ticket.id}
          ticketTitle={ticket.title}
          title="Add Comment to Ticket"
          placeholder="Add your comment to this ticket..."
        />
      )}

      {/* Task Status Change Dialog */}
      {selectedTaskForStatusChange && (
        <TaskStatusChangeDialog
          isOpen={showTaskStatusDialog}
          onClose={() => {
            setShowTaskStatusDialog(false);
            setSelectedTaskForStatusChange(null);
          }}
          onConfirm={handleTaskStatusConfirm}
          currentStatus={selectedTaskForStatusChange.currentStatus}
          taskTitle={selectedTaskForStatusChange.title}
        />
      )}

      {/* Task Comment Dialog */}
      {selectedTaskForComment && (
        <TaskCommentDialog
          isOpen={showTaskCommentDialog}
          onClose={() => {
            setShowTaskCommentDialog(false);
            setSelectedTaskForComment(null);
          }}
          onConfirm={handleTaskCommentConfirm}
          taskTitle={selectedTaskForComment.title}
        />
      )}

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Assign Task
            </DialogTitle>
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
                             const roleText = user.role ? ` (${user.role})` : '';
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
                          (user.role && user.role.toLowerCase().includes(value.toLowerCase()))
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
                            {user.role && (
                              <div className="text-xs text-blue-600 font-medium mt-1">
                                {user.role}
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

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={assignTask}>
              Assign Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketDetailPage;
