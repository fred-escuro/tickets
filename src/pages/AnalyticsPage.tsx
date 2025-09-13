import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { PageWrapper, PageSection } from '@/components/PageWrapper';
import { AnalyticsService, type TicketMetric, type TicketActivityData } from '@/lib/services/analyticsService';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  Users,
  MessageSquare,
  Clock,
  Download,
  AlertCircle,
  CheckCircle,
  Star
} from 'lucide-react';
import { useState, useEffect, type FC } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Chart color schemes
const chartColors = {
  primary: '#3b82f6',
  secondary: '#10b981',
  tertiary: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899'
};

const pieColors = [chartColors.primary, chartColors.secondary, chartColors.tertiary, chartColors.danger];

const getMetricIcon = (iconName: string) => {
  switch (iconName) {
    case 'MessageSquare':
      return <MessageSquare className="h-5 w-5" />;
    case 'Users':
      return <Users className="h-5 w-5" />;
    case 'Clock':
      return <Clock className="h-5 w-5" />;
    case 'AlertCircle':
      return <AlertCircle className="h-5 w-5" />;
    case 'CheckCircle':
      return <CheckCircle className="h-5 w-5" />;
    case 'Star':
      return <Star className="h-5 w-5" />;
    default:
      return <TrendingUp className="h-5 w-5" />;
  }
};

const MetricCard: FC<{ metric: TicketMetric }> = ({ metric }) => (
  <Card>
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">{metric.name}</p>
          <p className="text-lg sm:text-2xl font-bold">
            {metric.value}{metric.unit === '%' ? '%' : ''}
            {metric.unit !== '%' && metric.unit !== 'tickets' && metric.unit !== 'hours' && metric.unit !== '/5' && (
              <span className="text-xs sm:text-sm text-muted-foreground ml-1">{metric.unit}</span>
            )}
          </p>
          <div className="flex items-center gap-1 text-xs sm:text-sm">
            {metric.changeType === 'increase' ? (
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
            )}
            <span className={metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}>
              {metric.change}%
            </span>
            <span className="text-muted-foreground">vs last period</span>
          </div>
        </div>
        <div className={`p-2 sm:p-3 rounded-full ${
          metric.changeType === 'increase' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        }`}>
          {getMetricIcon(metric.icon)}
        </div>
      </div>
    </CardContent>
  </Card>
);

export const AnalyticsPage: FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [ticketMetrics, setTicketMetrics] = useState<TicketMetric[]>([]);
  const [ticketActivityData, setTicketActivityData] = useState<TicketActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const authToken = localStorage.getItem('auth-token');
        if (!authToken) {
          setError('Please log in to view analytics');
          setLoading(false);
          return;
        }

        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        
        const [metricsResponse, activityResponse] = await Promise.all([
          AnalyticsService.getTicketMetrics(),
          AnalyticsService.getTicketActivity(days)
        ]);

        console.log('AnalyticsPage API responses:', { metricsResponse, activityResponse });

        if (metricsResponse.success && activityResponse.success) {
          const transformedMetrics = AnalyticsService.transformMetricsToUI(metricsResponse.data);
          setTicketMetrics(transformedMetrics);
          setTicketActivityData(activityResponse.data);
        } else {
          console.error('AnalyticsPage API failed:', { metricsResponse, activityResponse });
          setError('Failed to fetch analytics data');
        }
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError(`Failed to load analytics data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [timeRange]);

  return (
    <div className="min-h-screen bg-background">
      <PageWrapper className="max-w-[1500px] lg:pl-[calc(var(--sidebar-width,14rem)+1.5rem)] py-6">
        {/* Header Section */}
        <PageSection index={0}>
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Ticket Reports & Analytics</h1>
                <p className="text-muted-foreground">
                  Monitor ticket performance, SLA compliance, and team productivity
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </PageSection>

        {/* Key Metrics */}
        <PageSection index={1}>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Unable to load analytics</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {ticketMetrics.map((metric, index) => (
                <div 
                  key={metric.id}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-300"
                  style={{ animationDelay: `${(index + 1) * 100}ms` }}
                >
                  <MetricCard metric={metric} />
                </div>
              ))}
            </div>
          )}
        </PageSection>

        {/* Charts Section */}
        <PageSection index={2}>
          {loading ? (
            <div className="space-y-6">
              <div className="h-10 bg-muted rounded animate-pulse"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(2)].map((_, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="h-6 bg-muted rounded animate-pulse"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] bg-muted rounded animate-pulse"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Unable to load charts</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 max-w-md">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Ticket Activity Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Ticket Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {ticketActivityData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={ticketActivityData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Area 
                              type="monotone" 
                              dataKey="ticketsCreated" 
                              stackId="1" 
                              stroke={chartColors.primary} 
                              fill={chartColors.primary} 
                              name="Created"
                            />
                            <Area 
                              type="monotone" 
                              dataKey="ticketsResolved" 
                              stackId="1" 
                              stroke={chartColors.secondary} 
                              fill={chartColors.secondary} 
                              name="Resolved"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          No activity data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Ticket Status Distribution - Using real data */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Ticket Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {ticketMetrics.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={ticketMetrics.filter(m => m.name.includes('Status')).map(metric => ({
                                name: metric.name.replace(' Status', ''),
                                count: parseInt(metric.value.toString())
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                            >
                              {ticketMetrics.filter(m => m.name.includes('Status')).map((_, index) => (
                                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          No status data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Department Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Department performance data coming soon
                    </div>
                  </CardContent>
                </Card>

                {/* Resolution Time by Department */}
                <Card>
                  <CardHeader>
                    <CardTitle>Average Resolution Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Resolution time data coming soon
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ticket Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Ticket Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Monthly trends data coming soon
                    </div>
                  </CardContent>
                </Card>

                {/* Response & Resolution Times */}
                <Card>
                  <CardHeader>
                    <CardTitle>Response & Resolution Times</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Response time data coming soon
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ticket Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Category distribution data coming soon
                    </div>
                  </CardContent>
                </Card>

                {/* Category Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Category Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Category performance data coming soon
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
          )}
        </PageSection>
      </PageWrapper>
    </div>
  );
};
