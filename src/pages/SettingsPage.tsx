import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Download,
  Plus,
  Edit,
  Trash2,
  Workflow,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
  Key,
  Lock
} from 'lucide-react';
import { DepartmentSettings } from '@/components/DepartmentSettings';
import { MenuManagement } from '@/components/MenuManagement';
import * as LucideIcons from 'lucide-react';
import { settingsService, type SystemSettings } from '@/lib/settingsService';
import { settingsApi } from '@/lib/services/settingsApi';
import { buildApiUrl, apiClient } from '@/lib/api';
import { ticketSystemService, type TicketCategory, type TicketPriority, type TicketStatus } from '@/lib/services/ticketSystemService';
import { TicketStatusWorkflow } from '@/components/TicketStatusWorkflow';
import { PriorityWorkflow } from '@/components/PriorityWorkflow';
import { AuthService } from '@/lib/services/authService';
import { toast } from 'sonner';
import { roleService, type Role } from '@/lib/services/roleService';
import { permissionService, type Permission } from '@/lib/services/permissionService';
import { policyService, type AccessPolicy } from '@/lib/services/policyService';
import { UserService, type User as AppUser } from '@/lib/services/userService';
import { menuService } from '@/lib/services/menuService';
import { DepartmentService } from '@/lib/services/departmentService';
import AssignmentRulesManager from '@/components/AssignmentRulesManager';

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [settings, setSettings] = useState<SystemSettings>(settingsService.getSettings());
  // const [serverSettings, setServerSettings] = useState<SystemSettingsDto | null>(null);
  // v2 generic namespaces
  const [branding, setBranding] = useState<{ appName: string; logoUrl?: string | null }>({ appName: 'TicketHub', logoUrl: null });
  const [companyNs, setCompanyNs] = useState<{ name: string; email: string; phone: string; address: string; timezone: string; language: string; currency: string; businessHours: { start: string; end: string; timezone?: string }; logoUrl?: string | null }>({ name: '', email: '', phone: '', address: '', timezone: 'UTC', language: 'en', currency: 'USD', businessHours: { start: '09:00', end: '17:00', timezone: 'UTC' }, logoUrl: null });
  const [smtp, setSmtp] = useState<{ host: string; port: number; secure: boolean; fromAddress: string; user: string; password: string }>({ host: '', port: 587, secure: false, fromAddress: '', user: '', password: '' });
  const [inbound, setInbound] = useState<{ imapHost: string; imapPort: number; imapSecure: boolean; imapUser: string; imapPassword: string; folder: string; moveOnSuccessFolder: string; moveOnErrorFolder: string }>(
    { imapHost: '', imapPort: 993, imapSecure: true, imapUser: '', imapPassword: '', folder: 'INBOX', moveOnSuccessFolder: 'Processed', moveOnErrorFolder: 'Errors' }
  );
  const [taskStatuses, setTaskStatuses] = useState<Array<{ id?: string; key: string; name: string; color?: string; sortOrder?: number }>>([]);
  const [taskPriorities, setTaskPriorities] = useState<Array<{ id?: string; key: string; name: string; color?: string; level?: number; sortOrder?: number }>>([]);
  const [taskMetaLoading, setTaskMetaLoading] = useState(false);

  // Task meta CRUD dialog state
  const [showTaskStatusDialog, setShowTaskStatusDialog] = useState(false);
  const [editingTaskStatus, setEditingTaskStatus] = useState<{ id?: string } | null>(null);
  const [taskStatusForm, setTaskStatusForm] = useState<{ key: string; name: string; color: string; sortOrder?: number }>({ key: '', name: '', color: 'blue', sortOrder: undefined });

  const [showTaskPriorityDialog, setShowTaskPriorityDialog] = useState(false);
  const [editingTaskPriority, setEditingTaskPriority] = useState<{ id?: string } | null>(null);
  const [taskPriorityForm, setTaskPriorityForm] = useState<{ key: string; name: string; color: string; level: number; sortOrder?: number }>({ key: '', name: '', color: 'yellow', level: 0, sortOrder: undefined });

  const fetchTaskMeta = async () => {
    try {
      setTaskMetaLoading(true);
      const [metaStatuses, metaPriorities] = await Promise.all([
        apiClient.get('/api/tasks/meta/statuses'),
        apiClient.get('/api/tasks/meta/priorities')
      ]);
      if (metaStatuses.success) setTaskStatuses((metaStatuses.data as any) || []);
      if (metaPriorities.success) setTaskPriorities((metaPriorities.data as any) || []);
    } catch {
      // ignore fetch errors here; UI will allow adding new
    } finally {
      setTaskMetaLoading(false);
    }
  };

  const saveTaskStatus = async () => {
    try {
      if (editingTaskStatus?.id) {
        const res = await apiClient.put(`/api/tasks/meta/statuses/${editingTaskStatus.id}`, taskStatusForm);
        if (!res.success) throw new Error(res.error || 'Failed');
      } else {
        const res = await apiClient.post(`/api/tasks/meta/statuses`, taskStatusForm);
        if (!res.success) throw new Error(res.error || 'Failed');
      }
      toast.success('Task status saved');
      setShowTaskStatusDialog(false);
      setEditingTaskStatus(null);
      void fetchTaskMeta();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save status');
    }
  };

  const saveTaskPriority = async () => {
    try {
      if (editingTaskPriority?.id) {
        const res = await apiClient.put(`/api/tasks/meta/priorities/${editingTaskPriority.id}`, taskPriorityForm);
        if (!res.success) throw new Error(res.error || 'Failed');
      } else {
        const res = await apiClient.post(`/api/tasks/meta/priorities`, taskPriorityForm);
        if (!res.success) throw new Error(res.error || 'Failed');
      }
      toast.success('Task priority saved');
      setShowTaskPriorityDialog(false);
      setEditingTaskPriority(null);
      void fetchTaskMeta();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save priority');
    }
  };
  // App logo staging (save on Save Preferences)
  const [brandingLogoFile, setBrandingLogoFile] = useState<File | null>(null);
  const [brandingLogoPreviewUrl, setBrandingLogoPreviewUrl] = useState<string | null>(null);
  // Company logo staging
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoPreviewUrl, setCompanyLogoPreviewUrl] = useState<string | null>(null);
  const [notifyNs, setNotifyNs] = useState<{ emailEnabled: boolean; inAppEnabled: boolean; pushEnabled: boolean; frequency: string }>({ emailEnabled: true, inAppEnabled: true, pushEnabled: false, frequency: 'immediate' });
  const [googleAuth, setGoogleAuth] = useState<{ enabled: boolean; redirectUri: string; clientId: string; clientSecret: string }>({ enabled: false, redirectUri: '', clientId: '', clientSecret: '' });
  const [logoUploading, setLogoUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  
  // Ticket system state
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [priorities, setPriorities] = useState<TicketPriority[]>([]);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // RBAC/ABAC state
  const [rbacLoading, setRbacLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  // Menu and Department counts
  const [menuItemsCount, setMenuItemsCount] = useState(0);
  const [departmentsCount, setDepartmentsCount] = useState(0);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  // const [userRolesTableLoading, setUserRolesTableLoading] = useState(false);
  // const [userRoleRows, setUserRoleRows] = useState<Array<{ user: AppUser; roles: Array<{ id: string; name: string; isPrimary?: boolean }> }>>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<AccessPolicy | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [permissionForm, setPermissionForm] = useState({ key: '', description: '' });
  const [policyForm, setPolicyForm] = useState({
    name: '',
    description: '',
    effect: 'ALLOW' as 'ALLOW' | 'DENY',
    subjectType: 'ROLE' as 'ROLE' | 'USER' | 'DEPARTMENT',
    subjectId: '',
    resource: '',
    action: '',
    conditionsText: '{\n  \n}'
  });
  // Role assignment dialog state
  const [showAssignRoleDialog, setShowAssignRoleDialog] = useState(false);
  const [assignRole, setAssignRole] = useState<Role | null>(null);
  const [assignUsers, setAssignUsers] = useState<AppUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignPrimary, setAssignPrimary] = useState(false);
  
  // Category management state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TicketCategory | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
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
  type StatusForm = {
    name: string;
    description: string;
    color: string;
    isClosed: boolean;
    isResolved: boolean;
    allowedTransitions: string[];
    permissions: { roles: string[]; users: string[] };
  };

  const [statusForm, setStatusForm] = useState<StatusForm>({
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

  // Template management state
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [useJsonEditor, setUseJsonEditor] = useState(false);
  const [customFieldsList, setCustomFieldsList] = useState<{ name: string; value: string }[]>([]);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    categoryId: '',
    title: '',
    // Note: backend currently maps `description` to both meta and templateDescription
    // We'll collect a single description for now
    description: '',
    customFieldsText: '{\n  \n}'
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
    // Load generic namespaces
    (async () => {
      const res = await settingsApi.getNamespaces(['branding','company','email.smtp','email.inbound','notifications','auth.google']);
      if (res.success && res.data) {
        const b = res.data['branding'] || {};
        setBranding({ appName: b.appName || b.name || 'TicketHub', logoUrl: b.logoUrl || null });
        const c = res.data['company'] || {};
        setCompanyNs({
          name: c.name || '', email: c.email || '', phone: c.phone || '', address: c.address || '',
          timezone: c.timezone || 'UTC', language: c.language || 'en', currency: c.currency || 'USD',
          businessHours: c.businessHours || { start: '09:00', end: '17:00', timezone: c.timezone || 'UTC' },
          logoUrl: c.logoUrl || null
        });
        const s = res.data['email.smtp'] || {};
        setSmtp({ host: s.host || '', port: Number(s.port ?? 587), secure: !!s.secure, fromAddress: s.fromAddress || '', user: s.user || '', password: s.password || '' });
        const n = res.data['notifications'] || {};
        setNotifyNs({ emailEnabled: !!n.emailEnabled, inAppEnabled: !!n.inAppEnabled, pushEnabled: !!n.pushEnabled, frequency: n.frequency || 'immediate' });
        const ib = res.data['email.inbound'] || {};
        setInbound({
          imapHost: ib.imapHost || '', imapPort: Number(ib.imapPort ?? 993), imapSecure: !!ib.imapSecure,
          imapUser: ib.imapUser || '', imapPassword: ib.imapPassword || '', folder: ib.folder || 'INBOX',
          moveOnSuccessFolder: ib.moveOnSuccessFolder || 'Processed', moveOnErrorFolder: ib.moveOnErrorFolder || 'Errors'
        });
        const ts = res.data['tasks'] || {};
        setSettings(prev => ({ ...(prev as any), tasks: ts } as any));

        // Preload task meta
        void fetchTaskMeta();
        const g = res.data['auth.google'] || {};
        setGoogleAuth({ enabled: !!g.enabled, redirectUri: g.redirectUri || '', clientId: g.clientId || '', clientSecret: g.clientSecret || '' });
      }
    })();
    loadTicketSystemData();
    loadRbacAbac();
    
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

  // Search: auto-switch tab and expand matching sections; scroll to first match
  useEffect(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return;

    const index: Record<string, Record<string, string[]>> = {
      general: {
        company: ['company', 'address', 'phone', 'timezone', 'company logo', 'logo'],
        system: ['system', 'language', 'currency', 'business hours', 'app name', 'app logo', 'branding', 'brand']
      },
      tickets: {
        categories: ['category', 'categories'],
        priorities: ['priority', 'priorities', 'sla'],
        statuses: ['status', 'statuses'],
        workflows: ['workflow', 'workflows', 'automation']
      },
      users: {
        roles: ['role', 'roles', 'rbac'],
        departments: ['department', 'departments']
      },
      notifications: {
        smtp: ['smtp', 'mail', 'email server', 'from address', 'port', 'tls', 'ssl'],
        email: ['email', 'notification', 'notifications'],
        inapp: ['in-app', 'inapp', 'in app']
      }
    } as any;

    let bestTab: string | null = null;
    let matches: string[] = [];
    (Object.keys(index) as string[]).forEach((tab) => {
      const sections = index[tab];
      const matched = Object.entries(sections)
        .filter(([_, keywords]) => keywords.some((w) => w.includes(q) || q.includes(w)))
        .map(([sec]) => sec);
      if (!bestTab && matched.length > 0) {
        bestTab = tab;
        matches = matched;
      }
    });

    if (bestTab) {
      if (bestTab === 'general') setSearchParams({}); else setSearchParams({ tab: bestTab });
      setExpandedSections(matches);
      // Scroll to first match after render
      setTimeout(() => {
        const first = matches[0];
        const el = document.querySelector(`[data-section="${first}"]`);
        if (el && 'scrollIntoView' in el) {
          (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  }, [searchQuery]);

  const loadTicketSystemData = async () => {
    try {
      setLoading(true);
      console.log('Loading ticket system data...');
      const [categoriesData, prioritiesData, statusesData, templatesData] = await Promise.all([
        ticketSystemService.getCategories(),
        ticketSystemService.getPriorities(),
        ticketSystemService.getStatuses(),
        ticketSystemService.getTemplates()
      ]);
      console.log('Categories loaded:', categoriesData);
      console.log('Priorities loaded:', prioritiesData);
      console.log('Statuses loaded:', statusesData);
      setCategories(categoriesData);
      setPriorities(prioritiesData);
      setStatuses(statusesData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading ticket system data:', error);
      toast.error('Failed to load ticket system data');
    } finally {
      setLoading(false);
    }
  };

  const loadRbacAbac = async () => {
    try {
      setRbacLoading(true);
      const [r, p, ap, menuItems, departments] = await Promise.all([
        roleService.list().catch(() => []),
        permissionService.list().catch(() => []),
        policyService.list().catch(() => []),
        menuService.listItems().catch(() => ({ success: false, data: [] })),
        DepartmentService.getDepartments().catch(() => ({ success: false, data: [] })),
      ]);
      setRoles(r);
      setPermissions(p);
      setPolicies(ap);
      setMenuItemsCount(menuItems.success ? menuItems.data.length : 0);
      setDepartmentsCount(departments.success ? departments.data.length : 0);
    } catch (e) {
      console.error('Error loading RBAC/ABAC:', e);
    } finally {
      setRbacLoading(false);
    }
  };

  // const loadUserRolesTable = async () => {
  //   try {
  //     setUserRolesTableLoading(true);
  //     const res: any = await UserService.getUsers({ limit: 100 });
  //     const users: AppUser[] = (res.data || res) as any;
  //     const rows = users.map((u: any) => ({
  //       user: u,
  //       roles: ((u.roles || []) as any[]).map((ur: any) => ({ id: ur.role.id, name: ur.role.name, isPrimary: ur.isPrimary }))
  //     }));
  //     setUserRoleRows(rows);
  //   } catch (e) {
  //     console.error('Failed to load users for user-roles table', e);
  //   } finally {
  //     setUserRolesTableLoading(false);
  //   }
  // };

  // Handle tab changes
  const handleTabChange = (value: string) => {
    if (value === 'general') {
      setSearchParams({}); // Remove tab param for general
    } else {
      setSearchParams({ tab: value });
    }
    if (value === 'tasks') void fetchTaskMeta();
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
      // Save settings locally
      settingsService.updateSettings(settings);
      // Persist namespaces to backend
      await settingsApi.updateNamespace('branding', { appName: branding.appName });
      await settingsApi.updateNamespace('company', {
        name: companyNs.name, email: companyNs.email, phone: companyNs.phone, address: companyNs.address,
        timezone: companyNs.timezone, language: companyNs.language, currency: companyNs.currency, businessHours: companyNs.businessHours
      });
      
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

  const handleLogoUpload = (file: File) => {
    try {
      setLogoUploading(true);
      // Stage file; upload will happen on Save Preferences
      if (brandingLogoPreviewUrl) {
        try { URL.revokeObjectURL(brandingLogoPreviewUrl); } catch {}
      }
      setBrandingLogoFile(file);
      setBrandingLogoPreviewUrl(URL.createObjectURL(file));
    } finally {
      setLogoUploading(false);
    }
  };

  // Save helpers for namespaces
  // const saveBranding = async () => {
  //   try {
  //     const res = await settingsApi.updateNamespace('branding', { appName: branding.appName });
  //     if (!res.success) throw new Error(res.error || 'Failed to save branding');
  //     toast.success('Branding saved');
  //     try { window.dispatchEvent(new CustomEvent('branding-updated', { detail: { appName: branding.appName, appLogoUrl: branding.logoUrl } })); } catch {}
  //   } catch (e: any) {
  //     toast.error(e?.message || 'Failed to save branding');
  //   }
  // };

  const saveCompany = async () => {
    try {
      const res = await settingsApi.updateNamespace('company', companyNs as any);
      if (!res.success) throw new Error(res.error || 'Failed to save company info');
      toast.success('Company info saved');
      
      // Update browser title with new company name
      if (companyNs.name) {
        const currentTitle = document.title;
        const baseTitle = currentTitle.split(' - ')[0] || 'TicketHub';
        document.title = `${baseTitle} - ${companyNs.name}`;
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save company info');
    }
  };

  const handleCompanyLogoUpload = (file: File) => {
    try {
      setLogoUploading(true);
      if (companyLogoPreviewUrl) { try { URL.revokeObjectURL(companyLogoPreviewUrl); } catch {} }
      setCompanyLogoFile(file);
      setCompanyLogoPreviewUrl(URL.createObjectURL(file));
    } finally {
      setLogoUploading(false);
    }
  };

  const saveSmtp = async () => {
    try {
      const res = await settingsApi.updateNamespace('email.smtp', smtp as any);
      if (!res.success) throw new Error(res.error || 'Failed to save SMTP');
      toast.success('SMTP settings saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save SMTP');
    }
  };

  const saveInbound = async () => {
    try {
      const res = await settingsApi.updateNamespace('email.inbound', inbound as any);
      if (!res.success) throw new Error(res.error || 'Failed to save inbound');
      toast.success('Inbound settings saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save inbound');
    }
  };

  const saveNotifications = async () => {
    try {
      const res = await settingsApi.updateNamespace('notifications', notifyNs as any);
      if (!res.success) throw new Error(res.error || 'Failed to save notifications');
      toast.success('Notification settings saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save notifications');
    }
  };

  const saveGoogle = async () => {
    try {
      const res = await settingsApi.updateNamespace('auth.google', googleAuth as any);
      if (!res.success) throw new Error(res.error || 'Failed to save Google auth');
      toast.success('Google auth settings saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save Google auth');
    }
  };

  const saveSystemPreferences = async () => {
    try {
      let logoUrlToSave = branding.logoUrl || null;
      // Upload staged logo first if present
      if (brandingLogoFile) {
        const resp = await settingsApi.uploadToNamespace('branding','logoUrl', brandingLogoFile);
        if (!resp.success) throw new Error(resp.error || 'Failed to upload app logo');
        logoUrlToSave = (resp.data as any)?.value as string;
      }
      await settingsApi.updateNamespace('branding', { appName: branding.appName, logoUrl: logoUrlToSave });
      let companyLogoUrlToSave = companyNs.logoUrl || null;
      if (companyLogoFile) {
        const resp2 = await settingsApi.uploadToNamespace('company','logoUrl', companyLogoFile);
        if (!resp2.success) throw new Error(resp2.error || 'Failed to upload company logo');
        companyLogoUrlToSave = (resp2.data as any)?.value as string;
      }
      await settingsApi.updateNamespace('company', {
        name: companyNs.name,
        email: companyNs.email,
        phone: companyNs.phone,
        address: companyNs.address,
        timezone: companyNs.timezone,
        language: companyNs.language,
        currency: companyNs.currency,
        businessHours: companyNs.businessHours,
        logoUrl: companyLogoUrlToSave,
      });
      // Update local branding state and notify header
      setBranding(prev => ({ ...prev, logoUrl: logoUrlToSave }));
      if (brandingLogoPreviewUrl) { try { URL.revokeObjectURL(brandingLogoPreviewUrl); } catch {} }
      setBrandingLogoFile(null);
      setBrandingLogoPreviewUrl(null);
      if (companyLogoPreviewUrl) { try { URL.revokeObjectURL(companyLogoPreviewUrl); } catch {} }
      setCompanyLogoFile(null);
      setCompanyLogoPreviewUrl(null);
      try { window.dispatchEvent(new CustomEvent('branding-updated', { detail: { appName: branding.appName, appLogoUrl: logoUrlToSave } })); } catch {}
      
      // Update browser title with new app name
      if (branding.appName) {
        const currentTitle = document.title;
        const parts = currentTitle.split(' - ');
        const pageTitle = parts[0] || 'Settings';
        const companyName = parts[parts.length - 1] || '';
        document.title = `${pageTitle} - ${branding.appName}${companyName ? ` - ${companyName}` : ''}`;
      }
      
      toast.success('Preferences saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save preferences');
    }
  };

  const updateSetting = (section: string, subsection: string, key: string, value: any) => {
    setSettings(prev => {
      const next: any = { ...prev } as any;
      next[section] = { ...(next[section] || {}) };
      next[section][subsection] = { ...(next[section][subsection] || {}) };
      next[section][subsection][key] = value;
      return next as typeof prev;
    });
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
      const raw = (status as any).allowedTransitions;
      const normalized = Array.isArray(raw) ? raw : (raw?.transitions || []);
      setEditingStatus(status);
      setStatusForm({
        name: status.name,
        description: status.description || '',
        color: status.color,
        isClosed: status.isClosed || false,
        isResolved: status.isResolved || false,
        allowedTransitions: normalized,
        permissions: {
          roles: (status as any).permissions?.roles || [],
          users: (status as any).permissions?.users || []
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

  // Templates handlers
  const openTemplateDialog = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name || '',
        categoryId: template.categoryId || '',
        title: template.title || '',
        description: template.templateDescription || template.description || '',
        customFieldsText: template.customFields ? JSON.stringify(template.customFields, null, 2) : '{\n  \n}'
      });
      const entries = template.customFields ? Object.entries(template.customFields) : [];
      setCustomFieldsList(entries.map(([name, value]) => ({ name, value: String(value ?? '') })));
    } else {
      setEditingTemplate(null);
      setTemplateForm({ name: '', categoryId: '', title: '', description: '', customFieldsText: '{\n  \n}' });
      setCustomFieldsList([]);
    }
    setUseJsonEditor(false);
    setShowTemplateDialog(true);
  };

  const handleCreateOrUpdateTemplate = async () => {
    try {
      let parsedCustomFields: Record<string, any> | undefined = undefined;
      const trimmed = templateForm.customFieldsText.trim();
      if (trimmed) {
        try {
          parsedCustomFields = JSON.parse(trimmed);
        } catch (e) {
          toast.error('Custom fields must be valid JSON');
          return;
        }
      }

      if (editingTemplate) {
        const updated = await ticketSystemService.updateTemplate(editingTemplate.id, {
          name: templateForm.name,
          categoryId: templateForm.categoryId,
          title: templateForm.title,
          description: templateForm.description,
          customFields: parsedCustomFields
        } as any);
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? updated : t));
        toast.success('Template updated successfully');
      } else {
        const created = await ticketSystemService.createTemplate({
          name: templateForm.name,
          categoryId: templateForm.categoryId,
          title: templateForm.title,
          description: templateForm.description,
          customFields: parsedCustomFields
        } as any);
        setTemplates(prev => [...prev, created]);
        toast.success('Template created successfully');
      }

      setShowTemplateDialog(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  // Custom fields structured editor helpers
  const syncListToJson = (list: { name: string; value: string }[]) => {
    const obj: Record<string, any> = {};
    list.forEach(({ name, value }) => {
      if (name && name.trim().length > 0) {
        obj[name] = value;
      }
    });
    setTemplateForm(prev => ({ ...prev, customFieldsText: JSON.stringify(obj, null, 2) }));
  };

  const addCustomFieldRow = () => {
    const next = [...customFieldsList, { name: '', value: '' }];
    setCustomFieldsList(next);
    syncListToJson(next);
  };

  const updateCustomFieldRow = (index: number, key: 'name' | 'value', val: string) => {
    const next = customFieldsList.map((row, i) => (i === index ? { ...row, [key]: val } : row));
    setCustomFieldsList(next);
    syncListToJson(next);
  };

  const removeCustomFieldRow = (index: number) => {
    const next = customFieldsList.filter((_, i) => i !== index);
    setCustomFieldsList(next);
    syncListToJson(next);
  };

  return (
    <div className="relative z-0 mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6 lg:pl-[calc(var(--sidebar-width,14rem)+1.5rem)] space-y-6">
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
        <TabsList className="grid w-full grid-cols-6">
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
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="assignment" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignment
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
            <AccordionItem value="company" className="border rounded-lg" data-section="company">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/80 rounded-lg">
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
                  {/* Company Logo */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Logo</Label>
                      <div className="flex items-center gap-3">
                        <img src={companyLogoPreviewUrl || (companyNs.logoUrl ? (companyNs.logoUrl.startsWith('http') ? companyNs.logoUrl : buildApiUrl(companyNs.logoUrl.startsWith('/uploads/') ? companyNs.logoUrl : `/uploads/${companyNs.logoUrl.replace(/^uploads[\\/]/,'')}`)) : (branding.logoUrl ? (branding.logoUrl.startsWith('http') ? branding.logoUrl : buildApiUrl(branding.logoUrl.startsWith('/uploads/') ? branding.logoUrl : `/uploads/${branding.logoUrl.replace(/^uploads[\\/]/,'')}`)) : '/ticket.ico'))} alt="Company Logo" className="h-10 w-10 rounded border" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/ticket.ico'; }} />
                        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCompanyLogoUpload(f); }} disabled={logoUploading} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input id="companyName" defaultValue={companyNs.name} onBlur={(e) => setCompanyNs(prev => ({ ...prev, name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyEmail">Company Email</Label>
                      <Input id="companyEmail" type="email" defaultValue={companyNs.email} onBlur={(e) => setCompanyNs(prev => ({ ...prev, email: e.target.value }))} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyPhone">Company Phone</Label>
                      <Input id="companyPhone" defaultValue={companyNs.phone} onBlur={(e) => setCompanyNs(prev => ({ ...prev, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select 
                        value={companyNs.timezone}
                        onValueChange={(value) => setCompanyNs(prev => ({ ...prev, timezone: value }))}
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
                    <Textarea id="companyAddress" defaultValue={companyNs.address} onBlur={(e) => setCompanyNs(prev => ({ ...prev, address: e.target.value }))} />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" onClick={saveCompany}>Save Company</Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            

            {/* System Preferences */}
            <AccordionItem value="system" className="border rounded-lg" data-section="system">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/80 rounded-lg">
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
                        value={companyNs.language}
                        onValueChange={(value) => setCompanyNs(prev => ({ ...prev, language: value }))}
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
                        value={companyNs.currency}
                        onValueChange={(value) => setCompanyNs(prev => ({ ...prev, currency: value }))}
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
                          value={companyNs.businessHours.start}
                          onChange={(e) => setCompanyNs(prev => ({ ...prev, businessHours: { ...prev.businessHours, start: e.target.value } }))}
                        />
                        <span className="self-center">to</span>
                        <Input
                          type="time"
                          value={companyNs.businessHours.end}
                          onChange={(e) => setCompanyNs(prev => ({ ...prev, businessHours: { ...prev.businessHours, end: e.target.value } }))}
                        />
                      </div>
                    </div>
                  </div>
                  {/* App Branding */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="appName">App Name</Label>
                      <Input id="appName" defaultValue={branding.appName} onBlur={(e) => setBranding(prev => ({ ...prev, appName: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>App Logo</Label>
                      <div className="flex items-center gap-3">
                        <img src={brandingLogoPreviewUrl || (branding.logoUrl ? (branding.logoUrl.startsWith('http') ? branding.logoUrl : buildApiUrl(branding.logoUrl.startsWith('/uploads/') ? branding.logoUrl : `/uploads/${branding.logoUrl.replace(/^uploads[\\/]/,'')}`)) : '/ticket.ico')} alt="App Logo" className="h-10 w-10 rounded border" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/ticket.ico'; }} />
                        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} disabled={logoUploading} />
                        {/* Branding will be saved with Save Preferences */}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" onClick={saveSystemPreferences}>Save Preferences</Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Tasks Settings */}
        <TabsContent value="tasks" className="space-y-6">
          <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections} className="space-y-4">
            <AccordionItem value="tasks-general" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Task Settings</h3>
                    <p className="text-sm text-muted-foreground">Defaults and notifications for tasks</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Default Assignee (user id)</Label>
                    <Input value={(settings as any)?.tasks?.defaultAssignee || ''} onChange={(e) => {
                      const v = e.target.value; setSettings(prev => ({ ...prev, tasks: { ...(prev as any).tasks, defaultAssignee: v } as any } as any));
                    }} placeholder="user id or leave blank" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notify on Assignment</Label>
                    <Switch checked={(settings as any)?.tasks?.notifyOnAssignment ?? true} onCheckedChange={(c) => setSettings(prev => ({ ...prev, tasks: { ...(prev as any).tasks, notifyOnAssignment: !!c } as any } as any))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Notify on Due Soon</Label>
                    <Switch checked={(settings as any)?.tasks?.notifyOnDueSoon ?? true} onCheckedChange={(c) => setSettings(prev => ({ ...prev, tasks: { ...(prev as any).tasks, notifyOnDueSoon: !!c } as any } as any))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Soon Threshold (hours)</Label>
                    <Input type="number" value={(settings as any)?.tasks?.dueSoonThresholdHours ?? 24} onChange={(e) => setSettings(prev => ({ ...prev, tasks: { ...(prev as any).tasks, dueSoonThresholdHours: Number(e.target.value) || 0 } as any } as any))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Blocked Escalation (hours)</Label>
                    <Input type="number" value={(settings as any)?.tasks?.blockedEscalationHours ?? 48} onChange={(e) => setSettings(prev => ({ ...prev, tasks: { ...(prev as any).tasks, blockedEscalationHours: Number(e.target.value) || 0 } as any } as any))} />
                  </div>
                </div>

                {/* Task statuses and priorities are now managed elsewhere. */}
              </AccordionContent>
            </AccordionItem>
            {/* Task Statuses */}
            <AccordionItem value="task-statuses" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Task Statuses</h3>
                    <p className="text-sm text-muted-foreground">Manage status keys, names and colors</p>
                  </div>
                  <Badge variant="outline" className="text-xs ml-auto">{taskStatuses.length} statuses</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-3">
                  {taskMetaLoading && (<div className="text-sm text-muted-foreground">Loading statuses…</div>)}
                  {!taskMetaLoading && taskStatuses.length === 0 && (<div className="text-sm text-muted-foreground">No statuses yet.</div>)}
                  <div className="space-y-2">
                    {taskStatuses.map((s) => (
                      <div key={s.id || s.key} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <Badge className={`${ticketSystemService.getStatusColorClass(s.color || 'blue')} text-xs`}>{s.name || s.key}</Badge>
                          <span className="text-sm text-muted-foreground">{s.color ? s.color : 'No color'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => { setEditingTaskStatus(s); setTaskStatusForm({ key: s.key, name: s.name, color: s.color || 'blue', sortOrder: s.sortOrder }); setShowTaskStatusDialog(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={async () => {
                            try {
                              if (!s.id) return;
                              const res = await apiClient.delete(`/api/tasks/meta/statuses/${s.id}`);
                              if (!res.success) throw new Error(res.error || 'Failed');
                              toast.success('Status deleted');
                              void fetchTaskMeta();
                            } catch (e: any) {
                              toast.error(e?.message || 'Failed to delete status');
                            }
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-end pt-2">
                    <Button size="sm" onClick={() => { setEditingTaskStatus(null); setTaskStatusForm({ key: '', name: '', color: 'blue', sortOrder: undefined }); setShowTaskStatusDialog(true); }}>
                      <Plus className="h-4 w-4 mr-1" /> Add Status
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Task Priorities */}
            <AccordionItem value="task-priorities" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Task Priorities</h3>
                    <p className="text-sm text-muted-foreground">Manage priority levels, names and colors</p>
                  </div>
                  <Badge variant="outline" className="text-xs ml-auto">{taskPriorities.length} priorities</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-3">
                  {taskMetaLoading && (<div className="text-sm text-muted-foreground">Loading priorities…</div>)}
                  {!taskMetaLoading && taskPriorities.length === 0 && (<div className="text-sm text-muted-foreground">No priorities yet.</div>)}
                  <div className="space-y-2">
                    {taskPriorities.map((p) => (
                      <div key={p.id || p.key} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <Badge className={`${ticketSystemService.getPriorityColorClass(p.color || 'yellow')} text-xs`}>{p.name || p.key}</Badge>
                          <span className="text-sm text-muted-foreground">Level {p.level ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => { setEditingTaskPriority(p); setTaskPriorityForm({ key: p.key, name: p.name, color: p.color || 'yellow', level: p.level ?? 0, sortOrder: p.sortOrder }); setShowTaskPriorityDialog(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={async () => {
                            try {
                              if (!p.id) return;
                              const res = await apiClient.delete(`/api/tasks/meta/priorities/${p.id}`);
                              if (!res.success) throw new Error(res.error || 'Failed');
                              toast.success('Priority deleted');
                              void fetchTaskMeta();
                            } catch (e: any) {
                              toast.error(e?.message || 'Failed to delete priority');
                            }
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-end pt-2">
                    <Button size="sm" onClick={() => { setEditingTaskPriority(null); setTaskPriorityForm({ key: '', name: '', color: 'yellow', level: 0, sortOrder: undefined }); setShowTaskPriorityDialog(true); }}>
                      <Plus className="h-4 w-4 mr-1" /> Add Priority
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Assignment Rules Settings */}
        <TabsContent value="assignment" className="space-y-6">
          <AssignmentRulesManager />
        </TabsContent>

        {/* Task Status Dialog */}
        <Dialog open={showTaskStatusDialog} onOpenChange={setShowTaskStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTaskStatus ? 'Edit Task Status' : 'Add Task Status'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Key</Label>
                  <Input value={taskStatusForm.key} onChange={(e) => setTaskStatusForm(prev => ({ ...prev, key: e.target.value.toUpperCase() }))} placeholder="KEY" />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={taskStatusForm.name} onChange={(e) => setTaskStatusForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Display name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input value={taskStatusForm.color} onChange={(e) => setTaskStatusForm(prev => ({ ...prev, color: e.target.value }))} placeholder="blue" />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" value={taskStatusForm.sortOrder ?? 0} onChange={(e) => setTaskStatusForm(prev => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowTaskStatusDialog(false)}>Cancel</Button>
              <Button onClick={saveTaskStatus}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Task Priority Dialog */}
        <Dialog open={showTaskPriorityDialog} onOpenChange={setShowTaskPriorityDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTaskPriority ? 'Edit Task Priority' : 'Add Task Priority'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Key</Label>
                  <Input value={taskPriorityForm.key} onChange={(e) => setTaskPriorityForm(prev => ({ ...prev, key: e.target.value.toUpperCase() }))} placeholder="KEY" />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={taskPriorityForm.name} onChange={(e) => setTaskPriorityForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Display name" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input value={taskPriorityForm.color} onChange={(e) => setTaskPriorityForm(prev => ({ ...prev, color: e.target.value }))} placeholder="yellow" />
                </div>
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Input type="number" value={taskPriorityForm.level} onChange={(e) => setTaskPriorityForm(prev => ({ ...prev, level: Number(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" value={taskPriorityForm.sortOrder ?? 0} onChange={(e) => setTaskPriorityForm(prev => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowTaskPriorityDialog(false)}>Cancel</Button>
              <Button onClick={saveTaskPriority}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Authentication Settings */}
        {/* Reuse notifications tab for now; optionally a new tab can be added */}
        <TabsContent value="general" className="space-y-6">
          <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections} className="space-y-4">
            <AccordionItem value="google" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/80 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 text-red-600">
                    <Key className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Google Authentication</h3>
                    <p className="text-sm text-muted-foreground">Enable Google OAuth login for users</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Switch id="google-enabled" checked={googleAuth.enabled} onCheckedChange={(c) => setGoogleAuth(prev => ({ ...prev, enabled: !!c }))} />
                    <Label htmlFor="google-enabled">Enable Google Login</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Redirect URI</Label>
                    <Input value={googleAuth.redirectUri} onChange={(e) => setGoogleAuth(prev => ({ ...prev, redirectUri: e.target.value }))} placeholder="http://localhost:3000/auth/callback/google" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Client ID</Label>
                    <Input value={googleAuth.clientId} onChange={(e) => setGoogleAuth(prev => ({ ...prev, clientId: e.target.value }))} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Client Secret</Label>
                    <Input type="password" value={googleAuth.clientSecret} onChange={(e) => setGoogleAuth(prev => ({ ...prev, clientSecret: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button type="button" onClick={saveGoogle}>Save Google Auth</Button>
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
            <AccordionItem value="categories" className="border rounded-lg" data-section="categories">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/80 rounded-lg">
                <div className="flex items-center gap-3 w-full">
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
            <AccordionItem value="priorities" className="border rounded-lg" data-section="priorities">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/80 rounded-lg">
                <div className="flex items-center gap-3 w-full">
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
                                SLA: {priority.slaResponseHours}h
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
            <AccordionItem value="statuses" className="border rounded-lg" data-section="statuses">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/80 rounded-lg">
                <div className="flex items-center gap-3 w-full">
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

            

            

            {/* Ticket Templates */}
            <AccordionItem value="templates" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/80 rounded-lg">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Ticket Templates</h3>
                    <p className="text-sm text-muted-foreground">Pre-configured templates per category</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {templates.length} templates
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading templates...</span>
                    </div>
                  ) : (
                    <>
                      {templates.length === 0 && (
                        <div className="text-sm text-muted-foreground border rounded p-3">
                          No templates yet. Create your first template to speed up ticket creation.
                        </div>
                      )}
                      {templates.map((template: any) => (
                        <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-start gap-3">
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {template.category?.name ? `Category: ${template.category.name}` : ''}
                              </div>
                              <div className="text-sm text-muted-foreground truncate max-w-[600px]">
                                Title: {template.title}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openTemplateDialog(template)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={async () => {
                                if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) return;
                                try {
                                  await ticketSystemService.deleteTemplate(template.id);
                                  setTemplates(prev => prev.filter(t => t.id !== template.id));
                                  toast.success('Template deleted successfully');
                                } catch (error) {
                                  console.error('Error deleting template:', error);
                                  toast.error('Failed to delete template');
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => openTemplateDialog()}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Template
                      </Button>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Workflow Visualizations */}
            <AccordionItem value="workflows" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/80 rounded-lg">
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
            {/* Menu Management */}
            <AccordionItem value="menu" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/80 rounded-lg">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Menu Management</h3>
                    <p className="text-sm text-muted-foreground">Manage menu items and permissions</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {menuItemsCount} menu items
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <MenuManagement />
              </AccordionContent>
            </AccordionItem>

            {/* RBAC */}
            <AccordionItem value="rbac" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/80 rounded-lg">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-lg bg-green-100 text-green-600">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">RBAC: Roles & Permissions</h3>
                    <p className="text-sm text-muted-foreground">Manage roles and permissions</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {roles.length} roles • {permissions.length} permissions
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6">
                  {/* Roles */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <h4 className="font-medium">Roles</h4>
                      <Button variant="outline" size="sm" className="ml-auto" onClick={() => setShowRoleDialog(true)}>
                        <Plus className="h-4 w-4 mr-1" /> New Role
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {rbacLoading && (
                        <div className="text-sm text-muted-foreground">Loading roles…</div>
                      )}
                      {!rbacLoading && roles.length === 0 && (
                        <div className="text-sm text-muted-foreground border rounded p-3">No roles yet.</div>
                      )}
                      {roles.map((role) => {
                        const assigned = new Set((role as any).permissions?.map((rp: any) => rp.permission.id) || []);
                        const availablePerms = permissions.filter(p => !assigned.has(p.id));
                        return (
                          <div key={role.id} className="p-3 border rounded space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {role.name} {role.isSystem && <Badge variant="outline" className="ml-2 text-xs">System</Badge>}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">{role.description || '—'}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{((role as any).permissions||[]).length} perms</Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingRole(role);
                                    setRoleForm({ name: role.name, description: role.description || '' });
                                    setShowRoleDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={async () => {
                                    if (!confirm(`Delete role "${role.name}"?`)) return;
                                    try {
                                      await roleService.remove(role.id);
                                      setRoles(prev => prev.filter(r => r.id !== role.id));
                                      toast.success('Role deleted');
                                    } catch (e) {
                                      toast.error('Failed to delete role');
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-xs font-medium">Permissions</div>
                              <div className="flex flex-wrap gap-2">
                                {((role as any).permissions || []).map((rp: any) => (
                                  <Badge key={rp.permission.id} variant="outline" className="text-xs">
                                    {rp.permission.key}
                                    <button
                                      type="button"
                                      className="ml-1 text-red-600 hover:text-red-700"
                                      onClick={async () => {
                                        try {
                                          await roleService.removePermission(role.id, rp.permission.id);
                                          setRoles(prev => prev.map(r => r.id === role.id ? { ...r, permissions: ((r as any).permissions || []).filter((x: any) => x.permission.id !== rp.permission.id) } : r));
                                          toast.success('Permission removed');
                                        } catch (e) {
                                          toast.error('Failed to remove permission');
                                        }
                                      }}
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                ))}
                                {availablePerms.length === 0 && (
                                  <span className="text-xs text-muted-foreground">No more permissions to add</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Select value="" onValueChange={async (permId) => {
                                  try {
                                    await roleService.addPermission(role.id, permId);
                                    const perm = permissions.find(p => p.id === permId);
                                    if (perm) {
                                      setRoles(prev => prev.map(r => r.id === role.id ? { ...r, permissions: [ ...(((r as any).permissions) || []), { permission: perm } as any ] } : r));
                                    }
                                    toast.success('Permission added to role');
                                  } catch (e) {
                                    toast.error('Failed to add permission');
                                  }
                                }}>
                                  <SelectTrigger className="h-8 w-56">
                                    <SelectValue placeholder="Add permission to role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availablePerms.map(p => (
                                      <SelectItem key={p.id} value={p.id}>{p.key}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      // Load users for assignment dialog
                                      setAssignRole(role as any);
                                      setShowAssignRoleDialog(true);
                                      const res = await UserService.getUsers({ limit: 100 });
                                      const anyRes: any = res as any;
                                      const list: AppUser[] = (anyRes.data || anyRes) as AppUser[];
                                      setAssignUsers(list);
                                    } catch (e) {
                                      toast.error('Failed to load users');
                                    }
                                  }}
                                >
                                  Assign to User
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Permissions */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-blue-600" />
                      <h4 className="font-medium">Permissions</h4>
                      <Button variant="outline" size="sm" className="ml-auto" onClick={() => setShowPermissionDialog(true)}>
                        <Plus className="h-4 w-4 mr-1" /> New Permission
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {rbacLoading && (
                        <div className="col-span-2 text-sm text-muted-foreground">Loading permissions…</div>
                      )}
                      {!rbacLoading && permissions.length === 0 && (
                        <div className="col-span-2 text-sm text-muted-foreground border rounded p-3">No permissions yet.</div>
                      )}
                      {permissions.map((perm) => (
                        <div key={perm.id} className="p-3 border rounded flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-mono text-sm truncate" title={perm.key}>{perm.key}</div>
                            <div className="text-xs text-muted-foreground truncate">{perm.description || '—'}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingPermission(perm);
                                setPermissionForm({ key: perm.key, description: perm.description || '' });
                                setShowPermissionDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={async () => {
                                if (!confirm(`Delete permission "${perm.key}"?`)) return;
                                try {
                                  await permissionService.remove(perm.id);
                                  setPermissions(prev => prev.filter(p => p.id !== perm.id));
                                  toast.success('Permission deleted');
                                } catch (e) {
                                  toast.error('Failed to delete permission');
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Branding fields removed from RBAC section - managed in System Preferences */}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ABAC Policies */}
            <AccordionItem value="abac" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/80 rounded-lg">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">ABAC: Access Policies</h3>
                    <p className="text-sm text-muted-foreground">Define attribute-based access rules</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {policies.length} policies
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Button variant="outline" size="sm" className="ml-auto" onClick={() => setShowPolicyDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" /> New Policy
                    </Button>
                  </div>
                  {rbacLoading && (
                    <div className="text-sm text-muted-foreground">Loading policies…</div>
                  )}
                  {!rbacLoading && policies.length === 0 && (
                    <div className="text-sm text-muted-foreground border rounded p-3">No policies yet.</div>
                  )}
                  <div className="space-y-2">
                    {policies.map((p) => (
                      <div key={p.id} className="p-3 border rounded">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {p.subjectType}{p.subjectId ? `:${p.subjectId}` : ''} → {p.resource}:{p.action}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className="text-xs">{p.effect}</Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingPolicy(p);
                                setPolicyForm({
                                  name: p.name,
                                  description: p.description || '',
                                  effect: p.effect,
                                  subjectType: p.subjectType,
                                  subjectId: p.subjectId || '',
                                  resource: p.resource,
                                  action: p.action,
                                  conditionsText: p.conditions ? JSON.stringify(p.conditions, null, 2) : '{\n  \n}'
                                });
                                setShowPolicyDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={async () => {
                                if (!confirm(`Delete policy "${p.name}"?`)) return;
                                try {
                                  await policyService.remove(p.id);
                                  setPolicies(prev => prev.filter(x => x.id !== p.id));
                                  toast.success('Policy deleted');
                                } catch (e) {
                                  toast.error('Failed to delete policy');
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            

            {/* Departments (DB-backed) */}
            <AccordionItem value="departments" className="border rounded-lg" data-section="departments">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/80 rounded-lg">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Departments</h3>
                    <p className="text-sm text-muted-foreground">Organize users into departments</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {departmentsCount} departments
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <DepartmentSettings />
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
            {/* SMTP (Outgoing) */}
            <AccordionItem value="smtp" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">SMTP</h3>
                    <p className="text-sm text-muted-foreground">Outgoing mail server configuration</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Host</Label>
                    <Input value={smtp.host} onChange={(e) => setSmtp(prev => ({ ...prev, host: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input type="number" value={smtp.port} onChange={(e) => setSmtp(prev => ({ ...prev, port: Number(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>From Address</Label>
                    <Input value={smtp.fromAddress} onChange={(e) => setSmtp(prev => ({ ...prev, fromAddress: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-2 mt-8">
                    <Switch id="smtp-secure" checked={smtp.secure} onCheckedChange={(c) => setSmtp(prev => ({ ...prev, secure: !!c }))} />
                    <Label htmlFor="smtp-secure">Use TLS/SSL</Label>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>User</Label>
                    <Input value={smtp.user} onChange={(e) => setSmtp(prev => ({ ...prev, user: e.target.value }))} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Password</Label>
                    <Input type="password" value={smtp.password} onChange={(e) => setSmtp(prev => ({ ...prev, password: e.target.value }))} />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="smtp-test-to" className="text-sm">Send test to</Label>
                    <Input id="smtp-test-to" placeholder="recipient@example.com" className="w-72" onBlur={(e) => setSmtp(prev => ({ ...prev, testTo: (e.target as any).value }))} />
                    <Button type="button" variant="secondary" onClick={async () => {
                      const to = (smtp as any).testTo || '';
                      if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { toast.error('Enter a valid recipient email'); return; }
                      try {
                        const res = await settingsApi.sendSmtpTest(to);
                        if (!res.success) throw new Error(res.error || 'Failed to send');
                        toast.success('Test email sent');
                      } catch (e: any) {
                        toast.error(e?.message || 'Failed to send test email');
                      }
                    }}>Send Test Email</Button>
                  </div>
                  <Button type="button" onClick={saveSmtp}>Save SMTP</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            {/* Email Intake (Inbound) */}
            <AccordionItem value="email-intake" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                    <Download className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Email Intake (IMAP)</h3>
                    <p className="text-sm text-muted-foreground">Incoming mail server configuration</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>IMAP Host</Label>
                    <Input value={inbound.imapHost} onChange={(e) => setInbound(prev => ({ ...prev, imapHost: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>IMAP Port</Label>
                    <Input type="number" value={inbound.imapPort} onChange={(e) => setInbound(prev => ({ ...prev, imapPort: Number(e.target.value) || 0 }))} />
                  </div>
                  <div className="flex items-center gap-2 mt-8">
                    <Switch id="imap-secure" checked={inbound.imapSecure} onCheckedChange={(c) => setInbound(prev => ({ ...prev, imapSecure: !!c }))} />
                    <Label htmlFor="imap-secure">Use TLS/SSL</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Folder</Label>
                    <Input value={inbound.folder} onChange={(e) => setInbound(prev => ({ ...prev, folder: e.target.value }))} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>User</Label>
                    <Input value={inbound.imapUser} onChange={(e) => setInbound(prev => ({ ...prev, imapUser: e.target.value }))} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Password</Label>
                    <Input type="password" value={inbound.imapPassword} onChange={(e) => setInbound(prev => ({ ...prev, imapPassword: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Move to (Success)</Label>
                    <Input value={inbound.moveOnSuccessFolder} onChange={(e) => setInbound(prev => ({ ...prev, moveOnSuccessFolder: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Move to (Error)</Label>
                    <Input value={inbound.moveOnErrorFolder} onChange={(e) => setInbound(prev => ({ ...prev, moveOnErrorFolder: e.target.value }))} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 mt-4">
                  <Button type="button" variant="secondary" onClick={async () => {
                    try {
                      const res = await settingsApi.runEmailIngest();
                      if (!res.success) throw new Error(res.error || 'Failed');
                      const d: any = res.data || {};
                      toast.success(`Fetched ${d.fetched ?? 0}, created ${d.created ?? 0}, replies ${d.replies ?? 0}, skipped ${d.skipped ?? 0}, errors ${d.errors ?? 0}`);
                    } catch (e: any) { toast.error(e?.message || 'Failed to ingest emails'); }
                  }}>Fetch Emails Now</Button>
                  <Button type="button" onClick={saveInbound}>Save Inbound</Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Email Notifications */}
            <AccordionItem value="email" className="border rounded-lg" data-section="email">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/50 rounded-lg">
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
            <AccordionItem value="inapp" className="border rounded-lg" data-section="inapp">
              <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/80 rounded-lg">
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
            <div className="flex justify-end px-6">
              <Button type="button" variant="outline" onClick={saveNotifications}>Save Notification Preferences</Button>
            </div>
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
                <div className="flex gap-2">
                  <Input
                    id="categoryIcon"
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="e.g., laptop, server, wifi"
                  />
                  <Button type="button" variant="outline" onClick={() => setShowIconPicker(true)}>Pick</Button>
                </div>
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

      {/* Assign Role to User Dialog */}
      <Dialog open={showAssignRoleDialog} onOpenChange={(open) => { setShowAssignRoleDialog(open); if (!open) { setAssignRole(null); setSelectedUserId(''); setAssignUsers([]); setAssignPrimary(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Role to User</DialogTitle>
            <DialogDescription>
              {assignRole ? `Select a user to assign the role "${assignRole.name}".` : 'Select a user to assign the role.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {assignUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="primary-role" checked={assignPrimary} onCheckedChange={(c) => setAssignPrimary(!!c)} />
              <Label htmlFor="primary-role">Set as primary role</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignRoleDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!assignRole || !selectedUserId) return;
              try {
                await roleService.assignToUser(assignRole.id, selectedUserId, assignPrimary);
                setShowAssignRoleDialog(false);
                setAssignRole(null); setSelectedUserId(''); setAssignUsers([]); setAssignPrimary(false);
                toast.success('Role assigned to user');
              } catch (e) {
                toast.error('Failed to assign role');
              }
            }} disabled={!assignRole || !selectedUserId}>Assign Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Icon Picker Dialog */}
      <Dialog open={showIconPicker} onOpenChange={setShowIconPicker}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Select Icon</DialogTitle>
            <DialogDescription>Search and select a Lucide icon by name.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search icons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-6 gap-3">
              {Object.keys(LucideIcons)
                .filter((k) => /^[A-Z]/.test(k))
                .filter((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, 300)
                .map((iconKey) => {
                  const IconComp: any = (LucideIcons as any)[iconKey];
                  const slug = iconKey
                    .replace(/([a-z])([A-Z])/g, '$1-$2')
                    .toLowerCase();
                  return (
                    <button
                      key={iconKey}
                      type="button"
                      className="flex flex-col items-center gap-1 p-2 border rounded hover:bg-muted"
                      onClick={() => {
                        setCategoryForm((prev) => ({ ...prev, icon: slug }));
                        setShowIconPicker(false);
                      }}
                      title={slug}
                    >
                      <IconComp className="h-5 w-5" />
                      <span className="text-[10px] truncate w-full">{slug}</span>
                    </button>
                  );
                })}
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setShowIconPicker(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Management Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
            <DialogDescription>
              Define a reusable ticket template tied to a category.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 px-1">
            <div className="space-y-2">
              <Label htmlFor="templateName">Name *</Label>
              <Input
                id="templateName"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Hardware Issue Template"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateCategory">Category *</Label>
              <Select 
                value={templateForm.categoryId}
                onValueChange={(value) => setTemplateForm(prev => ({ ...prev, categoryId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateTitle">Ticket Title *</Label>
              <Input
                id="templateTitle"
                value={templateForm.title}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Hardware Issue: [Device Type]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateDescription">Description</Label>
              <Textarea
                id="templateDescription"
                value={templateForm.description}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Guidance shown in the ticket description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateCustomFields">Custom Fields (JSON)</Label>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Provide structured fields or switch to JSON editor.</p>
                <div className="flex items-center gap-2">
                  <Label htmlFor="json-toggle" className="text-xs">JSON</Label>
                  <Switch id="json-toggle" checked={useJsonEditor} onCheckedChange={(checked) => setUseJsonEditor(!!checked)} />
                </div>
              </div>

              {useJsonEditor ? (
                <Textarea
                  id="templateCustomFields"
                  value={templateForm.customFieldsText}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, customFieldsText: e.target.value }))}
                  placeholder={`{
  "device_type": "Desktop",
  "operating_system": "Windows"
}`}
                  rows={8}
                />
              ) : (
                <div className="space-y-2">
                  {customFieldsList.map((row, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        className="col-span-4"
                        placeholder="Field name (e.g., device_type)"
                        value={row.name}
                        onChange={(e) => updateCustomFieldRow(index, 'name', e.target.value)}
                      />
                      <Input
                        className="col-span-7"
                        placeholder="Value (e.g., Desktop)"
                        value={row.value}
                        onChange={(e) => updateCustomFieldRow(index, 'value', e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="col-span-1 text-red-600 hover:text-red-700"
                        onClick={() => removeCustomFieldRow(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addCustomFieldRow}>
                    <Plus className="h-4 w-4 mr-2" /> Add Field
                  </Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowTemplateDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateOrUpdateTemplate}
              disabled={!templateForm.name.trim() || !templateForm.categoryId || !templateForm.title.trim()}
            >
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={(open) => { setShowRoleDialog(open); if (!open) { setEditingRole(null); setRoleForm({ name: '', description: '' }); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            <DialogDescription>{editingRole ? 'Update role properties.' : 'Define a new role.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="roleName">Name</Label>
              <Input id="roleName" value={roleForm.name} onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))} disabled={!!editingRole?.isSystem} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleDesc">Description</Label>
              <Textarea id="roleDesc" value={roleForm.description} onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Cancel</Button>
            {editingRole ? (
              <Button onClick={async () => {
                try {
                  const updated = await roleService.update(editingRole.id, { name: roleForm.name, description: roleForm.description || undefined });
                  setRoles(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
                  setShowRoleDialog(false);
                  setEditingRole(null);
                  setRoleForm({ name: '', description: '' });
                  toast.success('Role updated');
                } catch (e) {
                  toast.error('Failed to update role');
                }
              }} disabled={!roleForm.name.trim()}>Update Role</Button>
            ) : (
              <Button onClick={async () => {
                try {
                  const created = await roleService.create({ name: roleForm.name, description: roleForm.description || undefined });
                  setRoles(prev => [...prev, created]);
                  setShowRoleDialog(false);
                  setRoleForm({ name: '', description: '' });
                  toast.success('Role created');
                } catch (e) {
                  toast.error('Failed to create role');
                }
              }} disabled={!roleForm.name.trim()}>Create Role</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={(open) => { setShowPermissionDialog(open); if (!open) { setEditingPermission(null); setPermissionForm({ key: '', description: '' }); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPermission ? 'Edit Permission' : 'Create Permission'}</DialogTitle>
            <DialogDescription>{editingPermission ? 'Update permission description.' : 'Add a permission key like tickets:read.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="permKey">Key</Label>
              <Input id="permKey" value={permissionForm.key} onChange={(e) => setPermissionForm(prev => ({ ...prev, key: e.target.value }))} placeholder="resource:action" disabled={!!editingPermission} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permDesc">Description</Label>
              <Textarea id="permDesc" value={permissionForm.description} onChange={(e) => setPermissionForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionDialog(false)}>Cancel</Button>
            {editingPermission ? (
              <Button onClick={async () => {
                try {
                  const updated = await permissionService.update(editingPermission.id, { description: permissionForm.description || undefined });
                  setPermissions(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
                  setShowPermissionDialog(false);
                  setEditingPermission(null);
                  setPermissionForm({ key: '', description: '' });
                  toast.success('Permission updated');
                } catch (e) {
                  toast.error('Failed to update permission');
                }
              }}>Update Permission</Button>
            ) : (
              <Button onClick={async () => {
                try {
                  const created = await permissionService.create({ key: permissionForm.key, description: permissionForm.description || undefined });
                  setPermissions(prev => [...prev, created]);
                  setShowPermissionDialog(false);
                  setPermissionForm({ key: '', description: '' });
                  toast.success('Permission created');
                } catch (e) {
                  toast.error('Failed to create permission');
                }
              }} disabled={!permissionForm.key.trim()}>Create Permission</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Policy Dialog */}
      <Dialog open={showPolicyDialog} onOpenChange={(open) => { setShowPolicyDialog(open); if (!open) { setEditingPolicy(null); setPolicyForm({ name: '', description: '', effect: 'ALLOW', subjectType: 'ROLE', subjectId: '', resource: '', action: '', conditionsText: '{\n  \n}' }); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? 'Edit Access Policy' : 'Create Access Policy'}</DialogTitle>
            <DialogDescription>{editingPolicy ? 'Update ABAC rule.' : 'Define ABAC rule for a subject and resource/action.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={policyForm.name} onChange={(e) => setPolicyForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Effect</Label>
                <Select value={policyForm.effect} onValueChange={(v) => setPolicyForm(prev => ({ ...prev, effect: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALLOW">ALLOW</SelectItem>
                    <SelectItem value="DENY">DENY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={policyForm.description} onChange={(e) => setPolicyForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Subject Type</Label>
                <Select value={policyForm.subjectType} onValueChange={(v) => setPolicyForm(prev => ({ ...prev, subjectType: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROLE">ROLE</SelectItem>
                    <SelectItem value="USER">USER</SelectItem>
                    <SelectItem value="DEPARTMENT">DEPARTMENT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Subject ID (optional)</Label>
                <Input value={policyForm.subjectId} onChange={(e) => setPolicyForm(prev => ({ ...prev, subjectId: e.target.value }))} placeholder="roleId/userId/departmentId" />
              </div>
              <div className="space-y-1">
                <Label>Resource</Label>
                <Input value={policyForm.resource} onChange={(e) => setPolicyForm(prev => ({ ...prev, resource: e.target.value }))} placeholder="tickets" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Action</Label>
                <Input value={policyForm.action} onChange={(e) => setPolicyForm(prev => ({ ...prev, action: e.target.value }))} placeholder="read" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Conditions (JSON)</Label>
                <Textarea rows={4} value={policyForm.conditionsText} onChange={(e) => setPolicyForm(prev => ({ ...prev, conditionsText: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPolicyDialog(false)}>Cancel</Button>
            {editingPolicy ? (
              <Button onClick={async () => {
                try {
                  let conditions: any | null | undefined = undefined;
                  const trimmed = policyForm.conditionsText.trim();
                  if (trimmed) {
                    try { conditions = JSON.parse(trimmed); } catch { toast.error('Conditions must be valid JSON'); return; }
                  } else {
                    conditions = null;
                  }
                  const updated = await policyService.update(editingPolicy.id, {
                    name: policyForm.name,
                    description: policyForm.description || undefined,
                    effect: policyForm.effect,
                    subjectType: policyForm.subjectType,
                    subjectId: policyForm.subjectId || undefined,
                    resource: policyForm.resource,
                    action: policyForm.action,
                    conditions,
                  } as any);
                  setPolicies(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
                  setShowPolicyDialog(false);
                  setEditingPolicy(null);
                  setPolicyForm({ name: '', description: '', effect: 'ALLOW', subjectType: 'ROLE', subjectId: '', resource: '', action: '', conditionsText: '{\n  \n}' });
                  toast.success('Policy updated');
                } catch (e) {
                  toast.error('Failed to update policy');
                }
              }} disabled={!policyForm.name.trim() || !policyForm.resource.trim() || !policyForm.action.trim()}>Update Policy</Button>
            ) : (
              <Button onClick={async () => {
                try {
                  let conditions: any | undefined = undefined;
                  const trimmed = policyForm.conditionsText.trim();
                  if (trimmed) {
                    try { conditions = JSON.parse(trimmed); } catch { toast.error('Conditions must be valid JSON'); return; }
                  }
                  const created = await policyService.create({
                    name: policyForm.name,
                    description: policyForm.description || undefined,
                    effect: policyForm.effect,
                    subjectType: policyForm.subjectType,
                    subjectId: policyForm.subjectId || undefined,
                    resource: policyForm.resource,
                    action: policyForm.action,
                    conditions,
                  } as any);
                  setPolicies(prev => [created, ...prev]);
                  setShowPolicyDialog(false);
                  setPolicyForm({ name: '', description: '', effect: 'ALLOW', subjectType: 'ROLE', subjectId: '', resource: '', action: '', conditionsText: '{\n  \n}' });
                  toast.success('Policy created');
                } catch (e) {
                  toast.error('Failed to create policy');
                }
              }} disabled={!policyForm.name.trim() || !policyForm.resource.trim() || !policyForm.action.trim()}>Create Policy</Button>
            )}
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
                 {statuses.filter(s => !editingStatus || s.id !== editingStatus.id).map((status) => (
                   <div key={status.id} className="flex items-center space-x-2">
                     <input
                       type="checkbox"
                       id={`transition-${status.id}`}
                       checked={
                         statusForm.allowedTransitions.includes(status.id) ||
                         statusForm.allowedTransitions.includes(status.name)
                       }
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
