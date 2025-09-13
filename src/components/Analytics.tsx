import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, ArrowRight, AlertCircle, Clock, CheckCircle, FileText } from 'lucide-react';

import { type FC, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { AnalyticsService, type TicketMetric, type TicketActivityData } from '@/lib/services/analyticsService';


export const Analytics: FC = () => {
  const [ticketMetrics, setTicketMetrics] = useState<TicketMetric[]>([]);
  const [ticketActivityData, setTicketActivityData] = useState<TicketActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const chartColors = {
    primary: '#3b82f6',
    secondary: '#10b981'
  };

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if user is authenticated
        const authToken = localStorage.getItem('auth-token');
        if (!authToken) {
          setError('Please log in to view analytics');
          setLoading(false);
          return;
        }

        // Fetch metrics and activity data in parallel
        const [metricsResponse, activityResponse] = await Promise.all([
          AnalyticsService.getTicketMetrics(),
          AnalyticsService.getTicketActivity(7)
        ]);

        console.log('Analytics API responses:', { metricsResponse, activityResponse });

        if (metricsResponse.success && activityResponse.success) {
          // Transform metrics to UI format
          const transformedMetrics = AnalyticsService.transformMetricsToUI(metricsResponse.data);
          console.log('Transformed metrics:', transformedMetrics);
          setTicketMetrics(transformedMetrics);
          setTicketActivityData(activityResponse.data);
        } else {
          console.error('Analytics API failed:', { metricsResponse, activityResponse });
          setError('Failed to fetch analytics data');
        }
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined
        });
        setError(`Failed to load analytics data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Ticket Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3 p-4 rounded-lg bg-muted/30 border animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            ))}
          </div>
          <div className="h-32 bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Ticket Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Ticket Analytics</CardTitle>
        <Link to="/reports">
          <Button variant="outline" size="sm" className="gap-2 h-8">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid - Expanded for main layout */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6">
          {ticketMetrics.slice(0, 4).map((metric) => {
            const getIcon = (iconName: string) => {
              switch (iconName) {
                case 'AlertCircle': return <AlertCircle className="h-4 w-4" />;
                case 'Clock': return <Clock className="h-4 w-4" />;
                case 'CheckCircle': return <CheckCircle className="h-4 w-4" />;
                case 'FileText': return <FileText className="h-4 w-4" />;
                default: return <FileText className="h-4 w-4" />;
              }
            };

            return (
              <div 
                key={metric.id} 
                className="space-y-3 p-4 rounded-lg bg-muted/30 border"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.name}
                  </p>
                  {getIcon(metric.icon)}
                </div>
                <p className="text-2xl font-bold">
                  {metric.value}{metric.unit === '%' ? '%' : ''}
                </p>
                <p className={`text-sm ${
                  metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.changeType === 'increase' ? '+' : ''}{metric.change}% from last week
                </p>
              </div>
            );
          })}
        </div>

        {/* Mini Activity Chart - Enhanced for main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Ticket Activity (7 days)
            </h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ticketActivityData}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { day: 'numeric' })}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                  />
                  <YAxis hide />
                  <Line 
                    type="monotone" 
                    dataKey="ticketsCreated" 
                    stroke={chartColors.primary} 
                    strokeWidth={2} 
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ticketsResolved" 
                    stroke={chartColors.secondary} 
                    strokeWidth={2} 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.primary }}></div>
                <span className="text-sm text-muted-foreground">Created</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.secondary }}></div>
                <span className="text-sm text-muted-foreground">Resolved</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-base font-semibold flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-secondary" />
              Resolution Time
            </h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ticketActivityData}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { day: 'numeric' })}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                  />
                  <YAxis hide />
                  <Line 
                    type="monotone" 
                    dataKey="avgResolutionTime" 
                    stroke={chartColors.secondary} 
                    strokeWidth={2} 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Average hours to resolve</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
