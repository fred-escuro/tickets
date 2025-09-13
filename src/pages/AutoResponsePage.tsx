import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PageWrapper, PageSection } from '@/components/PageWrapper';
import { 
  Mail, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  Info,
  Copy
} from 'lucide-react';
import { autoResponseService } from '@/lib/services/autoResponseService';
import { apiClient } from '@/lib/api';
import type { 
  AutoResponseTemplate, 
  CreateAutoResponseTemplateRequest,
  AutoResponseTemplateFilters
} from '@/types/autoResponse';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

// Available variables for auto-response templates
const AVAILABLE_VARIABLES = {
  ticket: [
    { name: '{{ticketNumber}}', description: 'Unique ticket number' },
    { name: '{{ticketTitle}}', description: 'Ticket subject/title' },
    { name: '{{ticketDescription}}', description: 'Ticket description' },
    { name: '{{ticketPriority}}', description: 'Ticket priority level' },
    { name: '{{ticketStatus}}', description: 'Current ticket status' },
    { name: '{{ticketCategory}}', description: 'Ticket category' },
    { name: '{{ticketCreatedAt}}', description: 'Ticket creation date' }
  ],
  submitter: [
    { name: '{{submitterName}}', description: 'Full name of ticket submitter' },
    { name: '{{submitterEmail}}', description: 'Email of ticket submitter' },
    { name: '{{submitterFirstName}}', description: 'First name only' },
    { name: '{{submitterLastName}}', description: 'Last name only' }
  ],
  company: [
    { name: '{{companyName}}', description: 'Your company name' },
    { name: '{{companyEmail}}', description: 'Support email address' },
    { name: '{{companyPhone}}', description: 'Support phone number' },
    { name: '{{companyWebsite}}', description: 'Company website URL' }
  ],
  system: [
    { name: '{{currentDate}}', description: 'Current date' },
    { name: '{{currentTime}}', description: 'Current time' },
    { name: '{{supportAgentName}}', description: 'Assigned agent name' },
    { name: '{{departmentName}}', description: 'Department name' }
  ]
};

