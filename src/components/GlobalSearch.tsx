import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Users, FileText, Calendar, BarChart3, Headphones } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback, type FC } from 'react';
import { searchAll, type SearchResult } from '@/lib/searchService';
import { useNavigate } from 'react-router-dom';


const typeIcons = {
  user: <Users className="h-4 w-4" />,
  ticket: <FileText className="h-4 w-4" />,
  article: <Headphones className="h-4 w-4" />,
  task: <FileText className="h-4 w-4" />,
  event: <Calendar className="h-4 w-4" />
};

export const GlobalSearch: FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const results = useMemo(() => {
    return searchAll(searchQuery);
  }, [searchQuery]);

  const handleResultClick = useCallback((result: SearchResult) => {
    navigate(result.url);
    setIsOpen(false);
    setSearchQuery('');
  }, [navigate]);

  const handleQuickAction = useCallback((type: string) => {
    switch (type) {
      case 'users':
        navigate('/users');
        break;
      case 'tickets':
        navigate('/tickets');
        break;
      case 'tasks':
        navigate('/tasks');
        break;
      case 'calendar':
        navigate('/calendar');
        break;
      case 'reports':
        navigate('/reports');
        break;
      case 'knowledge-base':
        navigate('/knowledge-base');
        break;
    }
    setIsOpen(false);
  }, [navigate]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Handle keyboard navigation within dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, handleResultClick]);

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-48 lg:w-72"
        onClick={() => setIsOpen(true)}
      >
        <span className="inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-[0.35rem] top-1/2 -translate-y-1/2 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="overflow-hidden p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets, users, articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                autoFocus
              />
            </div>
          </div>
          
          {searchQuery && (
            <div className="border-t">
              <div className="px-4 py-2">
                <p className="text-sm text-muted-foreground">
                  {results.length} results found
                </p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {results.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No results found</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {results.map((result, index) => (
                      <Button
                        key={result.id}
                        variant="ghost"
                        className={`w-full justify-start gap-3 h-auto p-3 ${
                          index === selectedIndex ? 'bg-accent' : ''
                        }`}
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex items-center gap-2">
                          {typeIcons[result.type]}
                          <div className="text-left">
                            <p className="text-sm font-medium">{result.title}</p>
                            <p className="text-xs text-muted-foreground">{result.description}</p>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!searchQuery && (
            <div className="border-t">
              <div className="px-4 py-2">
                <p className="text-sm text-muted-foreground">Quick actions</p>
              </div>
              <div className="grid grid-cols-2 gap-1 p-2">
                <Button
                  variant="ghost"
                  className="justify-start gap-2 h-auto p-3"
                  onClick={() => handleQuickAction('tickets')}
                >
                  <FileText className="h-4 w-4" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Tickets</p>
                    <p className="text-xs text-muted-foreground">View all tickets</p>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-2 h-auto p-3"
                  onClick={() => handleQuickAction('users')}
                >
                  <Users className="h-4 w-4" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Users</p>
                    <p className="text-xs text-muted-foreground">Manage users</p>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-2 h-auto p-3"
                  onClick={() => handleQuickAction('tasks')}
                >
                  <FileText className="h-4 w-4" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Tasks</p>
                    <p className="text-xs text-muted-foreground">View tasks</p>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-2 h-auto p-3"
                  onClick={() => handleQuickAction('calendar')}
                >
                  <Calendar className="h-4 w-4" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Calendar</p>
                    <p className="text-xs text-muted-foreground">View calendar</p>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-2 h-auto p-3"
                  onClick={() => handleQuickAction('reports')}
                >
                  <BarChart3 className="h-4 w-4" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Reports</p>
                    <p className="text-xs text-muted-foreground">View analytics</p>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-2 h-auto p-3"
                  onClick={() => handleQuickAction('knowledge-base')}
                >
                  <Headphones className="h-4 w-4" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Knowledge Base</p>
                    <p className="text-xs text-muted-foreground">Browse articles</p>
                  </div>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
