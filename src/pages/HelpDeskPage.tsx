import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { FileUpload, type FileAttachment } from '@/components/ui/file-upload';
import { RichTextDisplay } from '@/components/ui/rich-text-display';
import { AttachmentDisplay } from '@/components/ui/attachment-display';
import { AddCommentDialog } from '@/components/ui/add-comment-dialog';

import { PageWrapper, PageSection } from '@/components/PageWrapper';
import { TicketService, type Ticket } from '@/lib/services/ticketService';
import { AttachmentService } from '@/lib/services/attachmentService';
import { CommentService, type Comment } from '@/lib/services/commentService';
import { useApi } from '@/hooks/useApi';
import { type TicketAttachment } from '@/data/mockData';
import { 
  ArrowLeft, 
  HelpCircle, 
  MessageSquare, 
  Phone, 
  Mail,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ThumbsUp,
  Eye,
  FileText,
  Monitor,
  Wifi,
  Settings,
  Smartphone,
  ChevronRight,
  ChevronDown,
  Calendar,
  Paperclip,
  User,
  CheckSquare,
  X,
  LogOut
} from 'lucide-react';
import { useState, useEffect, useCallback, type FC } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';


const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'open':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'in_progress':
    case 'in-progress':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'resolved':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'closed':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'open':
      return <AlertCircle className="h-4 w-4" />;
    case 'in_progress':
    case 'in-progress':
      return <Clock className="h-4 w-4" />;
    case 'resolved':
      return <CheckCircle className="h-4 w-4" />;
    case 'closed':
      return <XCircle className="h-4 w-4" />;
    default:
      return <HelpCircle className="h-4 w-4" />;
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'hardware':
      return <Monitor className="h-4 w-4 text-blue-600" />;
    case 'software':
      return <Settings className="h-4 w-4 text-green-600" />;
    case 'network':
      return <Wifi className="h-4 w-4 text-purple-600" />;
    case 'mobile':
      return <Smartphone className="h-4 w-4 text-orange-600" />;
    case 'general':
      return <HelpCircle className="h-4 w-4 text-gray-600" />;
    default:
      return <HelpCircle className="h-4 w-4 text-gray-600" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'low':
      return 'bg-green-100 text-green-700';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700';
    case 'high':
      return 'bg-orange-100 text-orange-700';
    case 'critical':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const formatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
};

