import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useSearchParams } from 'react-router-dom';
import { 
  Settings, 
  Building2, 
  Mail, 
  Bell, 
  Users, 
  Ticket, 
  Globe, 
  Clock,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Info,
  Workflow,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { settingsService, type SystemSettings } from '@/lib/settingsService';
import { ticketSystemService, type TicketCategory, type TicketPriority, type TicketStatus } from '@/lib/services/ticketSystemService';
import { TicketStatusWorkflow } from '@/components/TicketStatusWorkflow';
import { PriorityWorkflow } from '@/components/PriorityWorkflow';
import { AuthService } from '@/lib/services/authService';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [settings, setSettings] = useState<SystemSettings>(settingsService.getSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  
  // Ticket system state
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [priorities, setPriorities] = useState<TicketPriority[]>([]);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Category management state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TicketCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: 'blue',
    icon: '',
    parentId: ''
  });

  // Status management state
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [editingStatus, setEditingStatus] = useState<TicketStatus | null>(null);
  const [statusForm, setStatusForm] = useState({
    name: '',
    description: '',
    color: 'blue',
    isClosed: false,
    isResolved: false,
    allowedTransitions: [] as string[],
    permissions: {
      roles: [] as string[],
      users: [] as string[]
    }
  });

  // Priority management state
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [editingPriority, setEditingPriority] = useState<TicketPriority | null>(null);
  const [priorityForm, setPriorityForm] = useState({
    name: '',
    description: '',
    color: 'blue',
    level: 1,
    slaHours: 24,
    escalationRules: {
      rules: [] as any[]
    }
  });

  // Function to get next available priority level
  const getNextAvailableLevel = (existingPriorities: TicketPriority[]): number => {
    const usedLevels = existingPriorities.map(p => p.level).sort((a, b) => a - b);
    for (let i = 1; i <= 10; i++) {
      if (!usedLevels.includes(i)) {
        return i;
      }
    }
    return 1; // Fallback if all levels are taken
  };

  // Get the current tab from URL params, default to 'general'
  const currentTab = searchParams.get('tab') || 'general';
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [allAccordionsExpanded, setAllAccordionsExpanded] = useState(false);

  // Toggle all accordions function
  const toggleAllAccordions = () => {
    if (allAccordionsExpanded) {
      setExpandedSections([]);
    } else {
      // Set all possible accordion values based on current tab
      const allSections = {
        general: ['company', 'system'],
        tickets: ['categories', 'priorities', 'statuses', 'workflows'],
        users: ['roles', 'departments'],
        notifications: ['email', 'inapp']
      };
      setExpandedSections(allSections[currentTab as keyof typeof allSections] || []);
    }
    setAllAccordionsExpanded(!allAccordionsExpanded);
  };

  // Load settings on component mount
  useEffect(() => {
    setSettings(settingsService.getSettings());
    loadTicketSystemData();
    
    // Log current user info for debugging
    const currentUser = AuthService.getCurrentUser();
    console.log('Current user:', currentUser);
    console.log('User role:', currentUser?.role);
  }, []);

  // Reset accordion state when switching tabs
  useEffect(() => {
    const allSections = {
      general: ['company', 'system'],
      tickets: ['categories', 'priorities', 'statuses', 'workflows'],
      users: ['roles', 'departments'],
      notifications: ['email', 'inapp']
    };
    
    if (allAccordionsExpanded) {
      setExpandedSections(allSections[currentTab as keyof typeof allSections] || []);
    } else {
      setExpandedSections([]);
    }
  }, [currentTab, allAccordionsExpanded]);

  const loadTicketSystemData = async () => {
    try {
      setLoading(true);
      console.log('Loading ticket system data...');
      const [categoriesData, prioritiesData, statusesData] = await Promise.all([
        ticketSystemService.getCategories(),
        ticketSystemService.getPriorities(),
        ticketSystemService.getStatuses()
      ]);
      console.log('Categories loaded:', categoriesData);
      console.log('Priorities loaded:', prioritiesData);
      console.log('Statuses loaded:', statusesData);
      setCategories(categoriesData);
      setPriorities(prioritiesData);
      setStatuses(statusesData);
    } catch (error) {
      console.error('Error loading ticket system data:', error);
      toast.error('Failed to load ticket system data');
    } finally {
      setLoading(false);
    }
  };

  // Handle tab changes
  const handleTabChange = (value: string) => {
    if (value === 'general') {
      setSearchParams({}); // Remove tab param for general
    } else {
      setSearchParams({ tab: value });
    }
  };

  // Color mapping for categories
  const getCategoryColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'border-blue-500 text-blue-700 bg-blue-50';
      case 'green':
        return 'border-green-500 text-green-700 bg-green-50';
      case 'purple':
        return 'border-purple-500 text-purple-700 bg-purple-50';
      case 'red':
        return 'border-red-500 text-red-700 bg-red-50';
      case 'yellow':
        return 'border-yellow-500 text-yellow-700 bg-yellow-50';
      case 'orange':
        return 'border-orange-500 text-orange-700 bg-orange-50';
      default:
        return 'border-gray-500 text-gray-700 bg-gray-50';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      // Save settings using the service
      settingsService.updateSettings(settings);
      
      setSaveStatus('success');
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const updateSetting = (section: string, subsection: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [subsection]: {
          ...prev[section as keyof typeof prev][subsection as keyof typeof prev[typeof section]],
          [key]: value
        }
      }
    }));
  };

  // Category management functions
  const handleCreateCategory = async () => {
    try {
      console.log('Creating category with form data:', categoryForm);
      const newCategory = await ticketSystemService.createCategory({
        name: categoryForm.name,
        description: categoryForm.description,
        color: categoryForm.color,
        icon: categoryForm.icon || undefined,
        parentId: categoryForm.parentId === 'none' ? undefined : categoryForm.parentId || undefined,
        customFields: { fields: [] },
        autoAssignRules: { rules: [] },
        slaRules: { rules: [] }
      });
      
      console.log('Category created successfully:', newCategory);
      setCategories(prev => [...prev, newCategory]);
      setShowCategoryDialog(false);
      setCategoryForm({ name: '', description: '', color: 'blue', icon: '', parentId: 'none' });
      toast.success('Category created successfully');
    } catch (error) {
      console.error('Error creating category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create category';
      toast.error(errorMessage);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    
    try {
      const updatedCategory = await ticketSystemService.updateCategory(editingCategory.id, {
        name: categoryForm.name,
        description: categoryForm.description,
        color: categoryForm.color,
        icon: categoryForm.icon || undefined,
        parentId: categoryForm.parentId === 'none' ? undefined : categoryForm.parentId || undefined
      });
      
      setCategories(prev => prev.map(cat => cat.id === editingCategory.id ? updatedCategory : cat));
      setShowCategoryDialog(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', color: 'blue', icon: '', parentId: 'none' });
      toast.success('Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await ticketSystemService.deleteCategory(categoryId);
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const openCategoryDialog = (category?: TicketCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        color: category.color,
        icon: category.icon || '',
        parentId: category.parentId || 'none'
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', color: 'blue', icon: '', parentId: 'none' });
    }
    setShowCategoryDialog(true);
  };

  // Status management functions
  const openStatusDialog = (status?: TicketStatus) => {
    if (status) {
      setEditingStatus(status);
      setStatusForm({
        name: status.name,
        description: status.description || '',
        color: status.color,
        isClosed: status.isClosed || false,
        isResolved: status.isResolved || false,
        allowedTransitions: status.allowedTransitions?.transitions || [],
        permissions: {
          roles: status.permissions?.roles || [],
          users: status.permissions?.users || []
        }
      });
    } else {
      setEditingStatus(null);
      setStatusForm({
        name: '',
        description: '',
        color: 'blue',
        isClosed: false,
        isResolved: false,
        allowedTransitions: [],
        permissions: { roles: [], users: [] }
      });
    }
    setShowStatusDialog(true);
  };

  const handleCreateStatus = async () => {
    try {
      const newStatus = await ticketSystemService.createStatus({
        name: statusForm.name,
        description: statusForm.description,
        color: statusForm.color,
        isClosed: statusForm.isClosed,
        isResolved: statusForm.isResolved,
        allowedTransitions: {
          transitions: statusForm.allowedTransitions
        },
        permissions: statusForm.permissions
      });
      setStatuses(prev => [...prev, newStatus]);
      setShowStatusDialog(false);
      setStatusForm({
        name: '',
        description: '',
        color: 'blue',
        isClosed: false,
        isResolved: false,
        allowedTransitions: [],
        permissions: { roles: [], users: [] }
      });
      toast.success('Status created successfully');
    } catch (error) {
      console.error('Error creating status:', error);
      toast.error('Failed to create status');
    }
  };

  const handleUpdateStatus = async () => {
    if (!editingStatus) return;
    
    try {
      const updatedStatus = await ticketSystemService.updateStatus(editingStatus.id, {
        name: statusForm.name,
        description: statusForm.description,
        color: statusForm.color,
        isClosed: statusForm.isClosed,
        isResolved: statusForm.isResolved,
        allowedTransitions: {
          transitions: statusForm.allowedTransitions
      },
        permissions: statusForm.permissions
      });
      setStatuses(prev => prev.map(status => status.id === editingStatus.id ? updatedStatus : status));
      setShowStatusDialog(false);
      setEditingStatus(null);
      setStatusForm({
        name: '',
        description: '',
        color: 'blue',
        isClosed: false,
        isResolved: false,
        allowedTransitions: [],
        permissions: { roles: [], users: [] }
      });
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    if (!confirm('Are you sure you want to delete this status? This action cannot be undone.')) {
      return;
    }
    
    try {
      await ticketSystemService.deleteStatus(statusId);
      setStatuses(prev => prev.filter(status => status.id !== statusId));
      toast.success('Status deleted successfully');
    } catch (error) {
      console.error('Error deleting status:', error);
      toast.error('Failed to delete status');
    }
  };

  // Priority management functions
  const openPriorityDialog = (priority?: TicketPriority) => {
    if (priority) {
      setEditingPriority(priority);
      setPriorityForm({
        name: priority.name,
        description: priority.description || '',
        color: priority.color,
        level: priority.level || 1,
        slaHours: priority.slaResponseHours || 24,
        escalationRules: priority.escalationRules || { rules: [] }
      });
    } else {
      setEditingPriority(null);
      const nextLevel = getNextAvailableLevel(priorities);
      setPriorityForm({
        name: '',
        description: '',
        color: 'blue',
        level: nextLevel,
        slaHours: 24,
        escalationRules: { rules: [] }
      });
    }
    setShowPriorityDialog(true);
  };

  const handleCreatePriority = async () => {
    try {
      const priorityData = {
        name: priorityForm.name,
        description: priorityForm.description,
        color: priorityForm.color,
        level: priorityForm.level,
        slaResponseHours: priorityForm.slaHours,
        slaResolveHours: priorityForm.slaHours * 3, // Resolution is typically 3x response time
        escalationRules: priorityForm.escalationRules
      };
      
      console.log('Creating priority with data:', priorityData);
      const newPriority = await ticketSystemService.createPriority(priorityData);
      setPriorities(prev => [...prev, newPriority]);
      setShowPriorityDialog(false);
      setPriorityForm({
        name: '',
        description: '',
        color: 'blue',
        level: getNextAvailableLevel([...priorities, newPriority]),
        slaHours: 24,
        escalationRules: { rules: [] }
      });
      toast.success('Priority created successfully');
    } catch (error) {
      console.error('Error creating priority:', error);
      toast.error('Failed to create priority');
    }
  };

  const handleUpdatePriority = async () => {
    if (!editingPriority) return;
    
    try {
      const updatedPriority = await ticketSystemService.updatePriority(editingPriority.id, {
        name: priorityForm.name,
        description: priorityForm.description,
        color: priorityForm.color,
        level: priorityForm.level,
        slaResponseHours: priorityForm.slaHours,
        slaResolveHours: priorityForm.slaHours * 3, // Resolution is typically 3x response time
        escalationRules: priorityForm.escalationRules
      });
      setPriorities(prev => prev.map(priority => priority.id === editingPriority.id ? updatedPriority : priority));
      setShowPriorityDialog(false);
      setEditingPriority(null);
      setPriorityForm({
        name: '',
        description: '',
        color: 'blue',
        level: getNextAvailableLevel(priorities),
        slaHours: 24,
        escalationRules: { rules: [] }
      });
      toast.success('Priority updated successfully');
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const handleDeletePriority = async (priorityId: string) => {
    if (!confirm('Are you sure you want to delete this priority? This action cannot be undone.')) {
      return;
    }
    
    try {
      await ticketSystemService.deletePriority(priorityId);
      setPriorities(prev => prev.filter(priority => priority.id !== priorityId));
      toast.success('Priority deleted successfully');
    } catch (error) {
      console.error('Error deleting priority:', error);
      toast.error('Failed to delete priority');
    }
  };

  const getStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Save className="h-4 w-4" />;
    }
  };

  const getStatusColorClasses = (color: string) => {
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
      case 'gray':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColorClasses = (color: string) => {
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
      case 'gray':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'success':
        return 'Settings saved successfully!';
      case 'error':
        return 'Error saving settings';
      default:
        return 'Save Changes';
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header with Search */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Settings className="h-8 w-8 text-primary" />
              Settings
            </h1>
            <p className="text-muted-foreground">Configure your ticketing system preferences</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {getStatusIcon()}
            {getStatusText()}
          </Button>
        </div>
        
        {/* Search Bar and Controls */}
        <div className="flex items-center gap-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Accordion Toggle */}
          <div className="flex items-center gap-2">
            <Label htmlFor="accordion-toggle" className="text-sm font-medium flex items-center gap-2">
              {allAccordionsExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Collapse All
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Expand All
                </>
              )}
              <Badge variant="outline" className="text-xs">
                {expandedSections.length}
              </Badge>
            </Label>
            <Switch
              id="accordion-toggle"
              checked={allAccordionsExpanded}
              onCheckedChange={toggleAllAccordions}
            />
          </div>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Accordion 
            type="multiple" 
            value={expandedSections} 
            onValueChange={setExpandedSections}
            className="space-y-4"
          >
            {/* Company Information */}
            <AccordionItem value="company" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Company Information</h3>
                    <p className="text-sm text-muted-foreground">Configure your company details and branding</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={settings.general.companyName}
                        onChange={(e) => updateSetting('general', 'general', 'companyName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyEmail">Company Email</Label>
                      <Input
                        id="companyEmail"
                        type="email"
                        value={settings.general.companyEmail}
                        onChange={(e) => updateSetting('general', 'general', 'companyEmail', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyPhone">Company Phone</Label>
                      <Input
                        id="companyPhone"
                        value={settings.general.companyPhone}
                        onChange={(e) => updateSetting('general', 'general', 'companyPhone', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select 
                        value={settings.general.timezone}
                        onValueChange={(value) => updateSetting('general', 'general', 'timezone', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                          <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                          <SelectItem value="Europe/London">London (GMT)</SelectItem>
                          <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Company Address</Label>
                    <Textarea
                      id="companyAddress"
                      value={settings.general.companyAddress}
                      onChange={(e) => updateSetting('general', 'general', 'companyAddress', e.target.value)}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* System Preferences */}
            <AccordionItem value="system" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 text-green-600">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">System Preferences</h3>
                    <p className="text-sm text-muted-foreground">Configure system-wide preferences and defaults</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="language">Default Language</Label>
                      <Select 
                        value={settings.general.language}
                        onValueChange={(value) => updateSetting('general', 'general', 'language', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select 
                        value={settings.general.currency}
                        onValueChange={(value) => updateSetting('general', 'general', 'currency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="CAD">CAD (C$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessHours">Business Hours</Label>
                      <div className="flex gap-2">
                        <Input
                          type="time"
                          value={settings.general.businessHours.start}
                          onChange={(e) => updateSetting('general', 'businessHours', 'start', e.target.value)}
                        />
                        <span className="self-center">to</span>
                        <Input
                          type="time"
                          value={settings.general.businessHours.end}
                          onChange={(e) => updateSetting('general', 'businessHours', 'end', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Ticket Settings */}
        <TabsContent value="tickets" className="space-y-6">
          <Accordion 
            type="multiple" 
            value={expandedSections} 
            onValueChange={setExpandedSections}
            className="space-y-4"
          >
            {/* Basic Configuration */}
            <AccordionItem value="categories" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Ticket Categories</h3>
                    <p className="text-sm text-muted-foreground">Manage ticket categories and their properties</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {categories.length} categories
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading categories...</span>
                    </div>
                  ) : (
                    <>
                      {categories.map((category) => (
                        <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant="outline" 
                              className={getCategoryColorClasses(category.color)}
                            >
                              {category.name}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{category.description}</span>
                            {category._count && (
                              <span className="text-xs text-muted-foreground">
                                ({category._count.tickets} tickets)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openCategoryDialog(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => openCategoryDialog()}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Category
                      </Button>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Priority Levels */}
            <AccordionItem value="priorities" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Priority Levels</h3>
                    <p className="text-sm text-muted-foreground">Configure ticket priority levels and SLA targets</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {priorities.length} priorities
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading priorities...</span>
                    </div>
                  ) : (
                    <>
                      {priorities.map((priority) => (
                        <div key={priority.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant="outline" 
                              className={getPriorityColorClasses(priority.color)}
                            >
                              {priority.name}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {priority.description || 'No description'}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                Level {priority.level}
                              </Badge>
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                                SLA: {priority.slaHours}h
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openPriorityDialog(priority)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeletePriority(priority.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => openPriorityDialog()}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Priority
                      </Button>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Ticket Statuses */}
            <AccordionItem value="statuses" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Ticket Statuses</h3>
                    <p className="text-sm text-muted-foreground">Manage ticket status workflow and transitions</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {statuses.length} statuses
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading statuses...</span>
                    </div>
                  ) : (
                    <>
                      {statuses.map((status) => (
                        <div key={status.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant="outline" 
                              className={getStatusColorClasses(status.color)}
                            >
                              {status.name}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {status.description || 'No description'}
                            </span>
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
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openStatusDialog(status)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteStatus(status.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => openStatusDialog()}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Status
                      </Button>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Workflow Visualizations */}
            <AccordionItem value="workflows" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Workflow Visualizations</h3>
                    <p className="text-sm text-muted-foreground">Visual representation of ticket workflows</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6">
                  {/* Priority Workflow Visualization */}
                  {priorities.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        Priority Escalation Flow
                      </h4>
                      <PriorityWorkflow priorities={priorities} />
                    </div>
                  )}

                  {/* Status Workflow Visualization */}
                  {statuses.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        Status Transition Flow
                      </h4>
                      <TicketStatusWorkflow statuses={statuses} />
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* User Settings */}
        <TabsContent value="users" className="space-y-6">
          <Accordion 
            type="multiple" 
            value={expandedSections} 
            onValueChange={setExpandedSections}
            className="space-y-4"
          >
            {/* User Roles & Permissions */}
            <AccordionItem value="roles" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 text-green-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">User Roles & Permissions</h3>
                    <p className="text-sm text-muted-foreground">Define user roles and their permissions</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {settings.users.roles.length} roles
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  {settings.users.roles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{role.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Permissions: {role.permissions.join(', ')}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full">Add New Role</Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Departments */}
            <AccordionItem value="departments" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Departments</h3>
                    <p className="text-sm text-muted-foreground">Organize users into departments</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {settings.users.departments.length} departments
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  {settings.users.departments.map((dept) => (
                    <div key={dept.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{dept.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Manager: {dept.manager}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full">Add New Department</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Accordion 
            type="multiple" 
            value={expandedSections} 
            onValueChange={setExpandedSections}
            className="space-y-4"
          >
            {/* Email Notifications */}
            <AccordionItem value="email" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">Configure email notification preferences</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {settings.notifications.email.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emailEnabled">Enable Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send notifications via email
                      </p>
                    </div>
                    <Switch
                      id="emailEnabled"
                      checked={settings.notifications.email.enabled}
                      onCheckedChange={(checked) => updateSetting('notifications', 'email', 'enabled', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ticketCreated">Ticket Created</Label>
                      <Switch
                        id="ticketCreated"
                        checked={settings.notifications.email.ticketCreated}
                        onCheckedChange={(checked) => updateSetting('notifications', 'email', 'ticketCreated', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ticketUpdated">Ticket Updated</Label>
                      <Switch
                        id="ticketUpdated"
                        checked={settings.notifications.email.ticketUpdated}
                        onCheckedChange={(checked) => updateSetting('notifications', 'email', 'ticketUpdated', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ticketResolved">Ticket Resolved</Label>
                      <Switch
                        id="ticketResolved"
                        checked={settings.notifications.email.ticketResolved}
                        onCheckedChange={(checked) => updateSetting('notifications', 'email', 'ticketResolved', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="slaBreach">SLA Breach Alert</Label>
                      <Switch
                        id="slaBreach"
                        checked={settings.notifications.email.slaBreach}
                        onCheckedChange={(checked) => updateSetting('notifications', 'email', 'slaBreach', checked)}
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* In-App Notifications */}
            <AccordionItem value="inapp" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">In-App Notifications</h3>
                    <p className="text-sm text-muted-foreground">Configure in-app notification preferences</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {settings.notifications.inApp.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="inAppEnabled">Enable In-App Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Show notifications within the application
                      </p>
                    </div>
                    <Switch
                      id="inAppEnabled"
                      checked={settings.notifications.inApp.enabled}
                      onCheckedChange={(checked) => updateSetting('notifications', 'inApp', 'enabled', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ticketAssigned">Ticket Assigned</Label>
                      <Switch
                        id="ticketAssigned"
                        checked={settings.notifications.inApp.ticketAssigned}
                        onCheckedChange={(checked) => updateSetting('notifications', 'inApp', 'ticketAssigned', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ticketEscalated">Ticket Escalated</Label>
                      <Switch
                        id="ticketEscalated"
                        checked={settings.notifications.inApp.ticketEscalated}
                        onCheckedChange={(checked) => updateSetting('notifications', 'inApp', 'ticketEscalated', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="newComment">New Comment</Label>
                      <Switch
                        id="newComment"
                        checked={settings.notifications.inApp.newComment}
                        onCheckedChange={(checked) => updateSetting('notifications', 'inApp', 'newComment', checked)}
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
      </Tabs>

      {/* Category Management Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update the category details below.' : 'Add a new ticket category to organize your tickets.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Name *</Label>
              <Input
                id="categoryName"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Hardware, Software, Network"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryDescription">Description</Label>
              <Textarea
                id="categoryDescription"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this category"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryColor">Color</Label>
                <Select 
                  value={categoryForm.color}
                  onValueChange={(value) => setCategoryForm(prev => ({ ...prev, color: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="yellow">Yellow</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                    <SelectItem value="gray">Gray</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryIcon">Icon</Label>
                <Input
                  id="categoryIcon"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, icon: e.target.value }))}
                  placeholder="e.g., laptop, server, wifi"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentCategory">Parent Category (Optional)</Label>
              <Select 
                value={categoryForm.parentId}
                onValueChange={(value) => setCategoryForm(prev => ({ ...prev, parentId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.filter(cat => !cat.parentId).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCategoryDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
              disabled={!categoryForm.name.trim()}
            >
              {editingCategory ? 'Update' : 'Create'} Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

             {/* Status Management Dialog */}
       <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
         <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
           <DialogHeader className="flex-shrink-0">
             <DialogTitle>
               {editingStatus ? 'Edit Status' : 'Create New Status'}
             </DialogTitle>
             <DialogDescription>
               {editingStatus ? 'Update the status details below.' : 'Add a new ticket status to define your workflow.'}
             </DialogDescription>
           </DialogHeader>
           <div className="flex-1 overflow-y-auto space-y-4 px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="statusName">Name *</Label>
                <Input
                  id="statusName"
                  value={statusForm.name}
                  onChange={(e) => setStatusForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Open, In Progress, Resolved"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusColor">Color</Label>
                <Select 
                  value={statusForm.color}
                  onValueChange={(value) => setStatusForm(prev => ({ ...prev, color: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="yellow">Yellow</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                    <SelectItem value="gray">Gray</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="statusDescription">Description</Label>
              <Textarea
                id="statusDescription"
                value={statusForm.description}
                onChange={(e) => setStatusForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this status"
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Status Properties</Label>
              <div className="flex items-center gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-closed"
                    checked={statusForm.isClosed}
                    onCheckedChange={(checked) => setStatusForm(prev => ({ ...prev, isClosed: checked }))}
                  />
                  <Label htmlFor="is-closed">Closes ticket</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-resolved"
                    checked={statusForm.isResolved}
                    onCheckedChange={(checked) => setStatusForm(prev => ({ ...prev, isResolved: checked }))}
                  />
                  <Label htmlFor="is-resolved">Resolves ticket</Label>
                </div>
              </div>
            </div>

                         <div className="space-y-3">
               <Label className="text-sm font-medium">Allowed Transitions</Label>
               <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto border rounded p-2 bg-muted/30">
                 {statuses.map((status) => (
                   <div key={status.id} className="flex items-center space-x-2">
                     <input
                       type="checkbox"
                       id={`transition-${status.id}`}
                       checked={statusForm.allowedTransitions.includes(status.id)}
                       onChange={(e) => {
                         if (e.target.checked) {
                           setStatusForm(prev => ({
                             ...prev,
                             allowedTransitions: [...prev.allowedTransitions, status.id]
                           }));
                         } else {
                           setStatusForm(prev => ({
                             ...prev,
                             allowedTransitions: prev.allowedTransitions.filter(id => id !== status.id)
                           }));
                         }
                       }}
                       className="rounded border-gray-300 h-3 w-3"
                     />
                     <Label htmlFor={`transition-${status.id}`} className="text-xs">
                       {status.name}
                     </Label>
                   </div>
                 ))}
               </div>
             </div>

                         <div className="space-y-3">
               <Label className="text-sm font-medium">Permissions</Label>
               <div className="space-y-2">
                 <Label htmlFor="statusRoles" className="text-xs">Roles</Label>
                 <Select 
                   value=""
                   onValueChange={(value) => {
                     if (value && !statusForm.permissions.roles.includes(value)) {
                       setStatusForm(prev => ({
                         ...prev,
                         permissions: {
                           ...prev.permissions,
                           roles: [...prev.permissions.roles, value]
                         }
                       }));
                     }
                   }}
                 >
                   <SelectTrigger className="h-8">
                     <SelectValue placeholder="Add role permission" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="admin">Admin</SelectItem>
                     <SelectItem value="manager">Manager</SelectItem>
                     <SelectItem value="agent">Agent</SelectItem>
                     <SelectItem value="user">User</SelectItem>
                   </SelectContent>
                 </Select>
                 <div className="flex flex-wrap gap-1">
                   {statusForm.permissions.roles.map((role) => (
                     <Badge key={role} variant="outline" className="text-xs">
                       {role}
                       <button
                         type="button"
                         onClick={() => setStatusForm(prev => ({
                           ...prev,
                           permissions: {
                             ...prev.permissions,
                             roles: prev.permissions.roles.filter(r => r !== role)
                           }
                         }))}
                         className="ml-1 text-red-500 hover:text-red-700"
                       >
                         ×
                       </button>
                     </Badge>
                   ))}
                 </div>
               </div>
             </div>
                     </div>
           <DialogFooter className="flex-shrink-0 border-t pt-4">
             <Button 
               variant="outline" 
               onClick={() => setShowStatusDialog(false)}
             >
               Cancel
             </Button>
             <Button 
               onClick={editingStatus ? handleUpdateStatus : handleCreateStatus}
               disabled={!statusForm.name.trim()}
             >
               {editingStatus ? 'Update' : 'Create'} Status
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Priority Management Dialog */}
       <Dialog open={showPriorityDialog} onOpenChange={setShowPriorityDialog}>
         <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
           <DialogHeader className="flex-shrink-0">
             <DialogTitle>
               {editingPriority ? 'Edit Priority' : 'Create New Priority'}
             </DialogTitle>
             <DialogDescription>
               {editingPriority ? 'Update the priority details below.' : 'Add a new ticket priority level with SLA configuration.'}
             </DialogDescription>
           </DialogHeader>
           <div className="flex-1 overflow-y-auto space-y-4 px-1">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="priorityName">Name *</Label>
                 <Input
                   id="priorityName"
                   value={priorityForm.name}
                   onChange={(e) => setPriorityForm(prev => ({ ...prev, name: e.target.value }))}
                   placeholder="e.g., Low, Medium, High, Critical"
                   required
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="priorityColor">Color</Label>
                 <Select 
                   value={priorityForm.color}
                   onValueChange={(value) => setPriorityForm(prev => ({ ...prev, color: value }))}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="blue">Blue</SelectItem>
                     <SelectItem value="green">Green</SelectItem>
                     <SelectItem value="red">Red</SelectItem>
                     <SelectItem value="yellow">Yellow</SelectItem>
                     <SelectItem value="orange">Orange</SelectItem>
                     <SelectItem value="purple">Purple</SelectItem>
                     <SelectItem value="gray">Gray</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
             
             <div className="space-y-2">
               <Label htmlFor="priorityDescription">Description</Label>
               <Textarea
                 id="priorityDescription"
                 value={priorityForm.description}
                 onChange={(e) => setPriorityForm(prev => ({ ...prev, description: e.target.value }))}
                 placeholder="Brief description of this priority level"
                 rows={3}
               />
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="priorityLevel">Priority Level</Label>
                 <Select 
                   value={priorityForm.level.toString()}
                   onValueChange={(value) => setPriorityForm(prev => ({ ...prev, level: parseInt(value) }))}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
                       const isTaken = priorities.some(p => p.level === level && (!editingPriority || p.id !== editingPriority.id));
                       const levelNames = ['Lowest', 'Low', 'Medium', 'High', 'Critical', 'Urgent', 'Emergency', 'Critical+', 'Emergency+', 'Maximum'];
                       return (
                         <SelectItem 
                           key={level} 
                           value={level.toString()}
                           disabled={isTaken}
                         >
                           {level} - {levelNames[level - 1]} {isTaken ? '(Taken)' : ''}
                         </SelectItem>
                       );
                     })}
                   </SelectContent>
                 </Select>
                 {priorities.length > 0 && (
                   <p className="text-xs text-muted-foreground">
                     Available levels: {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                       .filter(level => !priorities.some(p => p.level === level && (!editingPriority || p.id !== editingPriority.id)))
                       .join(', ')}
                   </p>
                 )}
               </div>
               <div className="space-y-2">
                 <Label htmlFor="slaHours">SLA Response Hours</Label>
                 <Input
                   id="slaHours"
                   type="number"
                   min="1"
                   max="8760"
                   value={priorityForm.slaHours}
                   onChange={(e) => setPriorityForm(prev => ({ ...prev, slaHours: parseInt(e.target.value) || 24 }))}
                   placeholder="24"
                 />
                 <p className="text-xs text-muted-foreground">
                   Response time in hours (Resolution will be 3x this value)
                 </p>
               </div>
             </div>

             <div className="space-y-3">
               <Label className="text-sm font-medium">Escalation Rules</Label>
               <div className="p-3 border rounded bg-muted/30">
                 <div className="space-y-2">
                   <div className="flex items-center gap-2">
                     <input
                       type="checkbox"
                       id="escalateAfterSLA"
                       className="rounded border-gray-300 h-4 w-4"
                     />
                     <Label htmlFor="escalateAfterSLA" className="text-sm">
                       Escalate to manager after SLA breach
                     </Label>
                   </div>
                   <div className="flex items-center gap-2">
                     <input
                       type="checkbox"
                       id="escalateAfterHours"
                       className="rounded border-gray-300 h-4 w-4"
                     />
                     <Label htmlFor="escalateAfterHours" className="text-sm">
                       Escalate after {Math.floor(priorityForm.slaHours * 0.8)} hours (80% of SLA)
                     </Label>
                   </div>
                 </div>
               </div>
             </div>

             <div className="space-y-3">
               <Label className="text-sm font-medium">Auto-Assignment Rules</Label>
               <div className="p-3 border rounded bg-muted/30">
                 <div className="space-y-2">
                   <div className="flex items-center gap-2">
                     <input
                       type="checkbox"
                       id="autoAssignByCategory"
                       className="rounded border-gray-300 h-4 w-4"
                     />
                     <Label htmlFor="autoAssignByCategory" className="text-sm">
                       Auto-assign based on ticket category
                     </Label>
                   </div>
                   <div className="flex items-center gap-2">
                     <input
                       type="checkbox"
                       id="autoAssignByWorkload"
                       className="rounded border-gray-300 h-4 w-4"
                     />
                     <Label htmlFor="autoAssignByWorkload" className="text-sm">
                       Auto-assign to agent with lowest workload
                     </Label>
                   </div>
                 </div>
               </div>
             </div>
           </div>
           <DialogFooter className="flex-shrink-0 border-t pt-4">
             <Button 
               variant="outline" 
               onClick={() => setShowPriorityDialog(false)}
             >
               Cancel
             </Button>
             <Button 
               onClick={editingPriority ? handleUpdatePriority : handleCreatePriority}
               disabled={!priorityForm.name.trim()}
             >
               {editingPriority ? 'Update' : 'Create'} Priority
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 }
