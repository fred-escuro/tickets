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
import { useApi } from '@/hooks/useApi';


export const TicketList = () => {

  
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
                      <Badge className={`${
                        ticket.status === 'OPEN' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        ticket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                        ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-700 border-green-200' :
                        ticket.status === 'CLOSED' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                        'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        ticket.priority === 'CRITICAL' ? 'text-red-600' :
                        ticket.priority === 'HIGH' ? 'text-orange-600' :
                        ticket.priority === 'MEDIUM' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {ticket.priority}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize">
                      {ticket.category}
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
