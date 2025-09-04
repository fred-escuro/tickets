import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TicketStatusBadge } from '@/components/TicketStatusBadge';
import { TicketStatusChange } from '@/components/TicketStatusChange';
import { AttachmentDisplay } from '@/components/ui/attachment-display';
import { RichTextDisplay } from '@/components/ui/rich-text-display';
import { AddCommentDialog } from '@/components/ui/add-comment-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TicketDetailPanel from '@/components/TicketDetailPanel';
import { CommentService } from '@/lib/services/commentService';
import type { FileAttachment } from '@/components/ui/file-upload';
import { apiClient, API_ENDPOINTS } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Paperclip, User, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';

type LoadedTicket = any;

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<LoadedTicket | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

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
  }, [id]);

  useEffect(() => {
    if (id) void loadComments();
  }, [id]);

  const statusName = useMemo(() => {
    if (!ticket) return '';
    return typeof ticket.status === 'string' ? ticket.status : ticket.status?.name || '';
  }, [ticket]);

  const priorityName = useMemo(() => {
    if (!ticket) return '';
    return typeof ticket.priority === 'string' ? ticket.priority : ticket.priority?.name || '';
  }, [ticket]);

  const handleStatusChange = async (newStatusId: string, reason?: string, commentText?: string) => {
    if (!id) return;
    const res = await apiClient.put(API_ENDPOINTS.TICKETS.UPDATE(id), { statusId: newStatusId });
    if (!res.success) {
      toast.error(res.error || 'Failed to update status');
      return;
    }
    toast.success('Status updated');
    // Optionally record reason/comment as a ticket comment
    try {
      const contentParts: string[] = [];
      if (reason && reason.trim().length > 0) contentParts.push(`Reason: ${reason.trim()}`);
      if (commentText && commentText.trim().length > 0) contentParts.push(commentText.trim());
      if (contentParts.length > 0) {
        await CommentService.createComment({
          ticketId: id,
          content: contentParts.join('\n\n'),
          isInternal: false,
          attachments: []
        });
      }
    } catch (e) {
      console.warn('Status updated but failed to add comment:', e);
    }
    await fetchTicket();
    await loadComments();
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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/tickets')} className="gap-2">
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
        <div className="flex items-center gap-2">
          {ticket && (
            <TicketStatusBadge status={ticket.status as any} size="sm" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Ticket Number</div>
                  {ticket && <div className="text-sm font-medium">#{ticket.ticketNumber}</div>}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  {ticket && <Badge variant="outline" className="text-xs capitalize">{statusName || 'Unknown'}</Badge>}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Priority</div>
                  {ticket && <Badge variant="outline" className="text-xs capitalize">{priorityName || 'Unknown'}</Badge>}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Category</div>
                  {ticket?.categoryInfo ? (
                    <Badge variant="outline" className="text-xs capitalize">{ticket.categoryInfo.name}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs capitalize">{ticket?.category || 'Unknown'}</Badge>
                  )}
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
              </div>

              <Separator />

              <div className="prose max-w-none">
                {ticket ? (
                  <RichTextDisplay content={ticket.description} />
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
          </Card>

          {/* Timeline */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Timeline ({groupedTimeline.length} items){isLoadingComments && <span className="text-xs text-muted-foreground ml-2">(Loading comments...)</span>}</div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setShowAddComment(true)} className="gap-2" disabled={isLoadingComments}>
                    <MessageSquare className="h-4 w-4" />
                    Add Comment
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
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
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                      {isExpanded && (
                        <div className="p-4">
                          {item.type === 'issue' ? (
                            <div className="space-y-3">
                              <RichTextDisplay content={item.data.description} />
                              {item.data.attachments?.length > 0 && <AttachmentDisplay attachments={item.data.attachments} />}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <RichTextDisplay content={item.data.content} />
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
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Status</div>
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
                    />
                  </div>
                )}
              </div>

              {/* Priority and Category removed per request */}
            </CardContent>
          </Card>
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
    </div>
  );
};

export default TicketDetailPage;


