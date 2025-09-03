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
  Info
} from 'lucide-react';
import { settingsService, type SystemSettings } from '@/lib/settingsService';
import { ticketSystemService, type TicketCategory, type TicketPriority, type TicketStatus } from '@/lib/services/ticketSystemService';
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

  // Get the current tab from URL params, default to 'general'
  const currentTab = searchParams.get('tab') || 'general';

  // Load settings on component mount
  useEffect(() => {
    setSettings(settingsService.getSettings());
    loadTicketSystemData();
    
    // Log current user info for debugging
    const currentUser = AuthService.getCurrentUser();
    console.log('Current user:', currentUser);
    console.log('User role:', currentUser?.role);
  }, []);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Configure your company details and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                System Preferences
              </CardTitle>
              <CardDescription>
                Configure system-wide preferences and defaults
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ticket Settings */}
        <TabsContent value="tickets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Ticket Categories
              </CardTitle>
              <CardDescription>
                Manage ticket categories and their properties
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Priority Levels</CardTitle>
              <CardDescription>
                Configure ticket priority levels and SLA targets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                                 {settings.tickets.priorities.map((priority) => (
                   <div key={priority.id} className="flex items-center justify-between p-3 border rounded-lg">
                     <div className="flex items-center gap-3">
                                               <Badge className={`${priority.bgColor} ${priority.textColor} ${priority.borderColor}`}>
                          {priority.name}
                        </Badge>
                       <span className="text-sm text-muted-foreground">
                         SLA: {priority.slaHours} hours
                       </span>
                     </div>
                     <Button variant="outline" size="sm">Edit</Button>
                   </div>
                 ))}
                <Button variant="outline" className="w-full">Add New Priority</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ticket Statuses</CardTitle>
              <CardDescription>
                Manage ticket status workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                                 {settings.tickets.statuses.map((status) => (
                   <div key={status.id} className="flex items-center justify-between p-3 border rounded-lg">
                     <div className="flex items-center gap-3">
                       <Badge className={`${status.bgColor} ${status.textColor} ${status.borderColor}`}>
                         {status.name}
                       </Badge>
                     </div>
                     <Button variant="outline" size="sm">Edit</Button>
                   </div>
                 ))}
                <Button variant="outline" className="w-full">Add New Status</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Settings */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Roles & Permissions
              </CardTitle>
              <CardDescription>
                Define user roles and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Departments</CardTitle>
              <CardDescription>
                Organize users into departments
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Configure email notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                In-App Notifications
              </CardTitle>
              <CardDescription>
                Configure in-app notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
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
    </div>
  );
}
