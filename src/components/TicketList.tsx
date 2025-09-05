import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { TicketService, type Ticket } from '@/lib/services/ticketService';
import { ticketSystemService } from '@/lib/services/ticketSystemService';
import { useApi } from '@/hooks/useApi';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketStatusChange } from './TicketStatusChange';
import { PriorityBadge } from './PriorityBadge';
import { toast } from 'sonner';


type TicketListProps = {
  showStatusChange?: boolean;
};

export const TicketList = ({ showStatusChange = true }: TicketListProps) => {
  // Fetch tickets from backend API
  const { 
    data: ticketsData, 
    loading, 
    error, 
    execute: fetchTickets 
  } = useApi(
    () => TicketService.getTickets(),
    { autoExecute: false }
  );

  // Handle status change
  const handleStatusChange = async (ticketId: string, newStatusId: string, reason?: string, comment?: string) => {
    try {
      // Persist status change to backend with reason/comment
      await TicketService.updateTicketStatus(ticketId, newStatusId, { reason, comment });
      toast.success('Status updated successfully');
      await fetchTickets();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
      throw error;
    }
  };

  // Use useEffect to fetch data on component mount
  useEffect(() => {
    fetchTickets();
  }, []); // Empty dependency array to run only once

  const tickets = ticketsData?.data || [];



  // Refresh data function
  const refreshData = () => {
    fetchTickets();
  };

  if (loading && !ticketsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket List</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Loading tickets from backend...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket List</CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <div className="text-center text-sm text-red-600">
            <p>Failed to load tickets: {error}</p>
            <Button variant="outline" onClick={refreshData} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Ticket List</CardTitle>
          <Button variant="outline" size="sm" onClick={refreshData}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>


        {/* Real Data Table */}
        <div className="rounded-md border animate-in fade-in slide-in-from-bottom-4 duration-500">

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length > 0 ? (
                tickets.map((ticket: Ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono font-medium">
                      #{ticket.ticketNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{ticket.title}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {ticket.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TicketStatusBadge status={ticket.status as any} size="sm" />
                        {showStatusChange && (
                          <TicketStatusChange
                            ticketId={ticket.id}
                            currentStatus={typeof (ticket as any).status === 'string' ? (ticket as any).status : (ticket as any).status?.name}
                            currentStatusId={typeof (ticket as any).status === 'object' ? (ticket as any).status?.id : undefined}
                            onStatusChange={(newStatusId, reason, comment) => 
                              handleStatusChange(ticket.id, newStatusId, reason, comment)
                            }
                            className="ml-2"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={ticket.priority as any} size="sm" className="hover:brightness-95" />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const catObj = (ticket as any).categoryInfo || (typeof (ticket as any).category === 'object' ? (ticket as any).category : undefined);
                        const catName = typeof (ticket as any).category === 'object' ? (ticket as any).category?.name : ((ticket as any).category || (ticket as any).categoryInfo?.name);
                        const color = (catObj?.color || 'gray').toLowerCase();
                        return (
                          <Badge variant="outline" className={`${ticketSystemService.getCategoryColorClass(color)} text-xs rounded-full px-2.5 py-0.5 hover:brightness-95`}>
                            <span className="capitalize font-medium">{typeof catName === 'string' ? catName : 'Unknown'}</span>
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ticket.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {ticket.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                            {ticket.assignee.firstName.charAt(0)}
                          </div>
                          <span className="text-sm">
                            {ticket.assignee.middleName ? `${ticket.assignee.firstName} ${ticket.assignee.middleName} ${ticket.assignee.lastName}` : `${ticket.assignee.firstName} ${ticket.assignee.lastName}`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">No tickets found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {tickets.length > 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Showing {tickets.length} tickets from backend database
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
