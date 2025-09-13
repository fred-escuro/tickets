import { useState, useRef } from 'react';
import { Bell, Check, X, MessageSquare, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { cn } from '@/lib/utils';

// Mock notifications data
const notifications = [
  {
    id: 1,
    type: 'ticket' as const,
    title: 'New ticket assigned',
    message: 'You have been assigned ticket #TKT-001',
    time: '2 minutes ago',
    read: false
  },
  {
    id: 2,
    type: 'alert' as const,
    title: 'SLA deadline approaching',
    message: 'Ticket #TKT-002 is due in 1 hour',
    time: '15 minutes ago',
    read: false
  },
  {
    id: 3,
    type: 'info' as const,
    title: 'System maintenance',
    message: 'Scheduled maintenance tonight at 2 AM',
    time: '1 hour ago',
    read: true
  }
];

type NotificationType = 'ticket' | 'alert' | 'info';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'ticket':
      return <MessageSquare className="h-4 w-4" />;
    case 'alert':
      return <AlertCircle className="h-4 w-4" />;
    case 'info':
      return <Info className="h-4 w-4" />;
  }
};

const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case 'ticket':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'alert':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'info':
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState(notifications);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(dropdownRef as React.RefObject<HTMLElement>, () => setIsOpen(false));

  const unreadCount = notificationsList.filter(n => !n.read).length;

  const markAsRead = (id: number) => {
    setNotificationsList(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotificationsList(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const removeNotification = (id: number) => {
    setNotificationsList(prev => prev.filter(notification => notification.id !== id));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        className="relative h-9 w-9 p-0"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full p-0 text-[10px] leading-none flex items-center justify-center ring-2 ring-background shadow pointer-events-none text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-80 z-50 shadow-lg border">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={markAllAsRead}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="h-80">
              <div className="p-2">
                {notificationsList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notificationsList.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          'p-3 rounded-lg border transition-colors',
                          notification.read
                            ? 'bg-background'
                            : 'bg-muted/50',
                          'hover:bg-muted/80'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'p-2 rounded-full border',
                              getNotificationColor(notification.type)
                            )}
                          >
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium leading-none">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {notification.time}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => markAsRead(notification.id)}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => removeNotification(notification.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