const TicketCard: FC<{ ticket: Ticket; index?: number }> = ({ ticket, index = 0 }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  // Attachment viewing is now handled by AttachmentDisplay component

  // Load comments when ticket details are shown
  useEffect(() => {
    if (showDetails && ticket.id) {
      loadComments();
    }
  }, [showDetails, ticket.id]);

  // Create a unified timeline including original issue and comments
  const createTimeline = () => {
    const timeline: Array<{
      type: 'issue' | 'comment';
      dateKey: string;
      data: any;
      timestamp: Date;
    }> = [];

    // Add original issue
    const issueDateKey = new Date(ticket.submittedAt).toDateString();
    timeline.push({
      type: 'issue',
      dateKey: issueDateKey,
      data: ticket,
      timestamp: new Date(ticket.submittedAt)
    });

    // Add comments
    comments.forEach(comment => {
      const commentDateKey = new Date(comment.createdAt).toDateString();
      timeline.push({
        type: 'comment',
        dateKey: commentDateKey,
        data: {
          ...comment,
          author: comment.author ? `${comment.author.firstName} ${comment.author.lastName}` : 'Unknown User',
          timestamp: comment.createdAt,
          attachments: comment.attachments || []
        },
        timestamp: new Date(comment.createdAt)
      });
    });

    // Sort by timestamp (latest first)
    timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Group by date
    const grouped = timeline.reduce((groups, item) => {
      if (!groups[item.dateKey]) {
        groups[item.dateKey] = [];
      }
      groups[item.dateKey].push(item);
      return groups;
    }, {} as Record<string, typeof timeline>);

    return grouped;
  };

  const groupedTimeline = createTimeline();

  const toggleDateExpansion = (dateKey: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDates(newExpanded);
  };

  const expandAllDates = () => {
    const allItemKeys = Object.values(groupedTimeline).flat().map((item, index) => `${item.type}-${index}`);
    setExpandedDates(new Set(allItemKeys));
  };

  const collapseAllDates = () => {
    setExpandedDates(new Set());
  };

  // Load comments for the ticket
  const loadComments = async () => {
    if (!ticket.id) return;
    
    setIsLoadingComments(true);
    try {
      const response = await CommentService.getComments(ticket.id);
      if (response.success) {
        setComments(response.data);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleAddComment = async (commentData: { content: string; attachments: FileAttachment[]; isInternal: boolean }) => {
    try {
      console.log('Creating comment with data:', {
        ticketId: ticket.id,
        content: commentData.content,
        isInternal: commentData.isInternal,
        attachmentsCount: commentData.attachments?.length || 0
      });

      // Create the comment using the comment service
      const response = await CommentService.createComment({
        ticketId: ticket.id,
        content: commentData.content,
        isInternal: commentData.isInternal,
        attachments: commentData.attachments
      });

      if (response.success) {
        console.log('Comment created successfully:', response.data);
        // Refresh the ticket details to show the new comment
        toast.success('Comment added successfully!');
        
        // Close the dialog and refresh comments
        setShowAddComment(false);
        
        // Refresh comments to show the new one
        await loadComments();
      } else {
        console.error('Comment creation failed:', response.message);
        toast.error(response.message || 'Failed to create comment');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment. Please try again.');
      throw error; // Re-throw to let the dialog handle the error state
    }
  };

  // Attachment viewing is now handled by AttachmentDisplay component

  return (
    <>
      <Card 
        className="group hover:shadow-xl hover:bg-gradient-to-br hover:from-blue-50/60 hover:to-blue-100/30 dark:hover:from-white/5 dark:hover:to-white/[0.03] hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-300 cursor-pointer border-border hover:border-primary/20 dark:hover:border-white/10 hover:ring-2 hover:ring-primary/10 dark:hover:ring-white/10 relative overflow-hidden"
        style={{ animationDelay: `${(index + 1) * 100}ms` }}
        onClick={() => setShowDetails(true)}
      >
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        <CardContent className="p-5 relative">
          <div className="space-y-4">
                         {/* Header with category, title, and ticket number */}
             <div className="flex items-start gap-3">
               <div className="group-hover:scale-110 transition-transform duration-300 p-2 bg-primary/10 rounded-lg">
                 {getCategoryIcon(ticket.category)}
               </div>
               <div className="min-w-0 flex-1">
                 <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors duration-300">{ticket.title}</h3>
                                   <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-muted-foreground font-mono">#{ticket.ticketNumber}</p>
                  </div>
               </div>
             </div>
            
            {/* Status badges row */}
            <div className="flex flex-row gap-2 items-center">
              <Badge className={`${getStatusColor(ticket.status)} border text-xs group-hover:scale-105 transition-transform duration-300 shadow-sm`}>
                <div className="flex items-center gap-1">
                  {getStatusIcon(ticket.status)}
                  <span className="capitalize font-medium">{ticket.status}</span>
                </div>
              </Badge>
              <Badge className={`${getPriorityColor(ticket.priority)} text-xs group-hover:scale-105 transition-transform duration-300 shadow-sm font-medium`}>
                {ticket.priority.toUpperCase()}
              </Badge>
              {ticket.comments && ticket.comments.length > 0 && (
                <Badge variant="secondary" className="text-xs group-hover:scale-105 transition-transform duration-300 shadow-sm">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span className="font-medium">{ticket.comments.length}</span>
                  </div>
                </Badge>
              )}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <Badge variant="secondary" className="text-xs group-hover:scale-105 transition-transform duration-300 shadow-sm">
                  <div className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    <span className="font-medium">{ticket.attachments.length}</span>
                  </div>
                </Badge>
              )}
            </div>
            
            {/* Description and attachments */}
            <div className="space-y-3">
              <div 
                className="text-[10px] prose prose-[10px] max-w-none group-hover:text-foreground/90 transition-colors duration-300 bg-muted/30 p-3 rounded-lg max-h-20 overflow-y-auto scrollbar-thin"
                style={{ scrollbarWidth: 'thin' }}
                dangerouslySetInnerHTML={{ 
                  __html: ticket.description
                }}
              />

              {/* Attachments List */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Paperclip className="h-3 w-3" />
                    <span className="font-medium">Attachments ({ticket.attachments.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ticket.attachments.slice(0, 3).map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground border border-border/50"
                      >
                        <FileText className="h-2 w-2" />
                        <span className="truncate max-w-20">{attachment.name}</span>
                      </div>
                    ))}
                    {ticket.attachments.length > 3 && (
                      <div className="px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground border border-border/50">
                        +{ticket.attachments.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer with metadata and action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                             <div className="flex flex-col gap-2 text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-300">
                 <span className="group-hover:translate-x-1 transition-transform duration-300 flex items-center gap-1">
                   <Calendar className="h-3 w-3" />
                   {formatDate(ticket.submittedAt)}
                 </span>
                                   <span className="group-hover:translate-x-1 transition-transform duration-300 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="truncate">
                      {ticket.submitter 
                        ? `${ticket.submitter.firstName} ${ticket.submitter.lastName}`
                        : ticket.submittedBy
                      }
                    </span>
                  </span>

               </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddComment(true);
                  }}
                  className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                  title="Add Comment"
                >
                  <MessageSquare className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddTask(true);
                  }}
                  className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                  title="Add Task"
                >
                  <CheckSquare className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-background border-b p-6 z-10 rounded-t-lg">
            <div className="flex items-start justify-between">
              <DialogHeader className="flex-1">
                <DialogTitle className="flex items-center gap-2">
                  {getCategoryIcon(ticket.category)}
                  {ticket.title}
                </DialogTitle>
              </DialogHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(false)}
                className="h-8 w-8 p-0 hover:bg-muted/50 rounded-full"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Ticket Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Ticket Number</p>
                <p className="text-sm font-medium">#{ticket.ticketNumber}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge className={`${getStatusColor(ticket.status)} text-xs`}>
                  {ticket.status}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Priority</p>
                <Badge className={`${getPriorityColor(ticket.priority)} text-xs`}>
                  {ticket.priority}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="text-sm">{ticket.category}</p>
              </div>
            </div>
            
                         {/* User and Date Info */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
               <div className="space-y-1">
                 <p className="text-xs text-muted-foreground">Date Created</p>
                 <p className="text-sm">{formatDate(ticket.submittedAt)}</p>
               </div>
                               <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Created By</p>
                  <p className="text-sm font-medium">
                    {ticket.submitter 
                      ? `${ticket.submitter.firstName} ${ticket.submitter.lastName}`
                      : ticket.submittedBy
                    }
                  </p>
                </div>
                                {ticket.assignee && (
                   <div className="space-y-1">
                     <p className="text-xs text-muted-foreground">Assigned To</p>
                     <p className="text-sm">
                       {`${ticket.assignee.firstName} ${ticket.assignee.lastName}`}
                     </p>
                   </div>
                 )}
               {ticket.dueDate && (
                 <div className="space-y-1">
                   <p className="text-xs text-muted-foreground">Due Date</p>
                   <p className="text-sm">{formatDate(ticket.dueDate)}</p>
                 </div>
               )}
             </div>
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 rounded-b-lg">

                          {/* Timeline View - Comments and Original Issue */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    Timeline ({Object.values(groupedTimeline).flat().length} items)
                    {isLoadingComments && (
                      <span className="text-xs text-muted-foreground ml-2">(Loading comments...)</span>
                    )}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowAddComment(true)}
                      className="flex items-center gap-2"
                      disabled={isLoadingComments}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Add Comment
                    </Button>
                  </div>
                </div>
               
              {/* Timeline Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={expandAllDates}
                      className="text-xs"
                    >
                      Expand All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={collapseAllDates}
                      className="text-xs"
                    >
                      Collapse All
                    </Button>
                  </div>
                </div>
               
               {/* Timeline Tree View */}
               <div className="space-y-2">
                   {Object.values(groupedTimeline).flat().map((item, index) => {
                     const itemKey = `${item.type}-${index}`;
                     const isExpanded = expandedDates.has(itemKey);
                     
                     return (
                       <div key={itemKey} className="border border-border rounded-lg overflow-hidden bg-background/80 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:bg-muted/30 dark:hover:bg-white/[0.04] group">
                         {/* Item Header */}
                         <div
                           onClick={() => toggleDateExpansion(itemKey)}
                           className="w-full flex items-center justify-between p-4 bg-transparent group-hover:bg-muted/30 dark:group-hover:bg-white/[0.04] hover:shadow-sm transition-all duration-200 border-b border-border group-hover:border-primary/20 relative before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-primary/0 group-hover:before:bg-primary/40 cursor-pointer"
                         >
                           <div className="flex items-center gap-3">
                             <div className="flex items-center gap-2">
                               {item.type === 'issue' ? (
                                 <div className="h-5 w-5 bg-primary/10 rounded flex items-center justify-center">
                                   <span className="text-xs">📋</span>
                                 </div>
                               ) : (
                                 <MessageSquare className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                               )}
                               <div className="flex items-center gap-2">
                                 <span className="font-semibold text-sm group-hover:text-primary transition-colors duration-200">
                                   {item.type === 'issue' ? (
                                     `Original Issue - ${item.data.submittedBy}`
                                   ) : (
                                     `Comment - ${item.data.author}${item.data.isInternal ? ' (Internal)' : ''}`
                                   )}
                                 </span>
                                 <span className="text-xs text-muted-foreground">
                                   {item.type === 'issue' ? formatDate(item.data.submittedAt) : formatDate(item.data.timestamp)}
                                 </span>
                               </div>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             {/* Attachment Icon - Removed duplicate viewer, let AttachmentDisplay handle viewing */}
                             {((item.type === 'issue' && item.data.attachments && item.data.attachments.length > 0) ||
                               (item.type === 'comment' && item.data.attachments && item.data.attachments.length > 0)) && (
                               <div
                                 className="p-1 text-muted-foreground"
                                 title={`${item.data.attachments?.length || 0} attachment${(item.data.attachments?.length || 0) !== 1 ? 's' : ''} available`}
                               >
                                 <Paperclip className="h-4 w-4" />
                               </div>
                             )}
                             {isExpanded ? (
                               <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all duration-200" />
                             ) : (
                               <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all duration-200" />
                             )}
                           </div>
                         </div>
                         
                         {/* Item Content */}
                         {isExpanded && (
                           <div className="p-4">
                             <div className="border-l-2 border-primary/20 pl-4 hover:bg-muted/20 hover:border-primary/40 group-hover:bg-muted/20 group-hover:border-primary/30 rounded-r-lg transition-all duration-200 group/item">
                               {item.type === 'issue' ? (
                                 // Original Issue
                                 <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                                   <div className="flex items-center justify-between mb-3">
                                     <div className="flex items-center gap-3">
                                       <div className="flex items-center gap-2">
                                         <Badge variant="default" className="text-xs bg-primary text-primary-foreground">
                                           <div className="flex items-center gap-1">
                                             <span>📋</span>
                                             <span>Original Issue</span>
                                           </div>
                                         </Badge>
                                         <div className="flex items-center gap-1">
                                           <span className="text-sm font-semibold text-primary">{item.data.submittedBy}</span>
                                           <span className="text-xs text-muted-foreground">•</span>
                                           <span className="text-xs text-muted-foreground">Ticket Creator</span>
                                         </div>
                                       </div>
                                     </div>
                                     <div className="flex items-center gap-2">
                                       <span className="text-xs text-muted-foreground">
                                         Created {formatDate(item.data.submittedAt)}
                                       </span>
                                     </div>
                                   </div>
                                   <div className="bg-background rounded-lg border border-border p-3 mb-3">
                                     <RichTextDisplay content={item.data.description} />
                                   </div>
                                   {item.data.attachments && item.data.attachments.length > 0 && (
                                     <div>
                                       <AttachmentDisplay attachments={item.data.attachments} />
                                     </div>
                                   )}
                                 </div>
                               ) : (
                                 // Comment
                                 <div className="bg-muted/20 border border-muted/30 rounded-lg p-4">
                                   <div className="flex items-center justify-between mb-3">
                                     <div className="flex items-center gap-3">
                                       <div className="flex items-center gap-2">
                                         <Badge variant="secondary" className="text-xs">
                                           <div className="flex items-center gap-1">
                                             <MessageSquare className="h-3 w-3" />
                                             <span>Comment</span>
                                           </div>
                                         </Badge>
                                         <div className="flex items-center gap-1">
                                           <span className="text-sm font-semibold">{item.data.author}</span>
                                           {item.data.isInternal && (
                                             <>
                                               <span className="text-xs text-muted-foreground">•</span>
                                               <Badge variant="outline" className="text-xs">
                                                 Internal
                                               </Badge>
                                             </>
                                           )}
                                         </div>
                                       </div>
                                     </div>
                                     <div className="flex items-center gap-2">
                                       <span className="text-xs text-muted-foreground">
                                         {formatDate(item.data.timestamp)}
                                       </span>
                                     </div>
                                   </div>
                                   <div className="bg-background rounded-lg border border-border p-3 mb-3">
                                     <RichTextDisplay content={item.data.content} />
                                   </div>
                                   {item.data.attachments && item.data.attachments.length > 0 && (
                                     <div>
                                       <AttachmentDisplay attachments={item.data.attachments} />
                                     </div>
                                   )}
                                 </div>
                               )}
                             </div>
                           </div>
                         )}
                       </div>
                     );
                   })}
                 </div>
               </div>
             </div>
        </DialogContent>
      </Dialog>

      {/* Add Comment Dialog */}
      <AddCommentDialog
        isOpen={showAddComment}
        onClose={() => setShowAddComment(false)}
        onSubmit={handleAddComment}
        ticketId={ticket.id}
        ticketTitle={ticket.title}
        title="Add Comment to Ticket"
        placeholder="Add your comment to this ticket..."
      />

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Add Task to Ticket #{ticket.ticketNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                placeholder="Enter task title"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                placeholder="Describe the task..."
                className="min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-assignee">Assignee</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="john">John Support</SelectItem>
                    <SelectItem value="sarah">Sarah Tech</SelectItem>
                    <SelectItem value="mike">Mike Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddTask(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                toast.success('Task added successfully!');
                setShowAddTask(false);
              }}>
                Add Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attachment viewing is now handled by AttachmentDisplay component */}
    </>
  );
};

