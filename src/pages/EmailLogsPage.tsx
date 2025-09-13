import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { PageWrapper, PageSection } from '@/components/PageWrapper';
import { 
  Mail, 
  MailOpen, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Search,
  Filter,
  Trash2,
  ArrowLeft,
  Plus,
  Loader2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { emailLogsService } from '@/lib/services/emailLogsService';
import { settingsApi } from '@/lib/services/settingsApi';
import { useProcessingModal } from '@/hooks/useProcessingModal';
import type { EmailLog, EmailLogsFilters, EmailStatistics } from '@/lib/types/emailLogs';
import { toast } from 'sonner';
import { format } from 'date-fns';

import DOMPurify from 'dompurify';
import { SimpleOutlookEmailDisplay } from '@/components/ui/simple-outlook-email-display';

// Robust HTML sanitization using DOMPurify
const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
  // Configure DOMPurify to allow safe HTML tags and attributes
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr', 'sub', 'sup', 'small', 'mark', 'del', 'ins'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src', 'width', 'height', 'class', 'id', 'style',
      'target', 'rel', 'colspan', 'rowspan', 'align', 'valign'
    ],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false
  };
  
  return DOMPurify.sanitize(html, config);
};
import { Link } from 'react-router-dom';


const directionIcons = {
  INBOUND: MailOpen,
  OUTBOUND: Send,
};

