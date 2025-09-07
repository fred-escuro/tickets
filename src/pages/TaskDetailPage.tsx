import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiClient, API_ENDPOINTS } from '@/lib/api';
import { RichTextDisplay } from '@/components/ui/rich-text-display';
import { AttachmentDisplay } from '@/components/ui/attachment-display';
import { ArrowLeft, FileText, Clock, CheckCircle2, AlertCircle, Paperclip } from 'lucide-react';

const FieldRow = ({ label, value }: { label: string; value: any }) => (
  <div className="flex items-start justify-between text-sm py-2 border-b last:border-b-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right ml-4 break-words max-w-[70%]">{value ?? '-'}</span>
  </div>
);

// color helpers to mirror ticket pills
const getStatusColor = (status: any) => {
  const s = String(status || '').toLowerCase().replace(/_/g, '-');
  switch (s) {
    case 'pending':
      return 'border-gray-600 bg-gray-50 text-gray-700';
    case 'in-progress':
      return 'border-blue-600 bg-blue-50 text-blue-700';
    case 'completed':
      return 'border-green-600 bg-green-50 text-green-700';
    case 'blocked':
      return 'border-red-600 bg-red-50 text-red-700';
    default:
      return 'border-muted-foreground/20 bg-muted text-muted-foreground';
  }
};

const getPriorityColor = (priority: any) => {
  const p = String(priority || '').toLowerCase();
  switch (p) {
    case 'critical':
      return 'text-red-600 border-red-600 bg-red-50';
    case 'high':
      return 'text-orange-600 border-orange-600 bg-orange-50';
    case 'medium':
      return 'text-yellow-600 border-yellow-600 bg-yellow-50';
    case 'low':
      return 'text-green-600 border-green-600 bg-green-50';
    default:
      return 'text-muted-foreground border-muted-foreground/30 bg-muted';
  }
};

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const ticketId = search.get('ticketId');
  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (!ticketId || !taskId) throw new Error('Missing ticket or task id');
        const tr = await apiClient.get(API_ENDPOINTS.TICKETS.GET(ticketId));
        if (!tr.success) throw new Error(tr.error || 'Failed to fetch ticket');
        const found = (tr.data?.tasks || []).find((t: any) => t.id === taskId);
        setTask(found || null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load task');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [taskId, ticketId]);

  if (loading) return <div className="p-6">Loading task…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!task) return <div className="p-6">Task not found.</div>;

  return (
    <div className="relative z-0 mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6 lg:pl-[calc(var(--sidebar-width,14rem)+1.5rem)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/tasks'))} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">{task.title || 'Task'}</h1>
          <Badge variant="outline" className="ml-1">#{task.id}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <CardTitle className="text-base">Task Overview</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge variant="outline" className={`${getStatusColor(typeof task.status === 'object' ? (task.status?.key || task.status?.name) : task.status)} text-xs rounded-full px-2.5 py-0.5 border font-medium flex items-center gap-1`}>
                    {(() => {
                      const s = String(typeof task.status === 'object' ? (task.status?.key || task.status?.name) : task.status || '').toLowerCase();
                      if (s.includes('progress')) return <Clock className="h-3 w-3" />;
                      if (s.includes('complete')) return <CheckCircle2 className="h-3 w-3" />;
                      if (s.includes('block')) return <AlertCircle className="h-3 w-3" />;
                      return <FileText className="h-3 w-3" />;
                    })()}
                    <span className="capitalize">{String(typeof task.status === 'object' ? (task.status?.name || task.status?.key) : task.status || '').replace(/-/g, ' ') || 'Unknown'}</span>
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Priority</div>
                  <Badge variant="outline" className={`${getPriorityColor(typeof task.priority === 'object' ? (task.priority?.key || task.priority?.name) : task.priority)} text-xs rounded-full px-2.5 py-0.5 border font-medium`}>
                    {(String(typeof task.priority === 'object' ? (task.priority?.name || task.priority?.key) : task.priority || '') || 'unknown').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Assigned To</div>
                  <div className="text-sm font-medium">{task.assignedTo || 'Unassigned'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Progress</div>
                  <div className="text-sm font-medium">{task.progress ?? 0}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Start Date</div>
                  <div className="text-sm">{task.startDate ? new Date(task.startDate).toLocaleString() : '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Due Date</div>
                  <div className="text-sm">{task.dueDate ? new Date(task.dueDate).toLocaleString() : '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Ticket</div>
                  <div className="text-sm"><Link to={`/tickets/${task.ticketId}`} className="text-primary">#{task.ticketId}</Link></div>
                </div>
              </div>

              <Separator />

              <div className="prose max-w-none max-h-[320px] overflow-y-auto rounded-md border bg-muted/30 p-3">
                {task?.description ? (
                  <RichTextDisplay content={task.description} />
                ) : (
                  <p className="text-sm text-muted-foreground">No description</p>
                )}
              </div>
              {Array.isArray((task as any).attachments) && task.attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                    Attachments ({task.attachments.length})
                  </div>
                  <AttachmentDisplay attachments={(task as any).attachments} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar (reserved for future actions) */}
        <div className="space-y-6">
          {/* Placeholder for future task actions */}
        </div>
      </div>
    </div>
  );
}