const KnowledgeBaseCard: FC<{ article: any; index?: number }> = ({ article, index = 0 }) => (
  <Card 
    className="hover:shadow-md transition-shadow cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-300"
    style={{ animationDelay: `${(index + 1) * 100}ms` }}
  >
    <CardContent className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <h3 className="font-medium line-clamp-1">{article.title}</h3>
            </div>
            <Badge variant="outline" className="text-xs capitalize">
              {article.category}
            </Badge>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2">{article.content}</p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {article.views}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {article.helpful}
            </span>
          </div>
          <span>Updated {formatDate(article.lastUpdated)}</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

const NewTicketDialog: FC<{ 
  autoOpen?: boolean; 
  onOpenChange?: (open: boolean) => void;
  isAuthenticated?: boolean;
  onLoginRequired?: () => void;
}> = ({ 
  autoOpen = false, 
  onOpenChange,
  isAuthenticated = false,
  onLoginRequired
}) => {
  const [open, setOpen] = useState(autoOpen);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    dueDate: '',
    tags: [] as string[]
  });
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug attachments state changes
  useEffect(() => {
    console.log('NewTicketDialog: attachments state changed to:', attachments);
  }, [attachments]);

  // Memoize the onFilesChange handler to prevent unnecessary re-renders
  const handleFilesChange = useCallback((newAttachments: FileAttachment[]) => {
    console.log('NewTicketDialog: handleFilesChange called with:', newAttachments);
    console.log('Previous attachments:', attachments);
    setAttachments(newAttachments);
  }, [attachments]);

  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
    }
  }, [autoOpen]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        title: '',
        description: '',
        category: '',
        priority: 'MEDIUM',
        dueDate: '',
        tags: []
      });
      setAttachments([]);
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !isAuthenticated) {
      onLoginRequired?.();
      return;
    }
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create ticket data for backend
      const ticketData = {
        title: formData.title.trim(),
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        tags: formData.tags
      };

      // Create the ticket first
      const ticketResponse = await TicketService.createTicket(ticketData);
      
      if (!ticketResponse.success) {
        throw new Error(ticketResponse.message || 'Failed to create ticket');
      }

      // If there are attachments, upload them
      if (attachments.length > 0) {
        try {
          await AttachmentService.uploadFilesForTicket(attachments, ticketResponse.data.id);
        } catch (uploadError) {
          console.warn('Failed to upload some attachments:', uploadError);
          toast.warning('Ticket created but some attachments failed to upload');
        }
      }

      toast.success('Support ticket created successfully!');
      handleOpenChange(false);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        priority: 'MEDIUM',
        dueDate: '',
        tags: []
      });
      setAttachments([]);

      // Refresh the tickets list
      window.location.reload();
    } catch (error) {
      console.error('Failed to create ticket:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border rounded-t-lg">
          <DialogTitle>Create Support Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 rounded-b-lg">
          <div className="space-y-2">
            <Label htmlFor="title">Issue Title *</Label>
            <Input
              id="title"
              placeholder="Brief description of the issue"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {['hardware', 'software', 'network', 'mobile', 'general'].map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <Input
                id="tags"
                placeholder="Enter tags separated by commas"
                value={formData.tags.join(', ')}
                onChange={(e) => {
                  const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                  setFormData(prev => ({ ...prev, tags }));
                }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <RichTextEditor
              key={`ticket-${open}`}
              value={formData.description}
              onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
              placeholder="Describe your issue in detail. You can use formatting, add images, and include links..."
              className="min-h-[200px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Attachments</Label>
            <FileUpload
              files={attachments}
              onFilesChange={handleFilesChange}
              maxFiles={10}
              maxFileSize={10 * 1024 * 1024} // 10MB
              acceptedTypes={[
                'image/jpeg',
                'image/png',
                'image/gif',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/plain',
                'application/zip',
                'application/x-rar-compressed'
              ]}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const HelpDeskPage: FC = () => {
  const [searchParams] = useSearchParams();
  const [ticketFilter, setTicketFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('tickets');
  const [autoOpenNewTicket, setAutoOpenNewTicket] = useState(false);
  // Fetch tickets from backend API
  const { 
    data: ticketsData, 
    loading: ticketsLoading, 
    error: ticketsError, 
    execute: fetchTickets 
  } = useApi(
    () => TicketService.getTickets(),
    { autoExecute: true } // Auto-execute since we're now protected by ProtectedRoute
  );

  const tickets = ticketsData?.data || [];
  
  // Handle URL parameters on component mount
  useEffect(() => {
    const tab = searchParams.get('tab');
    const action = searchParams.get('action');
    
    if (tab) {
      setActiveTab(tab);
    }
    
    if (action === 'create') {
      setActiveTab('tickets');
      setAutoOpenNewTicket(true);
    }
  }, [searchParams]);
  
  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = ticketFilter === 'all' || 
      (ticketFilter === 'open' && ticket.status === 'OPEN') ||
      (ticketFilter === 'in-progress' && ticket.status === 'IN_PROGRESS') ||
      (ticketFilter === 'resolved' && ticket.status === 'RESOLVED') ||
      (ticketFilter === 'closed' && ticket.status === 'CLOSED');
    const matchesSearch = searchQuery === '' || 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // For now, we'll use empty knowledge base until we implement that API
  const filteredKnowledgeBase: any[] = [];

  const openTickets = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;

  return (
    <div className="min-h-screen bg-background">
      <PageWrapper className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <PageSection index={0} className="mb-6">
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
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Help Desk & Support</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Get assistance with IT issues, submit tickets, and access support resources
              </p>
            </div>
            <NewTicketDialog 
              autoOpen={autoOpenNewTicket} 
              onOpenChange={(open) => !open && setAutoOpenNewTicket(false)}
              isAuthenticated={true}
              onLoginRequired={() => {}}
            />
          </div>
        </PageSection>

        {/* Summary Stats */}
        <PageSection index={1} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{openTickets}</div>
              <p className="text-sm text-muted-foreground">Open Tickets</p>
            </CardContent>
          </Card>
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '200ms' }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{inProgressTickets}</div>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '300ms' }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{resolvedTickets}</div>
              <p className="text-sm text-muted-foreground">Resolved Today</p>
            </CardContent>
          </Card>
        </PageSection>

        {/* Search Bar */}
        <PageSection index={2} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets and knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </PageSection>

        {/* Tabs */}
        <PageSection index={3}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="tickets" className="gap-2">
              <MessageSquare className="h-4 w-4 hidden sm:inline" />
              My Tickets
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-2">
              <FileText className="h-4 w-4 hidden sm:inline" />
              Knowledge Base
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-2">
              <Phone className="h-4 w-4 hidden sm:inline" />
              Contact
            </TabsTrigger>
          </TabsList>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Support Tickets</h2>
              <Select value={ticketFilter} onValueChange={setTicketFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tickets</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <PageSection index={4}>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTickets.map((ticket, index) => (
                  <TicketCard key={ticket.id} ticket={ticket} index={index} />
                ))}
              </div>
            </PageSection>
            
            {filteredTickets.length === 0 && (
              <PageSection index={7}>
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No tickets found</h3>
                    <p className="text-muted-foreground text-center">
                      {ticketFilter === 'all' 
                        ? 'You haven\'t submitted any support tickets yet.' 
                        : `No ${ticketFilter} tickets found.`}
                    </p>
                  </CardContent>
                </Card>
              </PageSection>
            )}
          </TabsContent>

          {/* Knowledge Base Tab */}
          <TabsContent value="knowledge" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Knowledge Base</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>0 articles</span>
              </div>
            </div>
            
            <PageSection index={5}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredKnowledgeBase.map((article, index) => (
                  <KnowledgeBaseCard key={article.id} article={article} index={index} />
                ))}
              </div>
            </PageSection>
            
            {filteredKnowledgeBase.length === 0 && (
              <PageSection index={8}>
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No articles found</h3>
                    <p className="text-muted-foreground text-center">
                      No knowledge base articles match your search.
                    </p>
                  </CardContent>
                </Card>
              </PageSection>
            )}
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <PageSection index={9}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '100ms' }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-green-600" />
                      Emergency Support
                    </CardTitle>
                  </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    For critical issues that require immediate attention
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Phone:</span>
                      <span className="text-sm text-blue-600">+1 (555) 123-4567</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Available:</span>
                      <span className="text-sm">24/7</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

                <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '200ms' }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-600" />
                      General Support
                    </CardTitle>
                  </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    For non-urgent issues and general inquiries
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Email:</span>
                      <span className="text-sm text-blue-600">support@company.com</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Response:</span>
                      <span className="text-sm">Within 24 hours</span>
                    </div>
                  </div>
                </CardContent>
                </Card>
              </div>
            </PageSection>

            <PageSection index={7}>
              <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '100ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                  Live Chat Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Chat with our support team for real-time assistance
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Weekdays:</p>
                    <p className="text-muted-foreground">9:00 AM - 6:00 PM</p>
                  </div>
                  <div>
                    <p className="font-medium">Response Time:</p>
                    <p className="text-muted-foreground">&lt; 5 minutes</p>
                  </div>
                </div>
                <Button className="w-full gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Start Live Chat
                </Button>
              </CardContent>
            </Card>
            </PageSection>
          </TabsContent>
        </Tabs>
        </PageSection>
      </PageWrapper>
      

    </div>
  );
};