// Email Log Card Component
const EmailLogCard = ({ 
  log, 
  onView, 
  onRetry, 
  onDelete,
  getStatusColor,
  getDirectionColor
}: { 
  log: EmailLog; 
  onView: (log: EmailLog) => void; 
  onRetry: (id: string) => void; 
  onDelete: (id: string) => void;
  getStatusColor: (status: string) => string;
  getDirectionColor: (direction: string) => string;
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
      case 'PROCESSED':
        return <CheckCircle className="h-4 w-4" />;
      case 'FAILED':
      case 'ERROR':
        return <AlertCircle className="h-4 w-4" />;
      case 'PROCESSING':
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'BOUNCED':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'INBOUND' ? 
      <MailOpen className="h-4 w-4" /> : 
      <Send className="h-4 w-4" />;
  };


  return (
    <Card 
      className="h-full group hover:shadow-xl hover:bg-gradient-to-br hover:from-blue-50/60 hover:to-blue-100/30 dark:hover:from-white/5 dark:hover:to-white/[0.03] hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-300 cursor-pointer border-border hover:border-primary/20 dark:hover:border-white/10 hover:ring-2 hover:ring-primary/10 dark:hover:ring-white/10 relative overflow-hidden flex flex-col"
      onClick={() => onView(log)}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <CardContent className="p-4 relative h-full flex flex-col">
        <div className="space-y-3 flex-1 flex flex-col">
          {/* Header with direction icon, subject, and email ID */}
          <div className="flex items-start gap-2">
            <div className="group-hover:scale-110 transition-transform duration-300 p-1.5 bg-primary/10 rounded-lg">
              {getDirectionIcon(log.direction)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors duration-300">
                {log.subject || 'No Subject'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground font-mono">#{log.id.slice(-8)}</p>
              </div>
            </div>
          </div>
          
          {/* Status badges row */}
          <div className="flex flex-row gap-2 items-center">
            <Badge 
              variant="outline" 
              className={`${getDirectionColor(log.direction)} border text-xs group-hover:scale-105 transition-transform duration-300 shadow-sm hover:brightness-95`}
            >
              <div className="flex items-center gap-1">
                {getDirectionIcon(log.direction)}
                <span className="capitalize font-medium">{log.direction}</span>
              </div>
            </Badge>
            <Badge 
              variant="outline" 
              className={`${getStatusColor(log.status)} text-xs group-hover:scale-105 transition-transform duration-300 shadow-sm font-medium hover:brightness-95`}
            >
              <div className="flex items-center gap-1">
                {getStatusIcon(log.status)}
                <span className="capitalize font-medium">{log.status}</span>
              </div>
            </Badge>
            {log.ticket && (
              <Badge variant="secondary" className="text-xs group-hover:scale-105 transition-transform duration-300 shadow-sm">
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span className="font-medium">#{log.ticket.ticketNumber}</span>
                </div>
              </Badge>
            )}
          </div>
          
          {/* Email content preview */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg max-h-16 overflow-y-auto scrollbar-thin">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs text-muted-foreground">From:</span>
                  <span className="truncate text-xs">{log.from || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs text-muted-foreground">To:</span>
                  <span className="truncate text-xs">{log.to || 'Unknown'}</span>
                </div>
              </div>
            </div>

            {/* Error Message (if any) */}
            {log.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700 mt-1 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{log.error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer with metadata and action buttons */}
          <div className="mt-auto flex items-center justify-between pt-1 border-t border-border/50">
            <div className="flex flex-col gap-1 text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-300">
              <span className="group-hover:translate-x-1 transition-transform duration-300 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {log.processedAt ? format(new Date(log.processedAt), 'MMM dd, yyyy HH:mm') : 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {log.status === 'FAILED' || log.status === 'ERROR' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry(log.id);
                  }}
                  className="h-7 px-2 hover:bg-primary/10 hover:text-primary flex items-center gap-1"
                  title="Retry email"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(log.id);
                }}
                className="h-7 px-2 hover:bg-red-100 hover:text-red-700 flex items-center gap-1"
                title="Delete email log"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Memoized table row component for better performance

export default function EmailLogsPage() {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [statistics, setStatistics] = useState<EmailStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [filters, setFilters] = useState<EmailLogsFilters>({
    page: 1,
    limit: 25, // Reduced initial page size for better performance
    sortBy: 'processedAt',
    sortOrder: 'desc',
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 0,
    hasMore: true,
  });
  const [isInfiniteScroll, setIsInfiniteScroll] = useState(true);
  const [cache, setCache] = useState<Map<string, { data: EmailLog[], timestamp: number }>>(new Map());
  const [refreshKey, setRefreshKey] = useState(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Color and icon functions for status badges
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
      case 'PROCESSED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'FAILED':
      case 'ERROR':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'PROCESSING':
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'BOUNCED':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'INBOUND':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'OUTBOUND':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Processing modal for fetch emails
  const processingModal = useProcessingModal({
    title: 'Fetching Emails',
    message: 'Connecting to email server and processing new emails...',
    showProgress: true,
    allowClose: false
  });

  // Test email form
  const [testEmailData, setTestEmailData] = useState({
    to: '',
    subject: 'Test Email from TicketHub',
    text: 'This is a test email from TicketHub email tracking system.',
    html: '<p>This is a test email from TicketHub email tracking system.</p>',
  });

  // Initial load on mount
  useEffect(() => {
    loadEmailLogs();
    loadStatistics();
  }, []);

  // Debounced effect for filters to prevent too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadEmailLogs();
      loadStatistics();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [filters, refreshKey]);

  const loadEmailLogs = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      // Create cache key from filters and refresh key
      const cacheKey = JSON.stringify({ ...filters, refreshKey });
      const now = Date.now();
      
      // Check cache first (only for initial load, not for load more)
      if (!loadMore) {
        const cached = cache.get(cacheKey);
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          setEmailLogs(cached.data);
          setLoading(false);
          return;
        }
      }
      
      const response = await emailLogsService.getEmailLogs(filters);
      
      // Check if response exists and has the expected structure
      if (!response) {
        throw new Error('No response received from server');
      }
      
      const newLogs = response.logs || [];
      
      if (loadMore) {
        // Append new logs for infinite scroll
        setEmailLogs(prev => [...prev, ...newLogs]);
      } else {
        // Replace logs for new search/filter
        setEmailLogs(newLogs);
        // Cache the results
        setCache(prev => new Map(prev.set(cacheKey, { data: newLogs, timestamp: now })));
      }
      
      setPagination({
        total: response.total || 0,
        page: response.page || 1,
        limit: response.limit || 25,
        totalPages: response.totalPages || 0,
        hasMore: (response.page || 1) < (response.totalPages || 0),
      });
    } catch (error: any) {
      console.error('Error loading email logs:', error);
      toast.error('Failed to load email logs: ' + (error.message || 'Unknown error'));
      if (!loadMore) {
        setEmailLogs([]);
        setPagination({
          total: 0,
          page: 1,
          limit: 25,
          totalPages: 0,
          hasMore: false,
        });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await emailLogsService.getEmailStatistics({
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      
      // Check if response exists
      if (!response) {
        console.error('No response received from server for statistics');
        return;
      }
      
      setStatistics(response);
    } catch (error: any) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const loadMoreLogs = useCallback(async () => {
    if (loadingMore || !pagination.hasMore) return;
    
    setFilters(prev => ({
      ...prev,
      page: (prev.page || 1) + 1,
    }));
    
    // Load more logs with the next page
    await loadEmailLogs(true);
  }, [loadingMore, pagination.hasMore]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!isInfiniteScroll || loadingMore || !pagination.hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // Load when 100px from bottom
    
    if (isNearBottom) {
      loadMoreLogs();
    }
  }, [isInfiniteScroll, loadingMore, pagination.hasMore, loadMoreLogs]);

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const clearCache = () => {
    setCache(new Map());
    setRefreshKey(prev => prev + 1);
    toast.success('Cache cleared');
  };

  const handleRetryEmail = async (logId: string) => {
    try {
      await emailLogsService.retryEmail(logId);
      toast.success('Email retry initiated');
      // Force refresh by incrementing refresh key
      setRefreshKey(prev => prev + 1);
      loadEmailLogs();
      loadStatistics();
    } catch (error: any) {
      toast.error('Failed to retry email: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteEmail = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this email log? This action cannot be undone.')) return;
    
    try {
      await emailLogsService.deleteEmailLog(logId);
      toast.success('Email log deleted successfully');
      // Force refresh by incrementing refresh key
      setRefreshKey(prev => prev + 1);
      await loadEmailLogs();
      await loadStatistics();
    } catch (error: any) {
      console.error('Delete email log error:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      
      // Check for specific error types
      if (errorMessage.includes('403') || errorMessage.includes('permission')) {
        toast.error('You do not have permission to delete email logs');
      } else if (errorMessage.includes('404')) {
        toast.error('Email log not found');
      } else {
        toast.error('Failed to delete email log: ' + errorMessage);
      }
    }
  };

  const handleSendTestEmail = async () => {
    try {
      await emailLogsService.sendTestEmail(testEmailData);
      toast.success('Test email sent');
      setShowTestEmail(false);
      loadEmailLogs();
    } catch (error: any) {
      toast.error('Failed to send test email: ' + (error.message || 'Unknown error'));
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
      case 'PROCESSED':
        return <CheckCircle className="h-4 w-4" />;
      case 'FAILED':
      case 'ERROR':
        return <AlertCircle className="h-4 w-4" />;
      case 'BOUNCED':
        return <AlertCircle className="h-4 w-4" />;
      case 'PROCESSING':
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="relative z-0 min-h-screen bg-background">
      <PageWrapper className="max-w-[1500px] lg:pl-[calc(var(--sidebar-width,14rem)+1.5rem)] py-6">
        {/* Header Section */}
        <PageSection index={0} className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadEmailLogs()} 
              disabled={loading}
              className="gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Email Logs</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Track all inbound and outbound emails
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={async () => {
                  try {
                    // Open processing modal
                    processingModal.open();
                    processingModal.setStatus('processing');
                    processingModal.setMessage('Connecting to email server...');
                    processingModal.setProgress(10);

                    // Simulate progress steps
                    setTimeout(() => {
                      processingModal.setMessage('Fetching new emails...');
                      processingModal.setProgress(30);
                    }, 500);

                    setTimeout(() => {
                      processingModal.setMessage('Processing email content...');
                      processingModal.setProgress(60);
                    }, 1000);

                    // Make the API call
                    const res = await settingsApi.runEmailIngest();
                    
                    if (!res.success) throw new Error(res.error || 'Failed');
                    
                    const d: any = res.data || {};
                    
                    // Update modal for success
                    processingModal.setMessage('Email processing completed successfully!');
                    processingModal.setProgress(100);
                    processingModal.setStatus('success');
                    
                    // Show success toast
                    toast.success(`Fetched ${d.fetched ?? 0}, created ${d.created ?? 0}, replies ${d.replies ?? 0}, skipped ${d.skipped ?? 0}, errors ${d.errors ?? 0}`);
                    
                    // Force refresh by incrementing refresh key
                    setRefreshKey(prev => prev + 1);
                    loadEmailLogs();
                    loadStatistics();
                    
                    // Auto-close modal after 2 seconds
                    setTimeout(() => {
                      processingModal.close();
                    }, 2000);
                    
                  } catch (e: any) { 
                    // Update modal for error
                    processingModal.setMessage(e?.message || 'Failed to fetch emails. Please check your email settings.');
                    processingModal.setStatus('error');
                    
                    // Show error toast
                    toast.error(e?.message || 'Failed to ingest emails');
                    
                    // Auto-close modal after 3 seconds
                    setTimeout(() => {
                      processingModal.close();
                    }, 3000);
                  }
                }}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Fetch Emails Now
              </Button>
              <Dialog open={showTestEmail} onOpenChange={setShowTestEmail}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Send className="h-4 w-4" />
                    Send Test Email
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Send Test Email</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="test-to">To</Label>
                    <Input
                      id="test-to"
                      value={testEmailData.to}
                      onChange={(e) => setTestEmailData(prev => ({ ...prev, to: e.target.value }))}
                      placeholder="recipient@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="test-subject">Subject</Label>
                    <Input
                      id="test-subject"
                      value={testEmailData.subject}
                      onChange={(e) => setTestEmailData(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="test-text">Text Content</Label>
                    <Textarea
                      id="test-text"
                      value={testEmailData.text}
                      onChange={(e) => setTestEmailData(prev => ({ ...prev, text: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="test-html">HTML Content</Label>
                    <Textarea
                      id="test-html"
                      value={testEmailData.html}
                      onChange={(e) => setTestEmailData(prev => ({ ...prev, html: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleSendTestEmail} className="w-full">
                    Send Test Email
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </PageSection>

        {/* Statistics Cards */}
        <PageSection index={1} className="mb-6">
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Emails</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.totalEmails}</div>
                  <p className="text-xs text-muted-foreground mt-1">All time</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Inbound</CardTitle>
                  <MailOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.inboundEmails}</div>
                  <p className="text-xs text-muted-foreground mt-1">Received</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Outbound</CardTitle>
                  <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.outboundEmails}</div>
                  <p className="text-xs text-muted-foreground mt-1">Sent</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.successRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Delivered</p>
                </CardContent>
              </Card>
            </div>
          )}
        </PageSection>

        {/* Tabs for Email Logs and Filters */}
        <PageSection index={2}>
          <Tabs defaultValue="logs" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="logs" className="gap-2">
                <Mail className="h-4 w-4 hidden sm:inline" />
                Email Logs
              </TabsTrigger>
              <TabsTrigger value="filters" className="gap-2">
                <Filter className="h-4 w-4 hidden sm:inline" />
                Filters
              </TabsTrigger>
            </TabsList>

            {/* Email Logs Tab */}
            <TabsContent value="logs" className="space-y-6">
              {/* Loading State */}
              {loading && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Logs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Skeleton rows */}
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                          <div className="w-4 h-4 bg-muted animate-pulse rounded"></div>
                          <div className="w-32 h-4 bg-muted animate-pulse rounded"></div>
                          <div className="w-48 h-4 bg-muted animate-pulse rounded"></div>
                          <div className="w-48 h-4 bg-muted animate-pulse rounded"></div>
                          <div className="w-64 h-4 bg-muted animate-pulse rounded"></div>
                          <div className="w-24 h-4 bg-muted animate-pulse rounded"></div>
                          <div className="w-32 h-4 bg-muted animate-pulse rounded"></div>
                          <div className="w-20 h-4 bg-muted animate-pulse rounded"></div>
                          <div className="w-24 h-4 bg-muted animate-pulse rounded"></div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading email logs...</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Email Logs Table */}
              {!loading && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email Logs
                        <Badge variant="secondary" className="ml-2">
                          {pagination.total} total
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="infinite-scroll" className="text-sm">
                            Infinite Scroll
                          </Label>
                          <input
                            id="infinite-scroll"
                            type="checkbox"
                            checked={isInfiniteScroll}
                            onChange={(e) => setIsInfiniteScroll(e.target.checked)}
                            className="rounded"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearCache}
                          className="text-xs"
                        >
                          Clear Cache
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {emailLogs.length > 0 ? (
                      <>
                        <div 
                          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                          onScroll={handleScroll}
                        >
                          {emailLogs.map((log) => (
                            <EmailLogCard
                              key={log.id}
                              log={log}
                              onView={(log) => {
                                setSelectedLog(log);
                                setShowDetails(true);
                              }}
                              onRetry={handleRetryEmail}
                              onDelete={handleDeleteEmail}
                              getStatusColor={getStatusColor}
                              getDirectionColor={getDirectionColor}
                            />
                          ))}
                        </div>

                        {/* Loading More Indicator */}
                        {loadingMore && (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm text-muted-foreground">Loading more emails...</span>
                          </div>
                        )}

                        {/* Load More Button (when infinite scroll is disabled) */}
                        {!isInfiniteScroll && pagination.hasMore && (
                          <div className="flex items-center justify-center mt-4">
                            <Button
                              variant="outline"
                              onClick={loadMoreLogs}
                              disabled={loadingMore}
                              className="flex items-center gap-2"
                            >
                              {loadingMore ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4" />
                                  Load More
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Pagination (when infinite scroll is disabled) */}
                        {!isInfiniteScroll && pagination.totalPages > 1 && (
                          <div className="flex items-center justify-between mt-6 pt-4 border-t">
                            <div className="text-sm text-muted-foreground">
                              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                              {pagination.total} results
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                              >
                                Previous
                              </Button>
                              <span className="text-sm px-3">
                                Page {pagination.page} of {pagination.totalPages}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Infinite Scroll Info */}
                        {isInfiniteScroll && (
                          <div className="text-center mt-4 text-sm text-muted-foreground">
                            {pagination.hasMore ? (
                              <>Scroll down to load more emails ({emailLogs.length} of {pagination.total} loaded)</>
                            ) : (
                              <>All {pagination.total} emails loaded</>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-muted-foreground mb-2">No email logs found</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {filters.direction || filters.status || filters.from || filters.to || filters.subject 
                            ? 'Try adjusting your filters to see more results.'
                            : 'Email logs will appear here once emails are sent or received.'}
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowTestEmail(true)}
                          className="flex items-center gap-2"
                        >
                          <Send className="h-4 w-4" />
                          Send Test Email
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Filters Tab */}
            <TabsContent value="filters" className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Search & Filter</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="direction">Direction</Label>
                      <Select
                        value={filters.direction || undefined}
                        onValueChange={(value) => handleFilterChange('direction', value === 'all' ? undefined : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All directions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All directions</SelectItem>
                          <SelectItem value="INBOUND">Inbound</SelectItem>
                          <SelectItem value="OUTBOUND">Outbound</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={filters.status || undefined}
                        onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          <SelectItem value="SENT">Sent</SelectItem>
                          <SelectItem value="DELIVERED">Delivered</SelectItem>
                          <SelectItem value="FAILED">Failed</SelectItem>
                          <SelectItem value="BOUNCED">Bounced</SelectItem>
                          <SelectItem value="PROCESSING">Processing</SelectItem>
                          <SelectItem value="PROCESSED">Processed</SelectItem>
                          <SelectItem value="ERROR">Error</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="from">From</Label>
                      <Input
                        id="from"
                        value={filters.from || ''}
                        onChange={(e) => handleFilterChange('from', e.target.value)}
                        placeholder="sender@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="to">To</Label>
                      <Input
                        id="to"
                        value={filters.to || ''}
                        onChange={(e) => handleFilterChange('to', e.target.value)}
                        placeholder="recipient@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={filters.subject || ''}
                        onChange={(e) => handleFilterChange('subject', e.target.value)}
                        placeholder="Email subject"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={filters.startDate || ''}
                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={filters.endDate || ''}
                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="limit">Items per page</Label>
                      <Select
                        value={filters.limit?.toString() || '50'}
                        onValueChange={(value) => handleFilterChange('limit', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select items per page" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button onClick={() => loadEmailLogs()} className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Apply Filters
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setFilters({ page: 1, limit: 50, sortBy: 'processedAt', sortOrder: 'desc' })}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </PageSection>
      </PageWrapper>

      {/* Email Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden rounded-lg border shadow-xl">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Mail className="h-4 w-4" />
              Email Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 overflow-y-auto max-h-[calc(90vh-100px)] pr-1">
              {/* Header Info - Compact Row */}
              <div className="flex items-center justify-between gap-4 p-2 bg-muted/20 rounded-md border">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={selectedLog.direction === 'INBOUND' ? 'default' : 'secondary'}
                    className="text-xs px-2 py-1 flex items-center gap-1"
                  >
                    {React.createElement(directionIcons[selectedLog.direction], { className: "h-3 w-3" })}
                    {selectedLog.direction}
                  </Badge>
                  <Badge className={`${getStatusColor(selectedLog.status)} text-xs px-2 py-1 flex items-center gap-1`}>
                    {getStatusIcon(selectedLog.status)}
                    {selectedLog.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(selectedLog.sentAt || selectedLog.receivedAt || selectedLog.processedAt)}
                </div>
              </div>

              {/* Email Addresses - Compact Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">From</Label>
                  <p className="text-sm bg-background p-2 rounded border text-ellipsis overflow-hidden">{selectedLog.from}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">To</Label>
                  <p className="text-sm bg-background p-2 rounded border text-ellipsis overflow-hidden">{selectedLog.to}</p>
                </div>
                {selectedLog.cc && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">CC</Label>
                    <p className="text-sm bg-background p-2 rounded border text-ellipsis overflow-hidden">{selectedLog.cc}</p>
                  </div>
                )}
                {selectedLog.bcc && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">BCC</Label>
                    <p className="text-sm bg-background p-2 rounded border text-ellipsis overflow-hidden">{selectedLog.bcc}</p>
                  </div>
                )}
              </div>

              {/* Subject - Full Width */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Subject</Label>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm bg-background p-2 rounded border font-medium flex-1">{selectedLog.subject || 'No subject'}</p>
                  {(selectedLog as any).imap_raw && (
                    <SimpleOutlookEmailDisplay
                      emailLog={{
                        id: selectedLog.id,
                        messageId: selectedLog.messageId,
                        from: selectedLog.from,
                        to: selectedLog.to,
                        cc: selectedLog.cc,
                        subject: selectedLog.subject,
                        body: selectedLog.body,
                        htmlBody: selectedLog.htmlBody,
                        receivedAt: selectedLog.receivedAt || '',
                        processedAt: selectedLog.processedAt,
                        imap_raw: (selectedLog as any).imap_raw,
                        rawMeta: selectedLog.rawMeta
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Content Tabs */}
              {(selectedLog.body || selectedLog.htmlBody) && (
                <div className="space-y-2">
                  <Tabs defaultValue="text" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-8">
                      <TabsTrigger value="text" className="text-xs h-7">Text Content</TabsTrigger>
                      <TabsTrigger value="html" className="text-xs h-7">HTML Content</TabsTrigger>
                    </TabsList>
                    <TabsContent value="text" className="mt-2">
                      {selectedLog.body ? (
                        <div className="bg-background p-3 rounded border max-h-36 overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed">{selectedLog.body}</pre>
                        </div>
                      ) : (
                        <div className="bg-muted/50 p-3 rounded border text-center text-xs text-muted-foreground">No text content available</div>
                      )}
                    </TabsContent>
                    <TabsContent value="html" className="mt-2">
                      {selectedLog.htmlBody ? (
                        <div className="bg-background p-3 rounded border max-h-36 overflow-y-auto">
                          <div className="prose prose-xs max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedLog.htmlBody) }} />
                        </div>
                      ) : (
                        <div className="bg-muted/50 p-3 rounded border text-center text-xs text-muted-foreground">No HTML content available</div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* Error Section */}
              {selectedLog.error && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Error Details
                  </Label>
                  <div className="bg-destructive/10 border border-destructive/20 p-2 rounded">
                    <p className="text-destructive text-xs font-mono">{selectedLog.error}</p>
                  </div>
                </div>
              )}

              {/* Delivery Status */}
              {selectedLog.deliveryStatus && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Delivery Status
                  </Label>
                  <div className="bg-background p-2 rounded border">
                    <pre className="text-xs font-mono overflow-x-auto">{JSON.stringify(selectedLog.deliveryStatus, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Processing Modal */}
      <processingModal.ProcessingModalComponent />
    </div>
  );
}