// Variable Helper Component
const VariableHelper = ({ 
  onInsertVariable, 
  isCollapsed, 
  onToggleCollapse 
}: { 
  onInsertVariable: (variable: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Variable copied to clipboard');
  };

  return (
    <div className={`bg-background border rounded-lg shadow-sm transition-all duration-300 ${
      isCollapsed ? 'w-12' : 'w-full'
    }`}>
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          {!isCollapsed && <span className="text-sm font-medium">Available Variables</span>}
        </div>
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      
      {!isCollapsed && (
        <div className="p-2 border-t max-h-[calc(90vh-200px)] overflow-y-auto">
          <div className="space-y-2">
            {Object.entries(AVAILABLE_VARIABLES).map(([category, variables]) => (
              <div key={category} className="space-y-0.5">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                  {category}
                </h5>
                <div className="space-y-0.5">
                  {variables.map((variable) => (
                    <div
                      key={variable.name}
                      className="group flex items-start justify-between p-1 hover:bg-muted/50 rounded border border-dashed border-muted-foreground/20 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => onInsertVariable(variable.name)}
                          className="text-left w-full"
                          title="Click to insert variable"
                        >
                          <code className="text-primary font-mono text-xs block mb-1">
                            {variable.name}
                          </code>
                          <div className="text-muted-foreground text-[10px] leading-tight line-clamp-2">
                            {variable.description}
                          </div>
                        </button>
                      </div>
                      <button
                        onClick={() => copyToClipboard(variable.name)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-all flex-shrink-0 ml-2"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


export default function AutoResponsePage() {
  const [templates, setTemplates] = useState<AutoResponseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AutoResponseTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [isVariableHelperCollapsed, setIsVariableHelperCollapsed] = useState(false);
  const [activeField, setActiveField] = useState<'subject' | 'body' | null>(null);
  const [filters, setFilters] = useState<AutoResponseTemplateFilters>({
    page: 1,
    limit: 25,
    sortBy: 'createdAt',
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
  const [cache, setCache] = useState<Map<string, { data: AutoResponseTemplate[], timestamp: number }>>(new Map());
  const [refreshKey, setRefreshKey] = useState(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  // Form state
  const [formData, setFormData] = useState<CreateAutoResponseTemplateRequest>({
    name: '',
    description: '',
    subjectTemplate: '',
    bodyTemplate: '',
    triggerConditions: {},
    departmentId: '',
    isActive: true,
  });

  // Variable insertion function
  const insertVariable = (variable: string) => {
    if (activeField === 'subject') {
      setFormData(prev => ({
        ...prev,
        subjectTemplate: prev.subjectTemplate + variable
      }));
    } else if (activeField === 'body') {
      setFormData(prev => ({
        ...prev,
        bodyTemplate: prev.bodyTemplate + variable
      }));
    }
  };

  // Load departments
  const loadDepartments = async () => {
    try {
      console.log('Loading departments...');
      const response = await apiClient.get('/api/departments');
      console.log('Departments response:', response);
      if (response.success && response.data) {
        setDepartments(Array.isArray(response.data) ? response.data : []);
        console.log('Departments loaded:', response.data);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  // Load departments on mount
  useEffect(() => {
    loadDepartments();
  }, []);

  // Initial load of templates
  useEffect(() => {
    loadTemplates();
  }, []);

  // Debounced effect for filters to prevent too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadTemplates();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [filters, refreshKey]);

  // Load templates
  const loadTemplates = async (loadMore = false, forceRefresh = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      // Create cache key from filters and refresh key
      const cacheKey = JSON.stringify({ ...filters, refreshKey });
      const now = Date.now();
      
      // Check cache first (only for initial load, not for load more, and not when forcing refresh)
      if (!loadMore && !forceRefresh) {
        const cached = cache.get(cacheKey);
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          console.log('Using cached templates');
          setTemplates(cached.data);
          setLoading(false);
          return;
        }
      }
      
      console.log('Fetching templates from server', { forceRefresh, loadMore, cacheKey });
      const result = await autoResponseService.getTemplates(filters);
      
      if (!result) {
        throw new Error('No response received from server');
      }
      
      const newTemplates = result.templates || [];
      console.log('Received templates:', newTemplates.length);
      
      if (loadMore) {
        // Append new templates for infinite scroll
        setTemplates(prev => [...prev, ...newTemplates]);
      } else {
        // Replace templates for new search/filter
        setTemplates(newTemplates);
        // Cache the results (only if not forcing refresh)
        if (!forceRefresh) {
          setCache(prev => new Map(prev.set(cacheKey, { data: newTemplates, timestamp: now })));
        }
      }
      
      setPagination({
        total: result.total || 0,
        page: result.page || 1,
        limit: result.limit || 25,
        totalPages: result.totalPages || 0,
        hasMore: (result.page || 1) < (result.totalPages || 0),
      });
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates: ' + (error.message || 'Unknown error'));
      if (!loadMore) {
        setTemplates([]);
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

  // Infinite scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!isInfiniteScroll || loadingMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const threshold = 100; // Load more when 100px from bottom
    
    if (scrollHeight - scrollTop <= clientHeight + threshold && pagination.hasMore) {
      loadMoreTemplates();
    }
  }, [isInfiniteScroll, loadingMore, pagination.hasMore]);

  // Load more templates
  const loadMoreTemplates = useCallback(() => {
    if (loadingMore || !pagination.hasMore) return;
    
    setFilters(prev => ({
      ...prev,
      page: (prev.page || 1) + 1,
    }));
  }, [loadingMore, pagination.hasMore]);

  // Clear cache
  const clearCache = useCallback(() => {
    console.log('Clearing cache manually');
    setCache(new Map());
    setRefreshKey(prev => prev + 1);
    loadTemplates(false, true);
  }, []);

  // Statistics calculation
  const statistics = useMemo(() => {
    const totalTemplates = templates.length;
    const activeTemplates = templates.filter(t => t.isActive).length;
    const inactiveTemplates = totalTemplates - activeTemplates;
    const departmentTemplates = templates.filter(t => t.departmentId).length;
    const globalTemplates = totalTemplates - departmentTemplates;

    return {
      totalTemplates,
      activeTemplates,
      inactiveTemplates,
      departmentTemplates,
      globalTemplates,
    };
  }, [templates]);

  // Create template
  const handleCreateTemplate = async () => {
    try {
      const templateData = {
        ...formData,
        departmentId: formData.departmentId === 'global' ? undefined : formData.departmentId
      };
      await autoResponseService.createTemplate(templateData);
      toast.success('Template created successfully');
      setShowCreateDialog(false);
      setFormData({
        name: '',
        description: '',
        subjectTemplate: '',
        bodyTemplate: '',
        triggerConditions: {},
        departmentId: '',
        isActive: true,
      });
      
      // Clear cache completely and force refresh
      setCache(new Map());
      setRefreshKey(prev => prev + 1);
      await loadTemplates(false, true);
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  // Update template
  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      const templateData = {
        ...formData,
        departmentId: formData.departmentId === 'global' ? undefined : formData.departmentId
      };
      console.log('Updating template with data:', templateData);
      console.log('Original formData:', formData);
      await autoResponseService.updateTemplate(selectedTemplate.id, templateData);
      toast.success('Template updated successfully');
      setShowEditDialog(false);
      setSelectedTemplate(null);
      
      // Clear cache completely and force refresh
      setCache(new Map());
      setRefreshKey(prev => prev + 1);
      
      // Reset form data
      setFormData({
        name: '',
        description: '',
        subjectTemplate: '',
        bodyTemplate: '',
        triggerConditions: {},
        departmentId: '',
        isActive: true,
      });
      
      // Force refresh without cache
      await loadTemplates(false, true);
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  // Delete template
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await autoResponseService.deleteTemplate(id);
      toast.success('Template deleted successfully');
      
      // Clear cache completely and force refresh
      setCache(new Map());
      setRefreshKey(prev => prev + 1);
      await loadTemplates(false, true);
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Edit template
  const handleEditTemplate = (template: AutoResponseTemplate) => {
    console.log('Editing template:', template);
    setSelectedTemplate(template);
    const departmentId = template.departmentId || 'global';
    console.log('Setting departmentId to:', departmentId);
    setFormData({
      name: template.name,
      description: template.description || '',
      subjectTemplate: template.subjectTemplate,
      bodyTemplate: template.bodyTemplate,
      triggerConditions: template.triggerConditions || {},
      departmentId: departmentId,
      isActive: template.isActive,
    });
    setShowEditDialog(true);
  };

  // Preview template
  const handlePreviewTemplate = (template: AutoResponseTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewDialog(true);
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
              onClick={() => loadTemplates()} 
              disabled={loading}
              className="gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Auto-Response Templates</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Manage automated email responses for new tickets
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[70vw] max-h-[90vh] overflow-hidden w-[70vw] sm:max-w-[80vw] px-4">
                <DialogHeader className="pb-4">
                  <DialogTitle>Create Auto-Response Template</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col lg:flex-row gap-1 h-[calc(80vh-50px)]">
                  {/* Variable Helper Sidebar */}
                  <div className="lg:w-[280px] w-full flex-shrink-0">
                    <VariableHelper
                      onInsertVariable={insertVariable}
                      isCollapsed={isVariableHelperCollapsed}
                      onToggleCollapse={() => setIsVariableHelperCollapsed(!isVariableHelperCollapsed)}
                    />
                  </div>
                  
            {/* Main Form */}
            <div className="flex-1 space-y-2 overflow-y-auto min-w-0 lg:min-w-[250px]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Template Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Welcome - New Ticket"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="departmentId">Department</Label>
                      <Select
                        value={formData.departmentId}
                        onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select department (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">Global Template</SelectItem>
                          {departments.length > 0 ? (
                            departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="loading" disabled>Loading departments...</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of when this template should be used"
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subjectTemplate">Subject Template *</Label>
                    <Input
                      id="subjectTemplate"
                      value={formData.subjectTemplate}
                      onChange={(e) => setFormData({ ...formData, subjectTemplate: e.target.value })}
                      onFocus={() => setActiveField('subject')}
                      placeholder="e.g., Re: {'{{ticketTitle}}'} - Ticket {'{{ticketNumber}}'}"
                      className="font-mono text-sm h-9"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use variables like {'{{ticketNumber}}'}, {'{{ticketTitle}}'}, {'{{submitterName}}'} - Click variables in the sidebar to insert
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bodyTemplate">Body Template *</Label>
                    <Textarea
                      id="bodyTemplate"
                      value={formData.bodyTemplate}
                      onChange={(e) => setFormData({ ...formData, bodyTemplate: e.target.value })}
                      onFocus={() => setActiveField('body')}
                      placeholder="Enter the email body template..."
                      rows={15}
                      className="font-mono text-sm resize-none min-h-[300px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use variables like {'{{ticketNumber}}'}, {'{{ticketTitle}}'}, {'{{submitterName}}'}, {'{{companyName}}'} - Click variables in the sidebar to insert
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTemplate}>
                      Create Template
                    </Button>
                  </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </PageSection>

        {/* Statistics Cards */}
        <PageSection index={1} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Templates</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.totalTemplates}</div>
                <p className="text-xs text-muted-foreground mt-1">All templates</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Templates</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.activeTemplates}</div>
                <p className="text-xs text-muted-foreground mt-1">Currently enabled</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Department Templates</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.departmentTemplates}</div>
                <p className="text-xs text-muted-foreground mt-1">Department-specific</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Global Templates</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.globalTemplates}</div>
                <p className="text-xs text-muted-foreground mt-1">System-wide</p>
              </CardContent>
            </Card>
          </div>
        </PageSection>

        {/* Templates Table */}
        <PageSection index={2} className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Templates ({pagination.total})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      id="infinite-scroll"
                      type="checkbox"
                      checked={isInfiniteScroll}
                      onChange={(e) => setIsInfiniteScroll(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="infinite-scroll">Infinite scroll</label>
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
              {templates.length > 0 ? (
                <>
                  <div 
                    className="rounded-md border max-h-[600px] overflow-y-auto"
                    onScroll={handleScroll}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Name</TableHead>
                          <TableHead className="w-[150px]">Department</TableHead>
                          <TableHead className="w-[100px]">Status</TableHead>
                          <TableHead className="w-[150px]">Created</TableHead>
                          <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templates.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium truncate" title={template.name}>
                                  {template.name}
                                </div>
                                {template.description && (
                                  <div className="text-sm text-muted-foreground truncate" title={template.description}>
                                    {template.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {template.department?.name || 'Global'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${template.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'} text-xs`}>
                                <div className="flex items-center gap-1">
                                  {template.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                  {template.isActive ? 'Active' : 'Inactive'}
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(template.createdAt), 'MMM dd, yyyy')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePreviewTemplate(template)}
                                  className="h-8 w-8 p-0"
                                  title="Preview template"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditTemplate(template)}
                                  className="h-8 w-8 p-0"
                                  title="Edit template"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  title="Delete template"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Loading More Indicator */}
                  {loadingMore && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading more templates...</span>
                    </div>
                  )}

                  {/* Load More Button (when infinite scroll is disabled) */}
                  {!isInfiniteScroll && pagination.hasMore && (
                    <div className="flex items-center justify-center mt-4">
                      <Button
                        variant="outline"
                        onClick={loadMoreTemplates}
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
                          onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
                          disabled={pagination.page <= 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
                          disabled={pagination.page >= pagination.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  <span>Loading templates...</span>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No templates found</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by creating your first auto-response template.
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </PageSection>
      </PageWrapper>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[70vw] max-h-[90vh] overflow-hidden w-[70vw] sm:max-w-[70vw] px-4">
          <DialogHeader className="pb-4">
            <DialogTitle>Edit Auto-Response Template</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col lg:flex-row gap-1 h-[calc(90vh-100px)]">
            {/* Variable Helper Sidebar */}
            <div className="lg:w-[280px] w-full flex-shrink-0">
              <VariableHelper
                onInsertVariable={insertVariable}
                isCollapsed={isVariableHelperCollapsed}
                onToggleCollapse={() => setIsVariableHelperCollapsed(!isVariableHelperCollapsed)}
              />
            </div>
            
            {/* Main Form */}
            <div className="flex-1 space-y-2 overflow-y-auto min-w-0 lg:min-w-[350px]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Template Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Welcome - New Ticket"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-departmentId">Department</Label>
                <div className="text-xs text-muted-foreground mb-1">
                  Current value: {formData.departmentId}
                </div>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) => {
                    console.log('Department changed to:', value);
                    setFormData({ ...formData, departmentId: value });
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global Template</SelectItem>
                    {departments.length > 0 ? (
                      departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>Loading departments...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of when this template should be used"
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-subjectTemplate">Subject Template *</Label>
              <Input
                id="edit-subjectTemplate"
                value={formData.subjectTemplate}
                onChange={(e) => setFormData({ ...formData, subjectTemplate: e.target.value })}
                onFocus={() => setActiveField('subject')}
                placeholder="e.g., Re: {'{{ticketTitle}}'} - Ticket {'{{ticketNumber}}'}"
                className="font-mono text-sm h-9"
              />
              <p className="text-xs text-muted-foreground">
                Use variables like {'{{ticketNumber}}'}, {'{{ticketTitle}}'}, {'{{submitterName}}'} - Click variables in the sidebar to insert
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bodyTemplate">Body Template *</Label>
              <Textarea
                id="edit-bodyTemplate"
                value={formData.bodyTemplate}
                onChange={(e) => setFormData({ ...formData, bodyTemplate: e.target.value })}
                onFocus={() => setActiveField('body')}
                placeholder="Enter the email body template..."
                rows={15}
                className="font-mono text-sm resize-none min-h-[300px]"
              />
              <p className="text-xs text-muted-foreground">
                Use variables like {'{{ticketNumber}}'}, {'{{ticketTitle}}'}, {'{{submitterName}}'}, {'{{companyName}}'} - Click variables in the sidebar to insert
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTemplate}>
                Update Template
              </Button>
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border-2">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Subject:</h3>
                <div className="p-3 bg-muted rounded-md font-mono text-sm">
                  {selectedTemplate.subjectTemplate}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Body:</h3>
                <div className="p-3 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap">
                  {selectedTemplate.bodyTemplate}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
