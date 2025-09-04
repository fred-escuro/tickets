import { useState, useEffect, type FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { PageWrapper, PageSection } from '@/components/PageWrapper';
import { ticketSystemService, type TicketCategory, type TicketPriority, type TicketStatus, type TicketTemplate, type TicketWorkflow } from '@/lib/services/ticketSystemService';
import { TicketStatusWorkflow } from '@/components/TicketStatusWorkflow';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Folder,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Workflow,
  BarChart3,
  Palette,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

export const TicketSystemAdminPage: FC = () => {
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [priorities, setPriorities] = useState<TicketPriority[]>([]);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [workflows, setWorkflows] = useState<TicketWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('categories');

  // Form states
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: 'blue',
    icon: '',
    parentId: '',
    customFields: { fields: [] },
    autoAssignRules: { rules: [] }
  });

  // Priority form
  const [priorityForm, setPriorityForm] = useState({
    name: '',
    description: '',
    color: 'yellow',
    icon: '',
    level: 3,
    slaResponseHours: 24,
    slaResolveHours: 72,
    escalationRules: { rules: [] }
  });

  // Status form
  const [statusForm, setStatusForm] = useState({
    name: '',
    description: '',
    color: 'blue',
    icon: '',
    isClosed: false,
    isResolved: false,
    allowedTransitions: { transitions: [] },
    permissions: { roles: ['admin', 'manager', 'agent'] }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesData, prioritiesData, statusesData, templatesData, workflowsData] = await Promise.all([
        ticketSystemService.getCategories(),
        ticketSystemService.getPriorities(),
        ticketSystemService.getStatuses(),
        ticketSystemService.getTemplates(),
        ticketSystemService.getWorkflows()
      ]);

      setCategories(categoriesData);
      setPriorities(prioritiesData);
      setStatuses(statusesData);
      setTemplates(templatesData);
      setWorkflows(workflowsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    try {
      if (editingItem) {
        await ticketSystemService.updateCategory(editingItem.id, categoryForm);
        toast.success('Category updated successfully');
      } else {
        await ticketSystemService.createCategory(categoryForm);
        toast.success('Category created successfully');
      }
      setShowCategoryDialog(false);
      setEditingItem(null);
      resetCategoryForm();
      loadData();
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleSavePriority = async () => {
    try {
      if (editingItem) {
        await ticketSystemService.updatePriority(editingItem.id, priorityForm);
        toast.success('Priority updated successfully');
      } else {
        await ticketSystemService.createPriority(priorityForm);
        toast.success('Priority created successfully');
      }
      setShowPriorityDialog(false);
      setEditingItem(null);
      resetPriorityForm();
      loadData();
    } catch (error) {
      console.error('Failed to save priority:', error);
      toast.error('Failed to save priority');
    }
  };

  const handleSaveStatus = async () => {
    try {
      if (editingItem) {
        await ticketSystemService.updateStatus(editingItem.id, statusForm);
        toast.success('Status updated successfully');
      } else {
        await ticketSystemService.createStatus(statusForm);
        toast.success('Status created successfully');
      }
      setShowStatusDialog(false);
      setEditingItem(null);
      resetStatusForm();
      loadData();
    } catch (error) {
      console.error('Failed to save status:', error);
      toast.error('Failed to save status');
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      color: 'blue',
      icon: '',
      parentId: '',
      customFields: { fields: [] },
      autoAssignRules: { rules: [] }
    });
  };

  const resetPriorityForm = () => {
    setPriorityForm({
      name: '',
      description: '',
      color: 'yellow',
      icon: '',
      level: 3,
      slaResponseHours: 24,
      slaResolveHours: 72,
      escalationRules: { rules: [] }
    });
  };

  const resetStatusForm = () => {
    setStatusForm({
      name: '',
      description: '',
      color: 'blue',
      icon: '',
      isClosed: false,
      isResolved: false,
      allowedTransitions: { transitions: [] },
      permissions: { roles: ['admin', 'manager', 'agent'] }
    });
  };

  const openEditDialog = (type: string, item: any) => {
    setEditingItem(item);
    
    if (type === 'category') {
      setCategoryForm({
        name: item.name,
        description: item.description || '',
        color: item.color,
        icon: item.icon || '',
        parentId: item.parentId || '',
        customFields: item.customFields || { fields: [] },
        autoAssignRules: item.autoAssignRules || { rules: [] }
      });
      setShowCategoryDialog(true);
    } else if (type === 'priority') {
      setPriorityForm({
        name: item.name,
        description: item.description || '',
        color: item.color,
        icon: item.icon || '',
        level: item.level,
        slaResponseHours: item.slaResponseHours,
        slaResolveHours: item.slaResolveHours,
        escalationRules: item.escalationRules || { rules: [] }
      });
      setShowPriorityDialog(true);
    } else if (type === 'status') {
      setStatusForm({
        name: item.name,
        description: item.description || '',
        color: item.color,
        icon: item.icon || '',
        isClosed: item.isClosed,
        isResolved: item.isResolved,
        allowedTransitions: item.allowedTransitions || { transitions: [] },
        permissions: item.permissions || { roles: ['admin', 'manager', 'agent'] }
      });
      setShowStatusDialog(true);
    }
  };

  const colorOptions = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'gray', label: 'Gray', class: 'bg-gray-500' }
  ];

  if (loading) {
    return (
      <PageWrapper>
        <PageSection>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading system configuration...</p>
            </div>
          </div>
        </PageSection>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageSection>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Ticket System Administration</h1>
              <p className="text-muted-foreground mt-2">
                Manage categories, priorities, statuses, and workflows for your ticketing system
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                {categories.length} Categories
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {priorities.length} Priorities
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                {statuses.length} Statuses
              </Badge>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="priorities" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Priorities
              </TabsTrigger>
              <TabsTrigger value="statuses" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Statuses
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="workflows" className="flex items-center gap-2">
                <Workflow className="h-4 w-4" />
                Workflows
              </TabsTrigger>
            </TabsList>

            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Ticket Categories</h2>
                <Button onClick={() => setShowCategoryDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <Card key={category.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${ticketSystemService.getCategoryColorClass(category.color).split(' ')[0]}`} />
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog('category', category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {category.description || 'No description'}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {category._count?.tickets || 0} tickets
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {category.children?.length || 0} subcategories
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Priorities Tab */}
            <TabsContent value="priorities" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Priority Levels</h2>
                <Button onClick={() => setShowPriorityDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Priority
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {priorities.map((priority) => (
                  <Card key={priority.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={`${ticketSystemService.getPriorityColorClass(priority.color)} text-xs`}
                          >
                            Level {priority.level}
                          </Badge>
                          <CardTitle className="text-lg">{priority.name}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog('priority', priority)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {priority.description || 'No description'}
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Response:</span>
                          <span className="font-medium">{priority.slaResponseHours}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Resolution:</span>
                          <span className="font-medium">{priority.slaResolveHours}h</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Statuses Tab */}
            <TabsContent value="statuses" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Ticket Statuses</h2>
                <Button onClick={() => setShowStatusDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Status
                </Button>
              </div>

              {/* Status Workflow Visualization */}
              <TicketStatusWorkflow statuses={statuses} />

              {/* Status Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {statuses.map((status) => (
                  <Card key={status.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={`${ticketSystemService.getStatusColorClass(status.color)} text-xs`}
                          >
                            {status.name}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {status.isClosed && <EyeOff className="h-4 w-4 text-muted-foreground" />}
                            {status.isResolved && <CheckCircle className="h-4 w-4 text-green-600" />}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog('status', status)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog('status', status)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <Workflow className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {status.description || 'No description'}
                      </p>
                      
                      {/* Status Properties */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Properties:</span>
                          <div className="flex items-center gap-1">
                            {status.isClosed && (
                              <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                                Closes Ticket
                              </Badge>
                            )}
                            {status.isResolved && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                                Resolves Ticket
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Allowed Transitions */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Allowed Transitions:</span>
                            <span className="font-medium">
                              {status.allowedTransitions?.transitions?.length || 0}
                            </span>
                          </div>
                          {status.allowedTransitions?.transitions && status.allowedTransitions.transitions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {status.allowedTransitions.transitions.map((transitionId) => {
                                const transitionStatus = statuses.find(s => s.id === transitionId);
                                return transitionStatus ? (
                                  <Badge 
                                    key={transitionId} 
                                    variant="outline" 
                                    className="text-xs"
                                    style={{ 
                                      borderColor: transitionStatus.color === 'blue' ? '#3b82f6' :
                                                  transitionStatus.color === 'green' ? '#10b981' :
                                                  transitionStatus.color === 'red' ? '#ef4444' :
                                                  transitionStatus.color === 'yellow' ? '#f59e0b' :
                                                  transitionStatus.color === 'orange' ? '#f97316' :
                                                  transitionStatus.color === 'purple' ? '#8b5cf6' :
                                                  '#6b7280'
                                    }}
                                  >
                                    {transitionStatus.name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                        
                        {/* Permissions */}
                        {status.permissions?.roles && status.permissions.roles.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Roles:</span>
                            <div className="flex flex-wrap gap-1">
                              {status.permissions.roles.map((role) => (
                                <Badge key={role} variant="outline" className="text-xs">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Ticket Templates</h2>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {template.description || 'No description'}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {template.category?.name || 'No Category'}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Workflows Tab */}
            <TabsContent value="workflows" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Automation Workflows</h2>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Workflow
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {workflows.map((workflow) => (
                  <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {workflow.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Triggers:</span>
                        <span className="font-medium">
                          {workflow.rules.triggers?.length || 0}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Category Dialog */}
        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Category' : 'Create New Category'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category-name">Name</Label>
                  <Input
                    id="category-name"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="Category name"
                  />
                </div>
                <div>
                  <Label htmlFor="category-color">Color</Label>
                  <Select value={categoryForm.color} onValueChange={(value) => setCategoryForm({ ...categoryForm, color: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${color.class}`} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="category-description">Description</Label>
                <Textarea
                  id="category-description"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Category description"
                />
              </div>
              <div>
                <Label htmlFor="category-parent">Parent Category</Label>
                <Select value={categoryForm.parentId} onValueChange={(value) => setCategoryForm({ ...categoryForm, parentId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent</SelectItem>
                    {categories.filter(c => !c.parentId).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCategory}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Priority Dialog */}
        <Dialog open={showPriorityDialog} onOpenChange={setShowPriorityDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Priority' : 'Create New Priority'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority-name">Name</Label>
                  <Input
                    id="priority-name"
                    value={priorityForm.name}
                    onChange={(e) => setPriorityForm({ ...priorityForm, name: e.target.value })}
                    placeholder="Priority name"
                  />
                </div>
                <div>
                  <Label htmlFor="priority-level">Level (1-10)</Label>
                  <Input
                    id="priority-level"
                    type="number"
                    min="1"
                    max="10"
                    value={priorityForm.level}
                    onChange={(e) => setPriorityForm({ ...priorityForm, level: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="priority-description">Description</Label>
                <Textarea
                  id="priority-description"
                  value={priorityForm.description}
                  onChange={(e) => setPriorityForm({ ...priorityForm, description: e.target.value })}
                  placeholder="Priority description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sla-response">SLA Response (hours)</Label>
                  <Input
                    id="sla-response"
                    type="number"
                    value={priorityForm.slaResponseHours}
                    onChange={(e) => setPriorityForm({ ...priorityForm, slaResponseHours: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="sla-resolve">SLA Resolution (hours)</Label>
                  <Input
                    id="sla-resolve"
                    type="number"
                    value={priorityForm.slaResolveHours}
                    onChange={(e) => setPriorityForm({ ...priorityForm, slaResolveHours: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPriorityDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSavePriority}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Status Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Status' : 'Create New Status'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status-name">Name</Label>
                  <Input
                    id="status-name"
                    value={statusForm.name}
                    onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })}
                    placeholder="Status name"
                  />
                </div>
                <div>
                  <Label htmlFor="status-color">Color</Label>
                  <Select value={statusForm.color} onValueChange={(value) => setStatusForm({ ...statusForm, color: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${color.class}`} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="status-description">Description</Label>
                <Textarea
                  id="status-description"
                  value={statusForm.description}
                  onChange={(e) => setStatusForm({ ...statusForm, description: e.target.value })}
                  placeholder="Status description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-closed"
                    checked={statusForm.isClosed}
                    onCheckedChange={(checked) => setStatusForm({ ...statusForm, isClosed: checked })}
                  />
                  <Label htmlFor="is-closed">Closes ticket</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-resolved"
                    checked={statusForm.isResolved}
                    onCheckedChange={(checked) => setStatusForm({ ...statusForm, isResolved: checked })}
                  />
                  <Label htmlFor="is-resolved">Resolves ticket</Label>
                </div>
              </div>
              
              {/* Allowed Transitions */}
              <div>
                <Label htmlFor="transitions">Allowed Transitions</Label>
                <div className="mt-2 space-y-2">
                  {statuses.filter(s => s.id !== editingItem?.id).map((status) => (
                    <div key={status.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`transition-${status.id}`}
                        checked={statusForm.allowedTransitions?.transitions?.includes(status.id) || false}
                        onChange={(e) => {
                          const currentTransitions = statusForm.allowedTransitions?.transitions || [];
                          const newTransitions = e.target.checked
                            ? [...currentTransitions, status.id]
                            : currentTransitions.filter(id => id !== status.id);
                          
                          setStatusForm({
                            ...statusForm,
                            allowedTransitions: { transitions: newTransitions }
                          });
                        }}
                      />
                      <Label htmlFor={`transition-${status.id}`} className="text-sm">
                        <Badge className={`${ticketSystemService.getStatusColorClass(status.color)} text-xs`}>
                          {status.name}
                        </Badge>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Permissions */}
              <div>
                <Label htmlFor="permissions">Required Roles</Label>
                <div className="mt-2 space-y-2">
                  {['admin', 'manager', 'agent', 'user'].map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`role-${role}`}
                        checked={statusForm.permissions?.roles?.includes(role) || false}
                        onChange={(e) => {
                          const currentRoles = statusForm.permissions?.roles || [];
                          const newRoles = e.target.checked
                            ? [...currentRoles, role]
                            : currentRoles.filter(r => r !== role);
                          
                          setStatusForm({
                            ...statusForm,
                            permissions: { roles: newRoles }
                          });
                        }}
                      />
                      <Label htmlFor={`role-${role}`} className="text-sm capitalize">
                        {role}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveStatus}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageSection>
    </PageWrapper>
  );
};
