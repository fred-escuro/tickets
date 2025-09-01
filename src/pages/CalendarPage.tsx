import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { PageWrapper, PageSection } from '@/components/PageWrapper';
import { ticketEvents, type TicketEvent } from '@/data/mockData';
import { ArrowLeft, Search, Filter, Calendar, AlertCircle, Clock, CheckCircle, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { useState, type FC } from 'react';
import { Link } from 'react-router-dom';

const getEventIcon = (type: TicketEvent['type']) => {
  switch (type) {
    case 'ticket-due':
      return <Clock className="h-4 w-4" />;
    case 'sla-deadline':
      return <AlertCircle className="h-4 w-4" />;
    case 'agent-assignment':
      return <MessageSquare className="h-4 w-4" />;
    case 'follow-up':
      return <CheckCircle className="h-4 w-4" />;
    case 'escalation':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
};

const getEventColor = (type: TicketEvent['type']) => {
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

const getEventBgColor = (type: TicketEvent['type']) => {
  switch (type) {
    case 'ticket-due':
      return 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/10 dark:border-blue-500/30';
    case 'sla-deadline':
      return 'bg-orange-500/5 dark:bg-orange-500/10 border-orange-500/10 dark:border-orange-500/30';
    case 'agent-assignment':
      return 'bg-green-500/5 dark:bg-green-500/10 border-green-500/10 dark:border-green-500/30';
    case 'follow-up':
      return 'bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/10 dark:border-purple-500/30';
    case 'escalation':
      return 'bg-red-500/5 dark:bg-red-500/10 border-red-500/10 dark:border-red-500/30';
    default:
      return 'bg-muted/50 border-border';
  }
};

const getPriorityColor = (priority: TicketEvent['priority']) => {
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

export const CalendarPage: FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get unique event types for filter
  const eventTypes = Array.from(new Set(ticketEvents.map(event => event.type))).sort();

  // Filter events based on search and type
  const filteredEvents = ticketEvents.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === 'all' || event.type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Calendar helper functions
  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getEventsForDate = (day: number) => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getFullYear() === targetDate.getFullYear() &&
             eventDate.getMonth() === targetDate.getMonth() &&
             eventDate.getDate() === targetDate.getDate();
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === currentDate.getFullYear() &&
           today.getMonth() === currentDate.getMonth() &&
           today.getDate() === day;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageWrapper className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
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
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Ticket Calendar</h1>
              <p className="text-muted-foreground">
                View ticket deadlines, SLA dates, and scheduled events
              </p>
            </div>
          </div>
        </PageSection>

        {/* Filters Section */}
        <PageSection index={1}>
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Event Types</SelectItem>
                      {eventTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredEvents.length} events
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>

        {/* Calendar Section */}
        <PageSection index={2}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                      className="gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <h2 className="text-lg font-semibold">{getMonthName(currentDate)}</h2>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                      className="gap-2"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Day Headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                        {day}
                      </div>
                    ))}

                    {/* Empty cells for first week */}
                    {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, index) => (
                      <div key={`empty-${index}`} className="p-2 min-h-[80px] bg-muted/20 rounded" />
                    ))}

                    {/* Calendar Days */}
                    {Array.from({ length: getDaysInMonth(currentDate) }).map((_, index) => {
                      const day = index + 1;
                      const events = getEventsForDate(day);
                      const isCurrentDay = isToday(day);
                      
                      return (
                        <div
                          key={day}
                          className={`p-2 min-h-[80px] border rounded transition-colors ${
                            isCurrentDay 
                              ? 'bg-primary/10 border-primary/20' 
                              : 'bg-background border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-medium ${
                              isCurrentDay ? 'text-primary' : 'text-foreground'
                            }`}>
                              {day}
                            </span>
                            {events.length > 0 && (
                              <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                                {events.length}
                              </span>
                            )}
                          </div>
                          
                          {/* Events for this day */}
                          <div className="space-y-1">
                            {events.slice(0, 2).map((event) => (
                              <div
                                key={event.id}
                                className={`text-xs p-1 rounded border ${getEventBgColor(event.type)}`}
                                title={`${event.title} - ${event.description}`}
                              >
                                <div className="flex items-center gap-1">
                                  {getEventIcon(event.type)}
                                  <span className={`font-medium ${getEventColor(event.type)}`}>
                                    {event.title}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {formatTime(event.date)}
                                </div>
                              </div>
                            ))}
                            {events.length > 2 && (
                              <div className="text-xs text-muted-foreground text-center">
                                +{events.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Events List */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
                  
                  <div className="space-y-3">
                    {filteredEvents
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 10)
                      .map((event) => (
                        <div
                          key={event.id}
                          className={`p-3 rounded-lg border ${getEventBgColor(event.type)}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 ${getEventColor(event.type)}`}>
                              {getEventIcon(event.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium line-clamp-1">
                                {event.title}
                              </h4>
                              {event.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {event.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(event.date)}
                                </span>
                                <span className={`text-xs font-medium ${getPriorityColor(event.priority)}`}>
                                  {event.priority}
                                </span>
                              </div>
                              {event.assignedTo && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Assigned to: {event.assignedTo}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {filteredEvents.length === 0 && (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">
                        No events found for the selected criteria.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </PageSection>
      </PageWrapper>
    </div>
  );
};
