import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageWrapper, PageSection } from '@/components/PageWrapper';
import { 
  Mail, 
  RefreshCw, 
  Search, 
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  Loader2,
  MessageSquare,
  User,
  Calendar,
  Ticket
} from 'lucide-react';
import { followupService } from '@/lib/services/followupService';
import type { ProcessedFollowup, FollowupStats } from '@/lib/types/followup';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const statusColors = {
  PROCESSED: 'bg-green-50 text-green-700 border-green-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  IGNORED: 'bg-gray-50 text-gray-700 border-gray-200',
};

const statusIcons = {
  PROCESSED: CheckCircle,
  FAILED: XCircle,
  PENDING: Clock,
  IGNORED: AlertCircle,
};

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<ProcessedFollowup[]>([]);
  const [stats, setStats] = useState<FollowupStats>({
    totalFollowups: 0,
    processedFollowups: 0,
    failedFollowups: 0,
    recentFollowups: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('recent');

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [followupsData, statsData] = await Promise.all([
        followupService.getRecentFollowups(50),
        followupService.getFollowupStats()
      ]);
      setFollowups(followupsData || []);
      setStats(statsData || {
        totalFollowups: 0,
        processedFollowups: 0,
        failedFollowups: 0,
        recentFollowups: 0
      });
    } catch (error) {
      console.error('Error loading follow-up data:', error);
      toast.error('Failed to load follow-up data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData();
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (followupId: string, status: 'PROCESSED' | 'FAILED' | 'PENDING' | 'IGNORED') => {
    try {
      await followupService.updateFollowupStatus(followupId, status);
      await loadData();
      toast.success('Status updated successfully');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (followupId: string) => {
    if (!confirm('Are you sure you want to delete this follow-up?')) return;
    
    try {
      await followupService.deleteFollowup(followupId);
      await loadData();
      toast.success('Follow-up deleted successfully');
    } catch (error) {
      toast.error('Failed to delete follow-up');
    }
  };

  return (
    <div className="relative z-0 min-h-screen bg-background">
      <PageWrapper className="max-w-[1500px] lg:pl-[calc(var(--sidebar-width,14rem)+1.5rem)] py-6">
        {/* Header Section */}
        <PageSection index={0} className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/settings?tab=tickets">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Settings
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={refreshing}
              className="gap-2"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Follow-up Management</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Manage customer follow-ups to auto-responses
              </p>
            </div>
          </div>
        </PageSection>

        {/* Statistics Cards */}
        <PageSection index={1} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Follow-ups</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalFollowups}</div>
                <p className="text-xs text-muted-foreground mt-1">All follow-ups</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Processed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.processedFollowups}</div>
                <p className="text-xs text-muted-foreground mt-1">Successfully processed</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.failedFollowups}</div>
                <p className="text-xs text-muted-foreground mt-1">Processing failed</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Recent (24h)</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recentFollowups}</div>
                <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
              </CardContent>
            </Card>
          </div>
        </PageSection>

        {/* Follow-ups Table */}
        <PageSection index={2} className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Follow-ups ({followups.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {followups.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Author</TableHead>
                        <TableHead className="w-[150px]">Ticket</TableHead>
                        <TableHead className="w-[200px]">Content Preview</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[150px]">Processed</TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {followups.map((followup) => {
                        const StatusIcon = statusIcons[followup.status];
                        return (
                          <TableRow key={followup.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{followup.authorEmail}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link 
                                to={`/tickets/${followup.ticketId}`}
                                className="flex items-center gap-2 text-primary hover:underline"
                              >
                                <Ticket className="h-4 w-4" />
                                <span className="text-sm">#{followup.ticketId.slice(-8)}</span>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[200px] truncate text-sm text-muted-foreground">
                                {followup.content}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusColors[followup.status]} text-xs`}>
                                <div className="flex items-center gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  {followup.status}
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(followup.processedAt), 'MMM dd, yyyy')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusUpdate(followup.id, 'PROCESSED')}
                                  className="h-8 w-8 p-0"
                                  title="Mark as processed"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusUpdate(followup.id, 'IGNORED')}
                                  className="h-8 w-8 p-0"
                                  title="Ignore follow-up"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(followup.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  title="Delete follow-up"
                                >
                                  <AlertCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  <span>Loading follow-ups...</span>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No follow-ups found</h3>
                  <p className="text-muted-foreground mb-4">
                    Customer follow-ups to auto-responses will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </PageSection>
      </PageWrapper>
    </div>
  );
}
