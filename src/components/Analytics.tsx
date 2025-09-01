import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ticketMetrics, ticketActivityData } from '@/data/mockData';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useWaveAnimation } from '@/hooks/useWaveAnimation';
import { type FC } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from 'recharts';

export const Analytics: FC = () => {
  const { containerRef, getItemStyle, getItemClassName } = useWaveAnimation();
  
  const chartColors = {
    primary: '#3b82f6',
    secondary: '#10b981'
  };

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
      <CardContent ref={containerRef} className="space-y-6">
        {/* Key Metrics Grid - Expanded for main layout */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6">
          {ticketMetrics.slice(0, 4).map((metric, index) => (
            <div 
              key={metric.id} 
              className={getItemClassName("space-y-3 p-4 rounded-lg bg-muted/30 border")}
              style={getItemStyle(index)}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.name}
                </p>
                {metric.changeType === 'increase' ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
              <p className="text-2xl font-bold">
                {metric.value}{metric.unit === '%' ? '%' : ''}
              </p>
              <p className={`text-sm ${
                metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.changeType === 'increase' ? '+' : '-'}{metric.change}% from last week
              </p>
            </div>
          ))}
        </div>

        {/* Mini Activity Chart - Enhanced for main layout */}
        <div 
          className={getItemClassName("grid grid-cols-1 lg:grid-cols-2 gap-6")}
          style={getItemStyle(4)}
        >
          <div className="space-y-4">
            <h4 className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Ticket Activity (7 days)
            </h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ticketActivityData.slice(-7)}>
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
                <LineChart data={ticketActivityData.slice(-7)}>
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
