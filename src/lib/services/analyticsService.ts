import { apiClient, API_ENDPOINTS } from '../api';

// Types for analytics data
export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

export interface TicketActivityData {
  date: string;
  ticketsCreated: number;
  ticketsResolved: number;
  ticketsEscalated: number;
  avgResolutionTime: number;
}

export interface TicketMetrics {
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  weeklyChange: number;
  priorityDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
}

export interface TicketMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changeType: 'increase' | 'decrease';
  unit: string;
  icon: string;
}

// Analytics service
export class AnalyticsService {
  // Get ticket statistics overview
  static async getTicketStats(): Promise<{
    success: boolean;
    data: TicketStats;
  }> {
    const response = await apiClient.get(API_ENDPOINTS.TICKETS.STATS_OVERVIEW);
    return {
      success: response.success,
      data: response.data as TicketStats || { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 }
    };
  }

  // Get ticket activity data for charts
  static async getTicketActivity(days: number = 7): Promise<{
    success: boolean;
    data: TicketActivityData[];
  }> {
    const response = await apiClient.get(`${API_ENDPOINTS.TICKETS.STATS_ACTIVITY}?days=${days}`);
    return {
      success: response.success,
      data: response.data as TicketActivityData[] || []
    };
  }

  // Get detailed ticket metrics
  static async getTicketMetrics(): Promise<{
    success: boolean;
    data: TicketMetrics;
  }> {
    const response = await apiClient.get(API_ENDPOINTS.TICKETS.STATS_METRICS);
    return {
      success: response.success,
      data: response.data as TicketMetrics || {
        openTickets: 0,
        inProgressTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0,
        weeklyChange: 0,
        priorityDistribution: {},
        statusDistribution: {}
      }
    };
  }

  // Transform metrics data to match the UI format
  static transformMetricsToUI(metrics: TicketMetrics): TicketMetric[] {
    const totalTickets = metrics.openTickets + metrics.inProgressTickets + metrics.resolvedTickets + metrics.closedTickets;
    
    return [
      {
        id: 'TM-001',
        name: 'Open Tickets',
        value: metrics.openTickets,
        previousValue: Math.max(0, metrics.openTickets - Math.round(metrics.openTickets * 0.1)),
        change: metrics.openTickets > 0 ? Math.round((metrics.openTickets - Math.max(0, metrics.openTickets - Math.round(metrics.openTickets * 0.1))) / Math.max(0, metrics.openTickets - Math.round(metrics.openTickets * 0.1)) * 100) : 0,
        changeType: metrics.weeklyChange > 0 ? 'increase' : 'decrease',
        unit: 'tickets',
        icon: 'AlertCircle'
      },
      {
        id: 'TM-002',
        name: 'In Progress',
        value: metrics.inProgressTickets,
        previousValue: Math.max(0, metrics.inProgressTickets - Math.round(metrics.inProgressTickets * 0.15)),
        change: metrics.inProgressTickets > 0 ? Math.round((metrics.inProgressTickets - Math.max(0, metrics.inProgressTickets - Math.round(metrics.inProgressTickets * 0.15))) / Math.max(0, metrics.inProgressTickets - Math.round(metrics.inProgressTickets * 0.15)) * 100) : 0,
        changeType: metrics.weeklyChange > 0 ? 'increase' : 'decrease',
        unit: 'tickets',
        icon: 'Clock'
      },
      {
        id: 'TM-003',
        name: 'Resolved',
        value: metrics.resolvedTickets,
        previousValue: Math.max(0, metrics.resolvedTickets - Math.round(metrics.resolvedTickets * 0.2)),
        change: metrics.resolvedTickets > 0 ? Math.round((metrics.resolvedTickets - Math.max(0, metrics.resolvedTickets - Math.round(metrics.resolvedTickets * 0.2))) / Math.max(0, metrics.resolvedTickets - Math.round(metrics.resolvedTickets * 0.2)) * 100) : 0,
        changeType: 'increase',
        unit: 'tickets',
        icon: 'CheckCircle'
      },
      {
        id: 'TM-004',
        name: 'Total Tickets',
        value: totalTickets,
        previousValue: Math.max(0, totalTickets - Math.round(totalTickets * 0.1)),
        change: metrics.weeklyChange,
        changeType: metrics.weeklyChange > 0 ? 'increase' : 'decrease',
        unit: 'tickets',
        icon: 'FileText'
      }
    ];
  }
}
