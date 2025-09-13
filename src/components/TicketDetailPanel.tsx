import React, { useEffect, useMemo, useState } from 'react';
import { apiClient, API_ENDPOINTS } from '@/lib/api';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketStatusChange } from './TicketStatusChange';
import { PriorityBadge } from './PriorityBadge';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Card, CardContent } from './ui/card';
import { AttachmentDisplay } from './ui/attachment-display';
import { RichTextDisplay } from './ui/rich-text-display';
import { EmailContentDisplay } from './ui/email-content-display';
import { toast } from 'sonner';
import { Calendar, Paperclip, User, MessageSquare, ChevronDown, ChevronUp, Mail, Globe, Smartphone, Zap } from 'lucide-react';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Props { ticketId: string }

export const TicketDetailPanel: React.FC<Props> = ({ ticketId }) => {
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<any>(null);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [taskComments, setTaskComments] = useState<Record<string, any[]>>({});
  const [taskCommentDraft, setTaskCommentDraft] = useState<Record<string, string>>({});
  const [taskCommentsLoading, setTaskCommentsLoading] = useState<Record<string, boolean>>({});

  const fetchTicket = async () => {
    if (!ticketId) return;
    setLoading(true);
    const res = await apiClient.get(API_ENDPOINTS.TICKETS.GET(ticketId));
    if (res.success) setTicket(res.data);
    else toast.error(res.error || 'Failed to load ticket');
    setLoading(false);
  };

  useEffect(() => { fetchTicket(); }, [ticketId]);

  const statusName = useMemo(() => {
    return ticket ? (typeof ticket.status === 'string' ? ticket.status : ticket.status?.name || '') : '';
  }, [ticket]);

  const handleStatusChange = async (newStatusId: string, reason?: string, comment?: string) => {
    const res = await apiClient.put(API_ENDPOINTS.TICKETS.UPDATE(ticketId), {
      statusId: newStatusId,
      ...(reason ? { statusChangeReason: reason } : {}),
      ...(comment ? { statusChangeComment: comment } : {})
    });
    if (!res.success) { toast.error(res.error || 'Failed to update status'); return; }
    toast.success('Status updated');
    await fetchTicket();
  };

  const canWriteTasks = useMemo(() => {
    try {
      const u: any = JSON.parse(localStorage.getItem('user') || 'null');
      const roleNames: string[] = Array.isArray(u?.roles) ? u.roles.map((r: any) => r?.role?.name?.toLowerCase()).filter(Boolean) : (u?.role ? [String(u.role).toLowerCase()] : []);
      const perms: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
      return roleNames.includes('admin') || perms.includes('tickets:write');
    } catch { return false; }
  }, []);

  const getSourceInfo = (source: string) => {
    switch (source) {
      case 'EMAIL':
        return { icon: Mail, label: 'Email', color: 'text-blue-600' };
      case 'WEB':
        return { icon: Globe, label: 'Web Portal', color: 'text-green-600' };
      case 'MOBILE':
        return { icon: Smartphone, label: 'Mobile App', color: 'text-purple-600' };
      case 'API':
        return { icon: Zap, label: 'API', color: 'text-orange-600' };
      default:
        return { icon: Globe, label: 'Other', color: 'text-gray-600' };
    }
  };

  const loadTaskComments = async (taskId: string) => {
    try {
      setTaskCommentsLoading(prev => ({ ...prev, [taskId]: true }));
      const res = await apiClient.get(`/api/tickets/${ticketId}/tasks/${taskId}/comments`);
      if (res.success) setTaskComments(prev => ({ ...prev, [taskId]: Array.isArray(res.data) ? res.data : [] }));
      else toast.error(res.error || 'Failed to load task comments');
    } catch (e) {
      toast.error('Failed to load task comments');
    } finally {
      setTaskCommentsLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const addTaskComment = async (taskId: string) => {
    const content = (taskCommentDraft[taskId] || '').trim();
    if (!content) { toast.error('Please enter a comment'); return; }
    try {
      const res = await apiClient.post(`/api/tickets/${ticketId}/tasks/${taskId}/comments`, { content, isInternal: false });
      if (!res.success) throw new Error(res.error || 'Failed to add comment');
      setTaskCommentDraft(prev => ({ ...prev, [taskId]: '' }));
      await loadTaskComments(taskId);
      toast.success('Comment added');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add comment');
    }
  };

  const updateTaskStatus = async (taskId: string, toStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED') => {
    try {
      const res = await apiClient.patch(`/api/tickets/${ticketId}/tasks/${taskId}/status`, { toStatus });
      if (!res.success) throw new Error(res.error || 'Failed to update task status');
      toast.success('Task status updated');
      await fetchTicket();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update task status');
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold truncate">{ticket?.title || (loading ? 'Loading…' : 'Ticket')}</h2>
        {ticket && <Badge variant="outline">#{ticket.ticketNumber}</Badge>}
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {ticket && (
                <>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(ticket.submittedAt).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{ticket.submitter ? `${ticket.submitter.firstName} ${ticket.submitter.lastName}` : ticket.submittedBy}</span>
                  {ticket.source && (
                    <span className={`flex items-center gap-1 ${getSourceInfo(ticket.source).color}`}>
                      {React.createElement(getSourceInfo(ticket.source).icon, { className: "h-3 w-3" })}
                      {getSourceInfo(ticket.source).label}
                    </span>
                  )}
                </>
              )}
            </div>
            <Separator />
            {ticket ? (
              <>
                {ticket.source === 'EMAIL' && ticket.emailLogs && ticket.emailLogs.length > 0 ? (
                  <EmailContentDisplay emailLogs={ticket.emailLogs} />
                ) : (
                  <RichTextDisplay content={ticket.description} />
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{loading ? 'Loading…' : 'No description'}</p>
            )}
            {ticket?.attachments?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Paperclip className="h-3 w-3" />Attachments ({ticket.attachments.length})</div>
                <AttachmentDisplay attachments={ticket.attachments} />
              </div>
            )}
          </CardContent>
        </Card>

        {ticket?.tasks?.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Tasks ({ticket.tasks.length})</div>
              </div>

              <div className="space-y-3">
                {ticket.tasks.map((task: any) => {
                  const expanded = !!expandedTasks[task.id];
                  return (
                    <div key={task.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{task.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{task.description || ''}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="outline" className="text-xxs">Priority: {String(task.priority || '').toLowerCase()}</Badge>
                            {task.dueDate && <Badge variant="outline" className="text-xxs">Due: {new Date(task.dueDate).toLocaleDateString()}</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Select value={String(task.status || 'PENDING')} onValueChange={(val) => updateTaskStatus(task.id, val as any)} disabled={!canWriteTasks}>
                            <SelectTrigger className="h-8 w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="COMPLETED">Completed</SelectItem>
                              <SelectItem value="BLOCKED">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="sm" onClick={() => {
                            const next = { ...expandedTasks, [task.id]: !expanded };
                            setExpandedTasks(next);
                            if (!expanded && !taskComments[task.id]) void loadTaskComments(task.id);
                          }} aria-label={expanded ? 'Collapse' : 'Expand'}>
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
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
                            <Label htmlFor={`task-comment-${task.id}`}>Add Comment</Label>
                            <Textarea id={`task-comment-${task.id}`} rows={2} value={taskCommentDraft[task.id] || ''} onChange={(e) => setTaskCommentDraft(prev => ({ ...prev, [task.id]: e.target.value }))} placeholder="Write a comment…" />
                            <div className="flex justify-end">
                              <Button size="sm" onClick={() => addTaskComment(task.id)} disabled={!canWriteTasks}>Post Comment</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 space-y-3">
            {ticket && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="flex items-center gap-2">
                  <TicketStatusBadge status={ticket.status as any} size="sm" />
                  <TicketStatusChange
                    ticketId={ticket.id}
                    currentStatus={statusName}
                    currentStatusId={typeof ticket.status === 'object' ? ticket.status?.id : undefined}
                    onStatusChange={async (id, reason, comment) => { await handleStatusChange(id, reason, comment); }}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Priority</div>
              {ticket && <PriorityBadge priority={ticket.priority as any} size="sm" />}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicketDetailPanel;


