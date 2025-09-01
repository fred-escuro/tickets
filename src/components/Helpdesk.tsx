import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowRight, Headphones, Clock, AlertCircle, CheckCircle, MessageSquare, Loader2 } from 'lucide-react';

import { type FC } from 'react';
import { Link } from 'react-router-dom';
import { TicketService, type Ticket } from '@/lib/services/ticketService';
import { useApi } from '@/hooks/useApi';

export const Helpdesk: FC = () => {

  

  
  // Fetch tickets using the API hook
  const { data: ticketsData, loading: ticketsLoading, error, execute: fetchTickets } = useApi(
    TicketService.getTickets,
    { autoExecute: false }
  );

  // Fetch ticket statistics
  const { data: statsData, loading: statsLoading, error: statsError, execute: fetchStats } = useApi(
    TicketService.getTicketStats,
    { autoExecute: false }
  );

  // Use useEffect to fetch data on component mount (only once)
  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, []); // Empty dependency array - only run once on mount



  const tickets = ticketsData?.data || [];
  const stats = statsData?.data;



  // Filter tickets for display
  const openTickets = tickets.filter(ticket => 
    ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS'
  );
  const resolvedTickets = tickets.filter(ticket => 
    ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
  );
  const recentTickets = tickets.slice(0, 3);



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800 border-blue-300 font-medium';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 font-medium';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800 border-green-300 font-medium';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800 border-gray-300 font-medium';
      case 'ESCALATED':
        return 'bg-red-100 text-red-800 border-red-300 font-medium';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 font-medium';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <AlertCircle className="h-3 w-3" />;
      case 'IN_PROGRESS':
        return <Clock className="h-3 w-3" />;
      case 'RESOLVED':
      case 'CLOSED':
        return <CheckCircle className="h-3 w-3" />;
      case 'ESCALATED':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'text-red-700 font-semibold';
      case 'HIGH':
        return 'text-orange-700 font-semibold';
      case 'MEDIUM':
        return 'text-yellow-700 font-semibold';
      case 'LOW':
        return 'text-green-700 font-semibold';
      default:
        return 'text-gray-700 font-medium';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'Open';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'RESOLVED':
        return 'Resolved';
      case 'CLOSED':
        return 'Closed';
      case 'ESCALATED':
        return 'Escalated';
      default:
        return status;
    }
  };

  const getPriorityDisplayName = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'Critical';
      case 'HIGH':
        return 'High';
      case 'MEDIUM':
        return 'Medium';
      case 'LOW':
        return 'Low';
      default:
        return priority;
    }
  };

  // Refresh data
  const refreshData = () => {
    fetchTickets();
    fetchStats();
  };

  if (ticketsLoading || statsLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-semibold">Helpdesk</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading tickets...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || statsError) {
    const errorMessage = error || statsError;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-semibold">Helpdesk</CardTitle>
          <Button variant="outline" size="sm" onClick={refreshData} className="h-8">
            Retry
          </Button>
        </CardHeader>
        <CardContent className="py-4">
          <div className="text-center text-sm text-red-600">
            <p>Failed to load data: {errorMessage}</p>
            <Button variant="outline" size="sm" onClick={refreshData} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show loading state only if both are still loading and we have no data at all
  if (ticketsLoading && statsLoading && !ticketsData && !statsData) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-semibold">Helpdesk</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold">Helpdesk</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshData} className="h-8">
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchStats()} className="h-8">
            Stats
          </Button>
          <Link to="/helpdesk">
            <Button variant="ghost" size="sm" className="gap-2 h-8">
              Support
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">


        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">

          <div className="space-y-1 p-4 rounded-lg bg-muted/30 border text-center">
            <p className="text-2xl font-bold text-blue-700">
              {statsLoading && !stats ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : stats && typeof stats.open === 'number' && typeof stats.inProgress === 'number' 
                ? stats.open + stats.inProgress 
                : openTickets.length}
            </p>
            <p className="text-sm font-medium text-gray-700">
              {statsLoading && !stats ? 'Loading...' : stats ? 'Open Tickets' : 'Open Tickets (from tickets)'}
            </p>
          </div>
          <div className="space-y-1 p-4 rounded-lg bg-muted/30 border text-center">
            <p className="text-2xl font-bold text-green-700">
              {statsLoading && !stats ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : stats && typeof stats.resolved === 'number' && typeof stats.closed === 'number'
                ? stats.resolved + stats.closed 
                : resolvedTickets.length}
            </p>
            <p className="text-sm font-medium text-gray-700">
              {statsLoading && !stats ? 'Loading...' : stats ? 'Resolved' : 'Resolved (from tickets)'}
            </p>
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Recent Tickets</h4>
          </div>
          
          {recentTickets.length > 0 ? (
            <div className="space-y-2">
              {recentTickets.map((ticket, index) => (
                <div 
                  key={ticket.id} 
                  className="p-2 rounded-lg bg-muted/30 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate text-foreground">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.id} • {formatDate(ticket.submittedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Badge className={`${getStatusColor(ticket.status)} border text-xs px-1.5 py-0.5`}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(ticket.status)}
                          <span className="capitalize">{getStatusDisplayName(ticket.status)}</span>
                        </div>
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium capitalize ${getPriorityColor(ticket.priority)}`}>
                      {getPriorityDisplayName(ticket.priority)} Priority
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {ticket.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No support tickets</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="pt-3 border-t">
          <Link to="/helpdesk" className="block">
            <Button variant="outline" size="sm" className="w-full justify-center gap-2 h-8">
              <Headphones className="h-3 w-3" />
              <span className="text-xs">Submit Ticket</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
