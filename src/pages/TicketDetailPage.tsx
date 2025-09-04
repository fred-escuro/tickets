import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TicketStatusBadge } from '@/components/TicketStatusBadge';
import { TicketStatusChange } from '@/components/TicketStatusChange';
import { PriorityBadge } from '@/components/PriorityBadge';
import { AttachmentDisplay } from '@/components/ui/attachment-display';
import { RichTextDisplay } from '@/components/ui/rich-text-display';
import { apiClient, API_ENDPOINTS } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Paperclip, User } from 'lucide-react';

type LoadedTicket = any;

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<LoadedTicket | null>(null);

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

  const statusName = useMemo(() => {
    if (!ticket) return '';
    return typeof ticket.status === 'string' ? ticket.status : ticket.status?.name || '';
  }, [ticket]);

  const priorityName = useMemo(() => {
    if (!ticket) return '';
    return typeof ticket.priority === 'string' ? ticket.priority : ticket.priority?.name || '';
  }, [ticket]);

  const handleStatusChange = async (newStatusId: string) => {
    if (!id) return;
    const res = await apiClient.put(API_ENDPOINTS.TICKETS.UPDATE(id), { statusId: newStatusId });
    if (!res.success) {
      toast.error(res.error || 'Failed to update status');
      return;
    }
    toast.success('Status updated');
    await fetchTicket();
  };

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
            <>
              <TicketStatusBadge status={ticket.status as any} size="sm" />
              <PriorityBadge priority={ticket.priority as any} size="sm" />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {ticket && (
                  <>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(ticket.submittedAt).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {ticket.submitter ? `${ticket.submitter.firstName} ${ticket.submitter.lastName}` : ticket.submittedBy}
                    </span>
                  </>
                )}
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Status</div>
                {ticket && (
                  <div className="flex items-center gap-2">
                    <TicketStatusBadge status={ticket.status as any} size="sm" />
                    <TicketStatusChange
                      ticketId={ticket.id}
                      currentStatus={statusName}
                      currentStatusId={typeof ticket.status === 'object' ? ticket.status?.id : undefined}
                      onStatusChange={async (newId) => {
                        await handleStatusChange(newId);
                      }}
                      className="ml-1"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Priority</div>
                {ticket && <PriorityBadge priority={ticket.priority as any} size="sm" />}
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Category</div>
                {ticket?.categoryInfo ? (
                  <Badge variant="outline" className="capitalize">{ticket.categoryInfo.name}</Badge>
                ) : (
                  <Badge variant="outline" className="capitalize">{ticket?.category || 'Unknown'}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;


