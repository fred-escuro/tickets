import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { PageWrapper, PageSection } from '@/components/PageWrapper';
import { 
  ticketMetrics, 
  ticketActivityData, 
  departmentPerformanceData, 
  ticketStatusData, 
  ticketCategoryData,
  ticketTrendData,
  type TicketMetric 
} from '@/data/mockData';
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
import { useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
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

  return (
    <div className="min-h-screen bg-background">
      <PageWrapper className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
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
        </PageSection>

        {/* Charts Section */}
        <PageSection index={2}>
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
                  </CardContent>
                </Card>

                {/* Ticket Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ticket Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={ticketStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {ticketStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
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
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={departmentPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="department" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="ticketsHandled" fill={chartColors.primary} name="Tickets Handled" />
                        <Bar dataKey="slaCompliance" fill={chartColors.secondary} name="SLA Compliance %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Resolution Time by Department */}
                <Card>
                  <CardHeader>
                    <CardTitle>Average Resolution Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={departmentPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="department" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="avgResolutionTime" fill={chartColors.tertiary} name="Hours" />
                      </BarChart>
                    </ResponsiveContainer>
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
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={ticketTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="ticketsCreated" 
                          stroke={chartColors.primary} 
                          name="Created"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="ticketsResolved" 
                          stroke={chartColors.secondary} 
                          name="Resolved"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Response & Resolution Times */}
                <Card>
                  <CardHeader>
                    <CardTitle>Response & Resolution Times</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={ticketTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="avgResponseTime" 
                          stroke={chartColors.tertiary} 
                          name="Response Time (hrs)"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="avgResolutionTime" 
                          stroke={chartColors.danger} 
                          name="Resolution Time (hrs)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
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
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={ticketCategoryData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill={chartColors.primary} name="Ticket Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Category Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Category Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={ticketCategoryData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="avgResolutionTime" fill={chartColors.secondary} name="Avg Resolution (hrs)" />
                        <Bar dataKey="escalationRate" fill={chartColors.danger} name="Escalation Rate %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </PageSection>
      </PageWrapper>
    </div>
  );
};
