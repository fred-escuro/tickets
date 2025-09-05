import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
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
  
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
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
  LogOut
} from 'lucide-react';
import { useState, useEffect, useCallback, type FC } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ticketSystemService, type TicketCategory, type TicketPriority, type TicketStatus, type TicketTemplate } from '@/lib/services/ticketSystemService';


const getStatusColor = (status: string | undefined) => {
  if (!status) return 'bg-gray-100 text-gray-700 border-gray-200';
  
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

const getStatusIcon = (status: string | undefined) => {
  if (!status) return <AlertCircle className="h-4 w-4" />;
  
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

const getPriorityColor = (priority: string | undefined) => {
  if (!priority) return 'bg-gray-100 text-gray-700 border-gray-200';
  
  switch (priority.toLowerCase()) {
    case 'low':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'high':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'critical':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getCategoryIcon = (category: string, categoryInfo?: { color: string; icon?: string }) => {
  // If we have category info with an icon, use it
  if (categoryInfo?.icon) {
    // Map common icon names to Lucide icons
    const iconMap: Record<string, React.ComponentType<any>> = {
      'laptop': Monitor,
      'monitor': Monitor,
      'server': Settings,
      'wifi': Wifi,
      'network': Wifi,
      'smartphone': Smartphone,
      'mobile': Smartphone,
      'phone': Smartphone,
      'help': HelpCircle,
      'general': HelpCircle,
      'settings': Settings,
      'gear': Settings
    };
    
    const IconComponent = iconMap[categoryInfo.icon.toLowerCase()] || HelpCircle;
    const colorClass = categoryInfo.color === 'blue' ? 'text-blue-600' :
                      categoryInfo.color === 'green' ? 'text-green-600' :
                      categoryInfo.color === 'red' ? 'text-red-600' :
                      categoryInfo.color === 'yellow' ? 'text-yellow-600' :
                      categoryInfo.color === 'orange' ? 'text-orange-600' :
                      categoryInfo.color === 'purple' ? 'text-purple-600' :
                      'text-gray-600';
    
    return <IconComponent className={`h-4 w-4 ${colorClass}`} />;
  }
  
  // Fallback to old category mapping
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

// Badge classes for categories aligned with settings color scheme
const getCategoryBadgeColor = (categoryObj?: { color?: string } | null) => {
  const color = categoryObj?.color?.toLowerCase();
  switch (color) {
    case 'blue':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'green':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'red':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'yellow':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'orange':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'purple':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
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

const TicketCard: FC<{ ticket: Ticket; index?: number; statuses: TicketStatus[]; onTicketUpdated?: () => void }> = ({ ticket, index = 0, statuses, onTicketUpdated }) => {
  const navigate = useNavigate();
  const [showAddComment, setShowAddComment] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  // Attachment viewing is now handled by AttachmentDisplay component

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
        className="h-full group hover:shadow-xl hover:bg-gradient-to-br hover:from-blue-50/60 hover:to-blue-100/30 dark:hover:from-white/5 dark:hover:to-white/[0.03] hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-300 cursor-pointer border-border hover:border-primary/20 dark:hover:border-white/10 hover:ring-2 hover:ring-primary/10 dark:hover:ring-white/10 relative overflow-hidden flex flex-col"
        style={{ animationDelay: `${(index + 1) * 100}ms` }}
        onClick={() => navigate(`/tickets/${ticket.id}`)}
      >
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        <CardContent className="p-5 relative h-full flex flex-col">
          <div className="space-y-4 flex-1 flex flex-col">
                         {/* Header with category, title, and ticket number */}
             <div className="flex items-start gap-3">
               <div className="group-hover:scale-110 transition-transform duration-300 p-2 bg-primary/10 rounded-lg">
                {getCategoryIcon(
                  typeof (ticket as any).category === 'object' ? (ticket as any).category?.name || 'general' : (ticket as any).category || 'general',
                  typeof (ticket as any).category === 'object' ? (ticket as any).category : (ticket as any).categoryInfo
                )}
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
              <Badge variant="outline" className={`${getStatusColor(typeof (ticket as any).status === 'string' ? (ticket as any).status : (ticket as any).status?.name)} border text-xs group-hover:scale-105 transition-transform duration-300 shadow-sm hover:brightness-95`}>
                <div className="flex items-center gap-1">
                  {getStatusIcon(typeof (ticket as any).status === 'string' ? (ticket as any).status : (ticket as any).status?.name)}
                  <span className="capitalize font-medium">{typeof (ticket as any).status === 'string' ? (ticket as any).status : (ticket as any).status?.name || 'Unknown'}</span>
                </div>
              </Badge>
              <Badge variant="outline" className={`${getPriorityColor(typeof (ticket as any).priority === 'string' ? (ticket as any).priority : (ticket as any).priority?.name)} text-xs group-hover:scale-105 transition-transform duration-300 shadow-sm font-medium hover:brightness-95`}>
                {(typeof (ticket as any).priority === 'string' ? (ticket as any).priority : (ticket as any).priority?.name || 'Unknown').toUpperCase()}
              </Badge>
              {ticket.comments && ticket.comments.length > 0 && (
                <Badge variant="secondary" className="text-xs group-hover:scale-105 transition-transform duration-300 shadow-sm">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span className="font-medium">{ticket.comments.length}</span>
                  </div>
                </Badge>
              )}
              {/* Category badge (replaces attachment count) */}
               {(() => {
                 const catObj = typeof (ticket as any).category === 'object' ? (ticket as any).category : (ticket as any).categoryInfo;
                 const catName = typeof (ticket as any).category === 'object' ? (ticket as any).category?.name : ((ticket as any).category || (ticket as any).categoryInfo?.name);
                 const catNameStr = typeof catName === 'string' ? catName : 'general';
                 return (
                  <Badge variant="outline" className={`${getCategoryBadgeColor(catObj)} text-xs rounded-full px-2.5 py-0.5 group-hover:scale-105 transition-transform duration-300 shadow-sm border hover:brightness-95`}> 
                     <div className="flex items-center gap-1">
                       {getCategoryIcon(catNameStr, catObj as any)}
                       <span className="capitalize font-medium">{catNameStr || 'Unknown'}</span>
                     </div>
                   </Badge>
                 );
               })()}
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
            <div className="mt-auto flex items-center justify-between pt-2 border-t border-border/50">
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
              <div className="flex items-center gap-2">
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

      {/* Ticket Details Dialog removed; card click navigates to /tickets/:id */}

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

// KnowledgeBase features removed from HelpDesk page

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
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [priorities, setPriorities] = useState<TicketPriority[]>([]);
  const [loadingPriorities, setLoadingPriorities] = useState(false);
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Debug attachments state changes
  // Debug log removed to reduce console noise

  // Load categories and priorities when dialog opens
  useEffect(() => {
    if (open && isAuthenticated) {
      loadCategories();
      loadPriorities();
    }
  }, [open, isAuthenticated]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const categoriesData = await ticketSystemService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadPriorities = async () => {
    try {
      setLoadingPriorities(true);
      const prioritiesData = await ticketSystemService.getPriorities();
      setPriorities(prioritiesData);
      // If no priority selected yet, default to Medium if present, else first
      if (!formData.priority && prioritiesData.length > 0) {
        const medium = prioritiesData.find(p => p.name.toLowerCase() === 'medium');
        setFormData(prev => ({ ...prev, priority: (medium ? 'MEDIUM' : (prioritiesData[0].name.toUpperCase() as any)) }));
      }
    } catch (error) {
      console.error('Error loading priorities:', error);
      toast.error('Failed to load priorities');
    } finally {
      setLoadingPriorities(false);
    }
  };

  const loadTemplates = async (categoryId?: string) => {
    try {
      setLoadingTemplates(true);
      const t = await ticketSystemService.getTemplates(categoryId);
      setTemplates(t);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

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
      setSelectedTemplateId('');
      loadTemplates();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (formData.category) {
      loadTemplates(formData.category);
    } else {
      loadTemplates();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category]);

  const applyTemplate = (template: TicketTemplate) => {
    const fields = (template.customFields || {}) as Record<string, any>;
    const escapeHtml = (s: any) => String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const descriptionText = (template as any).templateDescription || template.description || '';
    const descriptionHtml = descriptionText
      ? `<p>${escapeHtml(descriptionText).replace(/\n/g, '<br/>')}</p>`
      : '';

    // Render only data rows, no captions or extra separators
    const fieldLines = Object.entries(fields)
      .map(([k, v]) => `<p><strong>${escapeHtml(k)}</strong>: ${escapeHtml(v)}</p>`)
      .join('');

    setFormData(prev => ({
      ...prev,
      title: template.title || prev.title,
      description: `${descriptionHtml}${fieldLines}` || prev.description,
      category: template.categoryId || prev.category
    }));
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !isAuthenticated) {
      onLoginRequired?.();
      return;
    }
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const resetFormFields = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      priority: 'MEDIUM',
      dueDate: '',
      tags: []
    });
    setAttachments([]);
    setSelectedTemplateId('');
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
      const selectedPriority = priorities.find(p => p.name.toUpperCase() === formData.priority);
      const ticketData = {
        title: formData.title.trim(),
        description: formData.description,
        category: formData.category,
        // Prefer sending priorityId for precise mapping in backend
        ...(selectedPriority ? { priorityId: selectedPriority.id } : { priority: formData.priority }),
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
          {/* Template selector */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    value={selectedTemplateId}
                    options={templates.map(t => ({ value: t.id, label: t.name }))}
                    placeholder={loadingTemplates ? 'Loading templates...' : 'Type to search templates'}
                    onChange={(value: string) => {
                      setSelectedTemplateId(value);
                      const tpl = templates.find(t => t.id === value);
                      if (tpl) applyTemplate(tpl);
                    }}
                  />
                </div>
                <Button type="button" variant="outline" onClick={resetFormFields}>
                  Reset Fields
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Issue Title *</Label>
            <Input
              id="title"
              placeholder="Brief description of the issue"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              autoFocus
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <SearchableSelect
                value={formData.category}
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                placeholder={loadingCategories ? 'Loading categories...' : 'Type to search categories'}
                onChange={(value: string) => setFormData(prev => ({ ...prev, category: value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingPriorities ? 'Loading priorities...' : 'Select priority'} />
                </SelectTrigger>
                <SelectContent>
                  {loadingPriorities ? (
                    <SelectItem value="loading" disabled>Loading priorities...</SelectItem>
                  ) : (
                    priorities.map((p) => (
                      <SelectItem key={p.id} value={p.name.toUpperCase()}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [ticketFilter, setTicketFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('tickets');
  const [autoOpenNewTicket, setAutoOpenNewTicket] = useState(false);
  // Fetch tickets from backend API
  // Infinite pagination state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketNumberQuery, setTicketNumberQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [priorityOptions, setPriorityOptions] = useState<TicketPriority[]>([]);
  const [loadingPriorityOptions, setLoadingPriorityOptions] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categoryOptions, setCategoryOptions] = useState<TicketCategory[]>([]);
  const [loadingCategoryOptions, setLoadingCategoryOptions] = useState(false);
  const [totalTickets, setTotalTickets] = useState<number>(0);

  const fetchTickets = async (nextPage = 1) => {
    try {
      setTicketsLoading(true);
      setTicketsError(null);
      const params: any = { page: nextPage, limit: 9, sortBy: 'createdAt', sortOrder: 'desc' };
      // Apply server-side search
      if (searchQuery && searchQuery.trim().length > 0) params.search = searchQuery.trim();
      // Apply ticket number exact match if provided
      if (ticketNumberQuery && ticketNumberQuery.trim().length > 0) params.ticketNumber = ticketNumberQuery.trim();
      // Apply server-side status filter
      if (ticketFilter && ticketFilter !== 'all') {
        params.status = ticketFilter; // values already normalized to API names
      }
      // Apply server-side priority filter
      if (priorityFilter && priorityFilter !== 'all') {
        params.priority = priorityFilter; // priority name
      }
      // Apply server-side category filter (by category name)
      if (categoryFilter && categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      const res = await TicketService.getTickets(params);
      if (!res.success) {
        setTicketsError(res.error || 'Failed to load tickets');
        setTicketsLoading(false);
        return;
      }
      const newTickets: Ticket[] = res.data || [];
      setTotalTickets(res.pagination?.total || newTickets.length || 0);
      setTickets(prev => nextPage === 1 ? newTickets : [...prev, ...newTickets]);
      const totalPages = res.pagination?.totalPages || (newTickets.length < 9 ? nextPage : nextPage + 1);
      setHasMore(nextPage < totalPages && newTickets.length > 0);
      setPage(nextPage);
    } catch (e: any) {
      setTicketsError(e?.message || 'Failed to load tickets');
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    // initial load
    fetchTickets(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchTickets(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketFilter, priorityFilter, categoryFilter]);

  // Debounced refetch when search changes
  useEffect(() => {
    const id = setTimeout(() => {
      fetchTickets(1);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, ticketNumberQuery]);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  useEffect(() => {
    const loadStatuses = async () => {
      try {
        setLoadingStatuses(true);
        const s = await ticketSystemService.getStatuses();
        setStatuses(s);
      } catch (e) {
        console.error('Failed to load statuses:', e);
      } finally {
        setLoadingStatuses(false);
      }
    };
    loadStatuses();
  }, []);
  
  useEffect(() => {
    const loadPrioritiesForFilter = async () => {
      try {
        setLoadingPriorityOptions(true);
        const p = await ticketSystemService.getPriorities();
        setPriorityOptions(p);
      } catch (e) {
        console.error('Failed to load priorities:', e);
      } finally {
        setLoadingPriorityOptions(false);
      }
    };
    loadPrioritiesForFilter();
  }, []);

  // Load categories for filter options
  useEffect(() => {
    const loadCategoriesForFilter = async () => {
      try {
        setLoadingCategoryOptions(true);
        const c = await ticketSystemService.getCategories();
        setCategoryOptions(c);
      } catch (e) {
        console.error('Failed to load categories:', e);
      } finally {
        setLoadingCategoryOptions(false);
      }
    };
    loadCategoriesForFilter();
  }, []);
  
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
      // Clear the action param so it doesn't reopen on refresh
      const params = new URLSearchParams(searchParams);
      params.delete('action');
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  // Tickets now come pre-filtered from backend via status/search; no client-side search
  const filteredTickets = tickets;

  // For now, we'll use empty knowledge base until we implement that API
  const filteredKnowledgeBase: any[] = [];

  const openTickets = tickets.filter((t: Ticket) => t.status === 'OPEN').length;
  const inProgressTickets = tickets.filter((t: Ticket) => t.status === 'IN_PROGRESS').length;
  const resolvedTickets = tickets.filter((t: Ticket) => t.status === 'RESOLVED').length;

  return (
    <div className="relative z-0 min-h-screen bg-background">
      <PageWrapper className="max-w-[1500px] lg:pl-[calc(var(--sidebar-width,14rem)+1.5rem)] py-6 transition-[padding]">
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
              onOpenChange={(open) => {
                if (!open) {
                  setAutoOpenNewTicket(false);
                  const params = new URLSearchParams(searchParams);
                  params.delete('action');
                  setSearchParams(params, { replace: true });
                }
              }}
              isAuthenticated={true}
              onLoginRequired={() => {}}
            />
          </div>
        </PageSection>

        {/* Summary Stats removed */}

        {/* Search Bar */}
        <PageSection index={2} className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ticket # (exact)"
                value={ticketNumberQuery}
                onChange={(e) => setTicketNumberQuery(e.target.value.replace(/[^0-9]/g, ''))}
                className="pl-10"
              />
            </div>
          </div>
        </PageSection>

        {/* Tabs */}
        <PageSection index={3}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-1 max-w-md">
            <TabsTrigger value="tickets" className="gap-2">
              <MessageSquare className="h-4 w-4 hidden sm:inline" />
              My Tickets
            </TabsTrigger>
          </TabsList>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Support Tickets
                <Badge variant="outline" className="px-2 py-0.5 text-xs">
                  {totalTickets}
                </Badge>
              </h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select value={ticketFilter} onValueChange={setTicketFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {statuses.map(s => (
                      <SelectItem key={s.id} value={s.name.toUpperCase()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {priorityOptions.map(p => (
                      <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoryOptions.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <PageSection index={4}>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTickets.map((ticket: Ticket, index: number) => (
                  <TicketCard key={ticket.id} ticket={ticket} index={index} statuses={statuses} onTicketUpdated={() => fetchTickets(1)} />
                ))}
              </div>
              <div className="flex justify-center mt-6">
                {hasMore && (
                  <Button variant="outline" onClick={() => fetchTickets(page + 1)} disabled={ticketsLoading}>
                    {ticketsLoading ? 'Loading…' : 'Load more'}
                  </Button>
                )}
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

          {/* Knowledge Base and Contact tabs removed */}
        </Tabs>
        </PageSection>
      </PageWrapper>
      

    </div>
  );
};
