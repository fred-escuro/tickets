import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowRight, Headphones, Clock, AlertCircle, CheckCircle, MessageSquare, Loader2, AlertTriangle, User, Timer } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { type FC } from 'react';
import { Link } from 'react-router-dom';
import { TicketService, type Ticket } from '@/lib/services/ticketService';
import { ticketSystemService } from '@/lib/services/ticketSystemService';
import { useApi } from '@/hooks/useApi';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketStatusChange } from './TicketStatusChange';
import { PriorityBadge } from './PriorityBadge';
import { toast } from 'sonner';

type HelpdeskProps = {
  showStatusChange?: boolean;
};

export const Helpdesk: FC<HelpdeskProps> = ({ showStatusChange = true }) => {

  

  
  // Fetch tickets using the API hook
  const { data: ticketsData, loading: ticketsLoading, error, execute: fetchTickets } = useApi(
    TicketService.getTickets,
    { autoExecute: false }
  );

  // Fetch ticket statistics
  const { data: statsData, loading: statsLoading, error: statsError, execute: fetchStats } = useApi(
    (range?: string) => TicketService.getTicketStats(range),
    { autoExecute: false }
  );

  // Use useEffect to fetch data on component mount (only once)
  const [statsRange, setStatsRange] = useState<'today'|'7d'|'30d'|'all'>('today');

  useEffect(() => {
    fetchTickets();
    fetchStats(statsRange);
  }, [statsRange]); // refetch when range changes



  const tickets = ticketsData?.data || [];
  const stats = statsData?.data;



  // Filter tickets for display
  const getStatusName = (t: any) => (typeof t.status === 'string' ? t.status : t.status?.name || '');
  const openTickets = tickets.filter(t => {
    const s = getStatusName(t).toUpperCase();
    return s === 'OPEN' || s === 'IN_PROGRESS';
  });
  const resolvedTickets = tickets.filter(t => {
    const s = getStatusName(t).toUpperCase();
    return s === 'RESOLVED' || s === 'CLOSED';
  });
  const recentTickets = tickets.slice(0, 4);



  // Handle status change
  const handleStatusChange = async (ticketId: string, newStatusId: string, reason?: string, comment?: string) => {
    try {
      await TicketService.updateTicket(ticketId, { statusId: newStatusId });
      toast.success('Status updated successfully');
      fetchTickets();
      fetchStats();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
      throw error;
    }
  };

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

  const getSubmitterName = (t: any) => {
    if (t.submitter && (t.submitter.firstName || t.submitter.lastName)) {
      return `${t.submitter.firstName || ''}${t.submitter.firstName && t.submitter.lastName ? ' ' : ''}${t.submitter.lastName || ''}`.trim();
    }
    if (t.assignee && (t.assignee.firstName || t.assignee.lastName)) {
      // Fallback just in case submitter is missing but we still want a name-like value
      return `${t.assignee.firstName || ''}${t.assignee.firstName && t.assignee.lastName ? ' ' : ''}${t.assignee.lastName || ''}`.trim();
    }
    return 'Unknown';
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
          <Select value={statsRange} onValueChange={(v) => setStatsRange(v as any)}>
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7d</SelectItem>
              <SelectItem value="30d">Last 30d</SelectItem>
              <SelectItem value="all">All Tickets</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refreshData} className="h-8">
            Refresh
          </Button>
          <Link to="/tickets">
            <Button variant="ghost" size="sm" className="gap-2 h-8">
              Support
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">


        {/* Summary Stats - Enhanced */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Open + In Progress */}
            <div className="space-y-1 p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="text-2xl font-bold text-blue-700">
                {statsLoading && !stats ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.openInProgress ?? (openTickets.length))}
              </p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <p className="text-sm font-medium text-gray-700">Open + In Progress</p>
              </div>
            </div>
            {/* New in Range */}
            <div className="space-y-1 p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <p className="text-2xl font-bold text-purple-700">
                {statsLoading && !stats ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (stats?.new ?? 0)}
              </p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                <p className="text-sm font-medium text-gray-700">New {statsRange === 'today' ? 'Today' : statsRange.toUpperCase()}</p>
              </div>
            </div>
            {/* Resolved in Range */}
            <div className="space-y-1 p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              <p className="text-2xl font-bold text-green-700">
                {statsLoading && !stats ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (stats?.resolvedInRange ?? 0)}
              </p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5" />
                <p className="text-sm font-medium text-gray-700">Resolved {statsRange === 'today' ? 'Today' : statsRange.toUpperCase()}</p>
              </div>
            </div>
            {/* Overdue */}
            <div className="space-y-1 p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
              <p className="text-2xl font-bold text-red-700">
                {statsLoading && !stats ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (stats?.overdue ?? 0)}
              </p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                <p className="text-sm font-medium text-gray-700">Overdue</p>
              </div>
            </div>
            {/* Unassigned */}
            <div className="space-y-1 p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
              <p className="text-2xl font-bold text-orange-700">
                {statsLoading && !stats ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (stats?.unassigned ?? 0)}
              </p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <p className="text-sm font-medium text-gray-700">Unassigned</p>
              </div>
            </div>
            {/* SLA At Risk */}
            <div className="space-y-1 p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
              <p className="text-2xl font-bold text-pink-700">
                {statsLoading && !stats ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (stats?.slaAtRisk ?? 0)}
              </p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Timer className="h-3.5 w-3.5" />
                <p className="text-sm font-medium text-gray-700">SLA At Risk</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Recent Tickets</h4>
          </div>

          {recentTickets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentTickets.map((ticket, index) => (
                <div
                  key={ticket.id}
                  className="rounded-lg border bg-card text-card-foreground p-3 flex flex-col justify-between min-h-[120px] hover:shadow-md transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${600 + (index * 450)}ms` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium line-clamp-2 leading-snug">{ticket.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        #{ticket.ticketNumber} • {formatDate(ticket.submittedAt)} • Created by {getSubmitterName(ticket as any)}
                      </p>
                    </div>
                    <TicketStatusBadge status={(ticket as any).status as any} size="sm" />
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <PriorityBadge priority={(ticket as any).priority as any} size="sm" className="hover:brightness-95 transition-all duration-200" />
                    {(() => {
                      const catObj = typeof (ticket as any).category === 'object' ? (ticket as any).category : (ticket as any).categoryInfo;
                      const catName = typeof (ticket as any).category === 'object' ? (ticket as any).category?.name : ((ticket as any).category || (ticket as any).categoryInfo?.name);
                      const color = (catObj?.color || 'gray').toLowerCase();
                      return (
                        <Badge variant="outline" className={`${ticketSystemService.getCategoryColorClass(color)} text-xs rounded-full px-2.5 py-0.5 hover:brightness-95 transition-all duration-200`}>
                          <span className="capitalize font-medium">{typeof catName === 'string' ? catName : 'Unknown'}</span>
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No support tickets</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="pt-3 border-t">
          <Link to="/tickets?action=create" className="block">
            <Button variant="outline" size="sm" className="w-full justify-center gap-2 h-8 hover:scale-105 transition-all duration-300 hover:shadow-md">
              <Headphones className="h-3 w-3" />
              <span className="text-xs">Submit Ticket</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
