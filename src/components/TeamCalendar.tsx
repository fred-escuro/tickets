import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ticketEvents } from '@/data/mockData';
import { ArrowRight, Calendar, Clock, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';
import { useWaveAnimation } from '@/hooks/useWaveAnimation';
import { type FC } from 'react';
import { Link } from 'react-router-dom';

export const TeamCalendar: FC = () => {
  const { containerRef, getItemStyle, getItemClassName } = useWaveAnimation();
  
  const upcomingEvents = ticketEvents
    .filter(event => new Date(event.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ticket-due':
        return <Clock className="h-3 w-3" />;
      case 'sla-deadline':
        return <AlertCircle className="h-3 w-3" />;
      case 'agent-assignment':
        return <MessageSquare className="h-3 w-3" />;
      case 'follow-up':
        return <CheckCircle className="h-3 w-3" />;
      case 'escalation':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Calendar className="h-3 w-3" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'ticket-due':
        return 'text-blue-600';
      case 'sla-deadline':
        return 'text-orange-600';
      case 'agent-assignment':
        return 'text-green-600';
      case 'follow-up':
        return 'text-purple-600';
      case 'escalation':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold">Ticket Calendar</CardTitle>
        <Link to="/calendar">
          <Button variant="ghost" size="sm" className="gap-2 h-8">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent ref={containerRef} className="space-y-4">
        {/* Upcoming Events */}
        <div 
          className={getItemClassName("space-y-3")}
          style={getItemStyle(0)}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Upcoming Events</h4>
          </div>
          
          {upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map((event, index) => (
                <div 
                  key={event.id} 
                  className={getItemClassName("p-2 rounded-lg bg-muted/30 space-y-2")}
                  style={getItemStyle(1 + index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {event.type.replace('-', ' ')}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className={`${getEventColor(event.type)}`}>
                        {getEventIcon(event.type)}
                      </div>
                      <span>{formatDate(event.date)}</span>
                    </div>
                    <span className={`font-medium ${getPriorityColor(event.priority)}`}>
                      {event.priority}
                    </span>
                  </div>
                  
                  {event.assignedTo && (
                    <div className="text-xs text-muted-foreground">
                      Assigned to: {event.assignedTo}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div 
              className={getItemClassName("text-center py-4")}
              style={getItemStyle(1)}
            >
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No upcoming events</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div 
          className={getItemClassName("pt-3 border-t")}
          style={getItemStyle(4)}
        >
          <Link to="/calendar" className="block">
            <Button variant="outline" size="sm" className="w-full justify-center gap-2 h-8">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">View Calendar</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
