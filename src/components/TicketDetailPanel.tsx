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
import { toast } from 'sonner';
import { Calendar, Paperclip, User } from 'lucide-react';

interface Props { ticketId: string }

export const TicketDetailPanel: React.FC<Props> = ({ ticketId }) => {
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<any>(null);

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

  const handleStatusChange = async (newStatusId: string) => {
    const res = await apiClient.put(API_ENDPOINTS.TICKETS.UPDATE(ticketId), { statusId: newStatusId });
    if (!res.success) { toast.error(res.error || 'Failed to update status'); return; }
    toast.success('Status updated');
    await fetchTicket();
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
                </>
              )}
            </div>
            <Separator />
            {ticket ? (
              <RichTextDisplay content={ticket.description} />
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
                    onStatusChange={async (id) => { await handleStatusChange(id); }}
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


