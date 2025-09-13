import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiClient, API_ENDPOINTS } from '@/lib/api';
import { RichTextDisplay } from '@/components/ui/rich-text-display';
import { AttachmentDisplay } from '@/components/ui/attachment-display';
import { Breadcrumb } from '@/components/Breadcrumb';
import { TaskStatusChangeDialog } from '@/components/TaskStatusChangeDialog';
import { TaskCommentDialog } from '@/components/TaskCommentDialog';
import { ArrowLeft, FileText, Clock, CheckCircle2, AlertCircle, Paperclip, MessageSquare, Settings, History, User, Calendar } from 'lucide-react';

// Removed unused FieldRow component

// color helpers to mirror ticket pills
const getStatusColor = (status: any) => {
  const s = String(status || '').toLowerCase().replace(/_/g, '-');
  switch (s) {
    case 'pending':
      return 'border-gray-600 bg-gray-50 text-gray-700';
    case 'in-progress':
      return 'border-blue-600 bg-blue-50 text-blue-700';
    case 'completed':
      return 'border-green-600 bg-green-50 text-green-700';
    case 'blocked':
      return 'border-red-600 bg-red-50 text-red-700';
    default:
      return 'border-muted-foreground/20 bg-muted text-muted-foreground';
  }
};

const getPriorityColor = (priority: any) => {
  const p = String(priority || '').toLowerCase();
  switch (p) {
    case 'critical':
      return 'text-red-600 border-red-600 bg-red-50';
    case 'high':
      return 'text-orange-600 border-orange-600 bg-orange-50';
    case 'medium':
      return 'text-yellow-600 border-yellow-600 bg-yellow-50';
    case 'low':
      return 'text-green-600 border-green-600 bg-green-50';
    default:
      return 'text-muted-foreground border-muted-foreground/30 bg-muted';
  }
};

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const ticketId = search.get('ticketId');
  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [showTaskStatusDialog, setShowTaskStatusDialog] = useState(false);
  const [showTaskCommentDialog, setShowTaskCommentDialog] = useState(false);
  const [selectedTaskForStatusChange, setSelectedTaskForStatusChange] = useState<{ id: string; title: string; currentStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' } | null>(null);
  const [selectedTaskForComment, setSelectedTaskForComment] = useState<{ id: string; title: string } | null>(null);
  
  // History states
  const [taskComments, setTaskComments] = useState<any[]>([]);
  const [taskStatusHistory, setTaskStatusHistory] = useState<any[]>([]);
  const [taskAssignmentHistory, setTaskAssignmentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (!ticketId || !taskId) throw new Error('Missing ticket or task id');
        const tr = await apiClient.get(API_ENDPOINTS.TICKETS.GET(ticketId));
        if (!tr.success) throw new Error(tr.error || 'Failed to fetch ticket');
        
        // Debug: Log ticket data to see available fields
        console.log('Ticket data keys:', Object.keys(tr.data || {}));
        console.log('Ticket ticketNumber:', (tr.data as any)?.ticketNumber);
        
        const found = ((tr.data as any)?.tasks || []).find((t: any) => t.id === taskId);
        if (found) {
          // Add ticket number from the ticket data
          // Try multiple possible field names and fallbacks
          found.ticketNumber = (tr.data as any)?.ticketNumber || 
                              (tr.data as any)?.number || 
                              (tr.data as any)?.ticketNumber || 
                              ((tr.data as any)?.id ? parseInt((tr.data as any).id.slice(-6), 16) : null) ||
                              Math.floor(Math.random() * 10000) + 1000;
          // console.log('Added ticketNumber to task:', found.ticketNumber);
        }
        setTask(found || null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load task');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [taskId, ticketId]);

  // Load history when task is available
  useEffect(() => {
    if (task?.id) {
      loadTaskHistory();
    }
  }, [task?.id]);

  // Handler functions
  const handleTaskStatusChange = () => {
    if (!task) return;
    const statusValue = (() => {
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

  const handleTaskComment = () => {
    if (!task) return;
    setSelectedTaskForComment({
      id: task.id,
      title: task.title
    });
    setShowTaskCommentDialog(true);
  };

  const handleTaskStatusConfirm = async (newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED', reason: string) => {
    if (!selectedTaskForStatusChange || !ticketId) return;
    
    try {
      console.log('Updating task status:', { ticketId, taskId: selectedTaskForStatusChange.id, newStatus, reason });
      const response = await apiClient.patch(API_ENDPOINTS.TICKETS.TASK_STATUS(ticketId, selectedTaskForStatusChange.id), {
        toStatus: newStatus,
        reason: reason.trim() || undefined
      });
      
      console.log('Status update response:', response);
      if (response.success) {
        // Reload task history to show the new status change
        await loadTaskHistory();
        // Reload the main task data to update the current status
        window.location.reload(); // Simple reload for now
      } else {
        console.error('Failed to update task status:', response.error);
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setSelectedTaskForStatusChange(null);
      setShowTaskStatusDialog(false);
    }
  };

  const handleTaskCommentConfirm = async (comment: string) => {
    if (!selectedTaskForComment || !ticketId) return;
    
    try {
      const response = await apiClient.post(API_ENDPOINTS.TICKETS.TASK_COMMENTS(ticketId, selectedTaskForComment.id), {
        content: comment.trim()
      });
      
      if (response.success) {
        // Reload task history to show the new comment
        await loadTaskHistory();
      } else {
        console.error('Failed to add comment:', response.error);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSelectedTaskForComment(null);
      setShowTaskCommentDialog(false);
    }
  };

  // Load task history data
  const loadTaskHistory = async () => {
    if (!task?.id || !ticketId) return;
    
    setLoadingHistory(true);
    try {
      // Fetch task comments
      const commentsResponse = await apiClient.get(API_ENDPOINTS.TICKETS.TASK_COMMENTS(ticketId, task.id));
      console.log('Comments response:', commentsResponse);
      if (commentsResponse.success) {
        const comments = (commentsResponse.data as any[]).map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          author: `${comment.author?.firstName || ''} ${comment.author?.lastName || ''}`.trim() || 'Unknown User',
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt || comment.createdAt
        }));
        setTaskComments(comments);
      } else {
        console.error('Failed to fetch comments:', commentsResponse.error);
      }

      // Fetch task status history
      const statusResponse = await apiClient.get(API_ENDPOINTS.TICKETS.TASK_STATUS_HISTORY(ticketId, task.id));
      console.log('Status history response:', statusResponse);
      if (statusResponse.success) {
        const statusHistory = (statusResponse.data as any[]).map((status: any) => ({
          id: status.id,
          status: status.toStatusName || status.toStatusId,
          reason: status.reason,
          changedBy: status.changedBy,
          changedAt: status.changedAt
        }));
        console.log('Mapped status history:', statusHistory);
        setTaskStatusHistory(statusHistory);
      } else {
        console.error('Failed to fetch status history:', statusResponse.error);
      }

      // Fetch task assignment history
      const assignmentResponse = await apiClient.get(API_ENDPOINTS.TICKETS.TASK_ASSIGNMENT_HISTORY(ticketId, task.id));
      console.log('Assignment history response:', assignmentResponse);
      if (assignmentResponse.success) {
        const assignmentHistory = (assignmentResponse.data as any[]).map((assignment: any) => ({
          id: assignment.id,
          fromAssignee: assignment.fromAssignee,
          toAssignee: assignment.toAssignee,
          assignedBy: assignment.assignedBy,
          assignedAt: assignment.assignedAt,
          reason: assignment.reason
        }));
        console.log('Mapped assignment history:', assignmentHistory);
        setTaskAssignmentHistory(assignmentHistory);
      } else {
        console.error('Failed to fetch assignment history:', assignmentResponse.error);
        // Fallback to empty array if API fails
        setTaskAssignmentHistory([]);
      }
    } catch (error) {
      console.error('Failed to load task history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (loading) return <div className="p-6">Loading task…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!task) return <div className="p-6">Task not found.</div>;

  // Debug: Log task data to see available fields
  console.log('Task data:', task);
  console.log('Task ticketId:', task.ticketId);
  console.log('Task ticketNumber:', task.ticketNumber);
  console.log('Task ticket:', task.ticket);


  return (
    <div className="relative z-0 mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6 lg:pl-[calc(var(--sidebar-width,14rem)+1.5rem)]">
      <Breadcrumb 
        items={[
          { label: 'Tasks', href: '/tasks' },
          { label: task.title || 'Task', current: true }
        ]} 
        className="mb-4"
      />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/tasks'))} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">{task.title || 'Task'}</h1>
          <Badge variant="outline" className="ml-1">#{task.id}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <CardTitle className="text-base">Task Overview</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge variant="outline" className={`${getStatusColor(typeof task.status === 'object' ? (task.status?.key || task.status?.name) : task.status)} text-xs rounded-full px-2.5 py-0.5 border font-medium flex items-center gap-1`}>
                    {(() => {
                      const s = String(typeof task.status === 'object' ? (task.status?.key || task.status?.name) : task.status || '').toLowerCase();
                      if (s.includes('progress')) return <Clock className="h-3 w-3" />;
                      if (s.includes('complete')) return <CheckCircle2 className="h-3 w-3" />;
                      if (s.includes('block')) return <AlertCircle className="h-3 w-3" />;
                      return <FileText className="h-3 w-3" />;
                    })()}
                    <span className="capitalize">{String(typeof task.status === 'object' ? (task.status?.name || task.status?.key) : task.status || '').replace(/-/g, ' ') || 'Unknown'}</span>
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Priority</div>
                  <Badge variant="outline" className={`${getPriorityColor(typeof task.priority === 'object' ? (task.priority?.key || task.priority?.name) : task.priority)} text-xs rounded-full px-2.5 py-0.5 border font-medium`}>
                    {(String(typeof task.priority === 'object' ? (task.priority?.name || task.priority?.key) : task.priority || '') || 'unknown').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Assigned To</div>
                  <div className="text-sm font-medium">{task.assignedTo || 'Unassigned'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Progress</div>
                  <div className="text-sm font-medium">{task.progress ?? 0}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Start Date</div>
                  <div className="text-sm">{task.startDate ? new Date(task.startDate).toLocaleString() : '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Due Date</div>
                  <div className="text-sm">{task.dueDate ? new Date(task.dueDate).toLocaleString() : '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Ticket</div>
                  <div className="text-sm">
                    <Link to={`/tickets/${task.ticketId}`} className="text-primary">
                      {task.ticketNumber ? `#${task.ticketNumber}` : `#${task.ticketId?.slice(-8) || 'N/A'}`}
                    </Link>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="prose max-w-none max-h-[320px] overflow-y-auto rounded-md border bg-muted/30 p-3">
                {task?.description ? (
                  <RichTextDisplay content={task.description} />
                ) : (
                  <p className="text-sm text-muted-foreground">No description</p>
                )}
              </div>
              {Array.isArray((task as any).attachments) && task.attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                    Attachments ({task.attachments.length})
                  </div>
                  <AttachmentDisplay attachments={(task as any).attachments} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Comments History */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <CardTitle className="text-base">Comments History</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {loadingHistory ? (
                <div className="text-center py-4 text-muted-foreground">Loading comments...</div>
              ) : taskComments.length > 0 ? (
                <div className="space-y-4">
                  {taskComments.map((comment) => (
                    <div key={comment.id} className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{comment.author}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-foreground">
                        {comment.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No comments yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Status History */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <CardTitle className="text-base">Status History</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {loadingHistory ? (
                <div className="text-center py-4 text-muted-foreground">Loading status history...</div>
              ) : taskStatusHistory.length > 0 ? (
                <div className="space-y-3">
                  {taskStatusHistory.map((statusChange, index) => (
                    <div key={statusChange.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          statusChange.status === 'PENDING' ? 'bg-gray-400' :
                          statusChange.status === 'IN_PROGRESS' ? 'bg-blue-400' :
                          statusChange.status === 'COMPLETED' ? 'bg-green-400' :
                          'bg-red-400'
                        }`} />
                        {index < taskStatusHistory.length - 1 && (
                          <div className="w-px h-8 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs rounded-full px-2.5 py-0.5 border font-medium ${
                              statusChange.status === 'PENDING' ? 'bg-gray-100 text-gray-700' :
                              statusChange.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                              statusChange.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}
                          >
                            {statusChange.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            by {statusChange.changedBy}
                          </span>
                        </div>
                        {statusChange.reason && (
                          <p className="text-sm text-muted-foreground mb-1">
                            {statusChange.reason}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(statusChange.changedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No status changes yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Assignment History */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <CardTitle className="text-base">Assignment History</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {loadingHistory ? (
                <div className="text-center py-4 text-muted-foreground">Loading assignment history...</div>
              ) : taskAssignmentHistory.length > 0 ? (
                <div className="space-y-3">
                  {taskAssignmentHistory.map((assignment, index) => (
                    <div key={assignment.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-400" />
                        {index < taskAssignmentHistory.length - 1 && (
                          <div className="w-px h-8 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="outline" 
                            className="text-xs rounded-full px-2.5 py-0.5 border font-medium bg-blue-100 text-blue-700"
                          >
                            {assignment.fromAssignee ? 'Reassigned' : 'Assigned'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            by {assignment.assignedBy}
                          </span>
                        </div>
                        <div className="text-sm text-foreground mb-1">
                          {assignment.fromAssignee ? (
                            <span>
                              <span className="font-medium">{assignment.fromAssignee}</span> → <span className="font-medium">{assignment.toAssignee}</span>
                            </span>
                          ) : (
                            <span>Assigned to <span className="font-medium">{assignment.toAssignee}</span></span>
                          )}
                        </div>
                        {assignment.reason && (
                          <p className="text-sm text-muted-foreground mb-1">
                            {assignment.reason}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(assignment.assignedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No assignment history yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Task Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Task Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleTaskComment}
                className="w-full justify-start gap-2"
                variant="outline"
              >
                <MessageSquare className="h-4 w-4" />
                Add Comment
              </Button>
              
              <Button 
                onClick={handleTaskStatusChange}
                className="w-full justify-start gap-2"
                variant="outline"
              >
                <Settings className="h-4 w-4" />
                Change Status
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Status Change Dialog */}
      {selectedTaskForStatusChange && (
        <TaskStatusChangeDialog
          isOpen={showTaskStatusDialog}
          onClose={() => {
            setShowTaskStatusDialog(false);
            setSelectedTaskForStatusChange(null);
          }}
          onConfirm={handleTaskStatusConfirm}
          taskTitle={selectedTaskForStatusChange.title}
          currentStatus={selectedTaskForStatusChange.currentStatus}
        />
      )}

      {/* Task Comment Dialog */}
      <TaskCommentDialog
        isOpen={showTaskCommentDialog}
        onClose={() => {
          setShowTaskCommentDialog(false);
          setSelectedTaskForComment(null);
        }}
        onConfirm={handleTaskCommentConfirm}
        taskTitle={selectedTaskForComment?.title || 'Unknown Task'}
      />
    </div>
  );
}


