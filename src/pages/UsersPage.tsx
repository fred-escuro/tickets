import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { OrganizationChart } from '@/components/OrganizationChart';
import { PageWrapper, PageSection } from '@/components/PageWrapper';
import { ArrowLeft, Search, Filter, Mail, Phone, MapPin, Users, Network, Shield, Wrench, Loader2, AlertCircle, Plus } from 'lucide-react';
import { useState, useEffect, type FC } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '@/hooks/useApi';
import { UserService, type SupportAgent, type User, type CreateUserData, type UpdateUserData, type DepartmentOption, USER_ROLES, USER_DEPARTMENTS } from '@/lib/services/userService';
import { roleService, type Role as RbacRole } from '@/lib/services/roleService';

const getDepartmentBadgeColor = (department: string) => {
  switch (department) {
    case 'IT Support':
      return 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-300 dark:bg-blue-100 dark:text-blue-800';
    case 'Hardware Support':
      return 'border-green-600 bg-green-50 text-green-700 dark:border-green-300 dark:bg-green-100 dark:text-green-800';
    case 'Software Support':
      return 'border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-300 dark:bg-purple-100 dark:text-purple-800';
    case 'Network Support':
      return 'border-orange-600 bg-orange-50 text-orange-700 dark:border-orange-300 dark:bg-orange-100 dark:text-orange-800';
    case 'Security Support':
      return 'border-red-600 bg-red-50 text-red-700 dark:border-red-300 dark:bg-red-100 dark:text-red-800';
    default:
      return 'border-muted-foreground/20 bg-muted text-muted-foreground';
  }
};

const getAgentBadgeColor = (isAgent: boolean) => {
  return isAgent 
    ? 'border-green-600 bg-green-50 text-green-700 dark:border-green-300 dark:bg-green-100 dark:text-green-800'
    : 'border-gray-600 bg-gray-50 text-gray-700 dark:border-gray-300 dark:bg-gray-100 dark:text-gray-800';
};

export const UsersPage: FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    password: '',
    role: 'user',
    department: '',
    phone: '',
    location: '',
    isAgent: false,
    avatar: ''
  });
  const [error, setError] = useState('');

  // RBAC roles
  const [rbacRoles, setRbacRoles] = useState<RbacRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [selectedRoleIdCreate, setSelectedRoleIdCreate] = useState<string>('');
  const [selectedRoleIdEdit, setSelectedRoleIdEdit] = useState<string>('');
  const [departmentsApi, setDepartmentsApi] = useState<DepartmentOption[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  // Fetch all users using the API hook
  const { data: usersData, loading: usersLoading, error: usersError, execute: fetchUsers } = useApi(
    UserService.getAllUsers,
    { autoExecute: false }
  );

  // Use useEffect to fetch data on component mount
  useEffect(() => {
    fetchUsers();
    // Load RBAC roles
    (async () => {
      try {
        setRolesLoading(true);
        const roles = await roleService.list();
        setRbacRoles(roles);
        // Default selection to 'user' role if exists
        const defaultRole = roles.find(r => r.name.toLowerCase() === 'user') || roles[0];
        if (defaultRole) {
          setSelectedRoleIdCreate(defaultRole.id);
        }
      } catch (e) {
        // ignore; UI will fallback to static roles
      } finally {
        setRolesLoading(false);
      }
    })();
    // Load departments from backend
    (async () => {
      try {
        setDepartmentsLoading(true);
        const res = await UserService.getDepartments();
        if (res.success && Array.isArray(res.data)) setDepartmentsApi(res.data);
      } catch {}
      finally {
        setDepartmentsLoading(false);
      }
    })();
  }, []);

  // Keep RBAC role selector in Edit dialog in sync with current DB role
  useEffect(() => {
    if (!selectedUser) return;
    // Prefer primary RBAC role from user payload if available
    const userAny: any = selectedUser as any;
    const rolesArr: any[] = Array.isArray(userAny?.roles) ? userAny.roles : [];
    let currentRoleId = '';
    if (rolesArr.length > 0) {
      const primary = rolesArr.find((ur: any) => ur?.isPrimary);
      currentRoleId = primary?.role?.id || rolesArr[0]?.role?.id || '';
    }
    if (!currentRoleId && rbacRoles.length > 0) {
      // Fallback to 'user' role if nothing found
      currentRoleId = (rbacRoles.find(r => r.name.toLowerCase() === 'user')?.id) || '';
    }
    if (currentRoleId) setSelectedRoleIdEdit(currentRoleId);
  }, [selectedUser, rbacRoles]);

  const users = usersData?.data || [];

  // Get unique departments for filter
  const departments = (departmentsApi.length > 0
    ? departmentsApi.map(d => d.name)
    : Array.from(new Set(users.map(user => user.departmentEntity?.name).filter((dept): dept is string => !!dept))).sort());

  // Filter users based on search and department
  const filteredUsers = users.filter((user) => {
    const fullName = user.middleName ? `${user.firstName} ${user.middleName} ${user.lastName}` : `${user.firstName} ${user.lastName}`;
    const matchesSearch = fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.departmentEntity?.name && user.departmentEntity.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (user.role && user.role.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDepartment = filterDepartment === 'all' || (user.departmentEntity?.name && user.departmentEntity.name === filterDepartment);
    const matchesRole = filterRole === 'all' || 
                       (filterRole === 'agent' && user.isAgent) ||
                       (filterRole === 'customer' && !user.isAgent);
    
    return matchesSearch && matchesDepartment && matchesRole;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const createData: CreateUserData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || undefined,
        email: formData.email,
        password: formData.password,
        role: 'user',
        department: formData.department || undefined,
        // attempt to map by name to id if known
        departmentId: (departmentsApi.find(d => d.name === formData.department)?.id) || undefined,
        phone: formData.phone || undefined,
        avatar: formData.avatar || undefined,
        location: formData.location || undefined
      };

      const response = await UserService.createUser(createData);
      
      if (response.success) {
        // Also assign RBAC role if available
        try {
          const newUser: any = response.data || (response as any).data;
          const roleId = selectedRoleIdCreate || (rbacRoles.find(r => r.name.toLowerCase() === (formData.role || 'user').toLowerCase())?.id || '');
          if (newUser?.id && roleId) {
            await roleService.assignToUser(roleId, newUser.id, true);
          }
        } catch {}
        setShowCreateForm(false);
        setFormData({
          firstName: '',
          lastName: '',
          middleName: '',
          email: '',
          password: '',
          role: 'user',
          department: '',
          phone: '',
          location: '',
          isAgent: false,
          avatar: ''
        });
        fetchUsers();
        setError('');
      } else {
        setError(response.error || 'Failed to create user');
      }
    } catch (err) {
      setError('Failed to create user');
      console.error('Error creating user:', err);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const updateData: UpdateUserData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || undefined,
        role: formData.role,
        department: formData.department || undefined,
        departmentId: (departmentsApi.find(d => d.name === formData.department)?.id) || undefined,
        phone: formData.phone || undefined,
        avatar: formData.avatar || undefined,
        location: formData.location || undefined,
        // include password only if provided
        ...(formData.password ? { password: formData.password } : {})
      };

      const response = await UserService.updateUser(selectedUser.id, updateData);
      
      if (response.success) {
        // Sync RBAC user_roles: make selected role primary and remove others
        try {
          const chosenRoleId = selectedRoleIdEdit || (rbacRoles.find(r => r.name.toLowerCase() === 'user')?.id || '');
          if (chosenRoleId) {
            const userResp: any = await UserService.getUser(selectedUser.id);
            const currentRoles: string[] = ((userResp.data || userResp)?.roles || [])
              .map((ur: any) => ur.role?.id)
              .filter((id: any) => typeof id === 'string');
            for (const rid of currentRoles) {
              if (rid !== chosenRoleId) {
                await roleService.removeFromUser(rid, selectedUser.id);
              }
            }
            await roleService.assignToUser(chosenRoleId, selectedUser.id, true);
          }
        } catch {}
        setShowEditForm(false);
        setSelectedUser(null);
        setFormData({
          firstName: '',
          lastName: '',
          middleName: '',
          email: '',
          password: '',
          role: 'user',
          department: '',
          phone: '',
          location: '',
          isAgent: false,
          avatar: ''
        });
        fetchUsers();
        setError('');
      } else {
        setError(response.error || 'Failed to update user');
      }
    } catch (err) {
      setError('Failed to update user');
      console.error('Error updating user:', err);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName || '',
      email: user.email,
      password: '',
      role: user.role,
      department: user.departmentEntity?.name || '',
      phone: user.phone || '',
      location: user.location || '',
      isAgent: user.isAgent,
      avatar: user.avatar || ''
    });
    setShowEditForm(true);
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      middleName: '',
      email: '',
      password: '',
      role: 'user',
      department: '',
      phone: '',
      location: '',
      isAgent: false,
      avatar: ''
    });
    setSelectedUser(null);
    setError('');
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
              onClick={() => fetchUsers()} 
              disabled={usersLoading}
              className="gap-2"
            >
              {usersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">User Directory</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Find and connect with all users in the system
              </p>
            </div>
            <Button 
              onClick={() => {
                resetForm();
                setShowCreateForm(true);
              }} 
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New User
            </Button>
          </div>
        </PageSection>

        {/* Tabs for Directory and Org Chart */}
        <PageSection index={1}>
          <Tabs defaultValue="directory" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="directory" className="gap-2">
                <Users className="h-4 w-4 hidden sm:inline" />
                Directory
              </TabsTrigger>
              <TabsTrigger value="orgchart" className="gap-2">
                <Network className="h-4 w-4 hidden sm:inline" />
                Org Chart
              </TabsTrigger>
            </TabsList>

            {/* User Directory Tab */}
            <TabsContent value="directory" className="space-y-6">
              {/* Filters Section */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Search & Filter</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or email..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Select value={filterRole} onValueChange={setFilterRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by user type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="agent">Support Agents</SelectItem>
                          <SelectItem value="customer">Non-Agents</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Loading State */}
              {usersLoading && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Loading users...</h3>
                    <p className="text-muted-foreground text-center">
                      Fetching data from the backend
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Error State */}
              {usersError && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 animate-spin text-red-500 mb-4" />
                    <h3 className="text-lg font-medium mb-2 text-red-600">Failed to load data</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {usersError}
                    </p>
                    <Button onClick={() => fetchUsers()} variant="outline">
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Users Grid */}
              {!usersLoading && !usersError && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map((user, index) => (
                    <Card 
                      key={user.id} 
                      className="group hover:shadow-xl hover:bg-gradient-to-br hover:from-blue-50/60 hover:to-blue-100/30 dark:hover:from-white/5 dark:hover:to-white/[0.03] hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-300 cursor-pointer border-border hover:border-primary/20 dark:hover:border-white/10 hover:ring-2 hover:ring-primary/10 dark:hover:ring-white/10 relative overflow-hidden"
                      style={{ animationDelay: `${(index + 1) * 100}ms` }}
                      onClick={() => handleEditUser(user)}
                    >
                      {/* Hover background overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <CardContent className="p-6 relative z-10">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="group-hover:scale-110 transition-transform duration-300 p-2 bg-primary/10 rounded-lg">
                              <Avatar
                                src={user.avatar}
                                alt={user.middleName ? `${user.firstName} ${user.middleName} ${user.lastName}` : `${user.firstName} ${user.lastName}`}
                                fallback={`${user.firstName} ${user.lastName}`}
                                size="lg"
                                className="h-12 w-12"
                              />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors duration-300">
                                {user.middleName ? `${user.firstName} ${user.middleName} ${user.lastName}` : `${user.firstName} ${user.lastName}`}
                              </h3>
                              <div className="flex items-center gap-2">
                                {/* RBAC primary role only */}
                                {Array.isArray((user as any).roles) && (user as any).roles.length > 0 && (
                                  <Badge className="border-indigo-600 bg-indigo-50 text-indigo-700 text-xs group-hover:scale-105 transition-transform duration-300 shadow-sm">
                                    {((user as any).roles.find((r: any) => r.isPrimary) || (user as any).roles[0]).role?.name || 'Role'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {user.departmentEntity && (
                              <Badge className={`${getDepartmentBadgeColor(user.departmentEntity.name)} text-xs mb-3 group-hover:scale-105 transition-transform duration-300 shadow-sm`}>
                                {user.departmentEntity.name}
                              </Badge>
                            )}
                            

                            
                            <div className="space-y-1">
                              {user.email && (
                                <div className="flex items-center text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-300">
                                  <Mail className="h-3 w-3 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                                  <span className="truncate">{user.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!usersLoading && !usersError && filteredUsers.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No users found</h3>
                    <p className="text-muted-foreground text-center">
                      No users match your current search criteria.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Organization Chart Tab */}
            <TabsContent value="orgchart" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Support Team Organization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OrganizationChart />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </PageSection>
      </PageWrapper>

      {/* Create User Dialog */}
      <Dialog open={showCreateForm} onOpenChange={(open) => {
        if (!open) {
          resetForm();
        }
        setShowCreateForm(open);
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                {/* RBAC Role (optional) */}
                <Label>RBAC Role</Label>
                <Select value={selectedRoleIdCreate} onValueChange={setSelectedRoleIdCreate}>
                  <SelectTrigger>
                    <SelectValue placeholder={rolesLoading ? 'Loading roles…' : 'Select RBAC role'} />
                  </SelectTrigger>
                  <SelectContent>
                    {rbacRoles.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL</Label>
              <div className="flex gap-2">
                <Input
                  id="avatar"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const generatedAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formData.firstName + ' ' + formData.lastName)}&backgroundColor=1f2937&textColor=ffffff`;
                    setFormData({ ...formData, avatar: generatedAvatar });
                  }}
                  disabled={!formData.firstName || !formData.lastName}
                >
                  Generate
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={departmentsLoading ? 'Loading departments…' : 'Select department'} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isAgent"
                checked={formData.isAgent}
                onChange={(e) => setFormData({ ...formData, isAgent: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isAgent">Is Support Agent</Label>
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => { setShowCreateForm(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit">Create User</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
                     <form onSubmit={handleUpdateUser} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="editFirstName">First Name *</Label>
                 <Input
                   id="editFirstName"
                   value={formData.firstName}
                   onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                   required
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="editLastName">Last Name *</Label>
                 <Input
                   id="editLastName"
                   value={formData.lastName}
                   onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                   required
                 />
               </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="editMiddleName">Middle Name</Label>
                 <Input
                   id="editMiddleName"
                   value={formData.middleName}
                   onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="editEmail">Email</Label>
                 <Input
                   id="editEmail"
                   type="email"
                   value={formData.email}
                   disabled
                   className="bg-gray-50"
                 />
                 {/* Email verification action (admin/users:write only) */}
                 {(() => {
                   const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as any;
                   const perms: string[] = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
                   const roles: string[] = Array.isArray(currentUser?.roles) ? currentUser.roles.map((r: any) => r?.role?.name) : [];
                   const canVerify = perms.includes('users:write') || roles.includes('admin');
                   if (!canVerify) return null;
                   return (
                     <div className="flex items-center gap-2 pt-1">
                       <Button type="button" variant="outline" size="sm"
                         onClick={async () => {
                           if (!selectedUser) return;
                           try {
                             const res = await UserService.requestVerificationForUser(selectedUser.id);
                             if (res.success) {
                               toast.success('Verification email sent (if the account is unverified)');
                             } else {
                               toast.error(res.error || 'Failed to request verification');
                             }
                           } catch (e) {
                             toast.error('Failed to request verification');
                           }
                         }}
                       >
                         Send verification email
                       </Button>
                     </div>
                   );
                 })()}
               </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>RBAC Role</Label>
                 <Select value={selectedRoleIdEdit} onValueChange={setSelectedRoleIdEdit}>
                   <SelectTrigger>
                     <SelectValue placeholder={rolesLoading ? 'Loading roles…' : 'Select RBAC role'} />
                   </SelectTrigger>
                   <SelectContent>
                     {rbacRoles.map((r) => (
                       <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                 </div>
               <div className="space-y-2">
                 <Label htmlFor="editDepartment">Department</Label>
                 <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                   <SelectTrigger>
                     <SelectValue placeholder={departmentsLoading ? 'Loading departments…' : 'Select department'} />
                   </SelectTrigger>
                   <SelectContent>
                     {departments.map((dept) => (
                       <SelectItem key={dept} value={dept}>
                         {dept}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             </div>

                           <div className="space-y-2">
                <Label htmlFor="editAvatar">Avatar URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="editAvatar"
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const generatedAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formData.firstName + ' ' + formData.lastName)}&backgroundColor=1f2937&textColor=ffffff`;
                      setFormData({ ...formData, avatar: generatedAvatar });
                    }}
                    disabled={!formData.firstName || !formData.lastName}
                  >
                    Generate
                  </Button>
                </div>
              </div>

            {/* Password (only for users with users:write or admin) */}
            {(() => {
              // Client-side permission check using stored permissions/roles
              const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as any;
              const perms: string[] = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
              const roleNames: string[] = Array.isArray(currentUser?.roles)
                ? currentUser.roles.map((ur: any) => ur?.role?.name).filter((n: any) => typeof n === 'string')
                : (currentUser?.role ? [currentUser.role] : []);
              const canEditPassword = perms.includes('users:write') || roleNames.includes('admin') || roleNames.includes('manager');
              if (!canEditPassword) return null;
              return (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editPassword">Password</Label>
                    <Input
                      id="editPassword"
                      type="password"
                      placeholder="Leave blank to keep unchanged"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2" />
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editPhone">Phone</Label>
                <Input
                  id="editPhone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLocation">Location</Label>
                <Input
                  id="editLocation"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editIsAgent"
                checked={formData.isAgent}
                onChange={(e) => setFormData({ ...formData, isAgent: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="editIsAgent">Is Support Agent</Label>
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => { setShowEditForm(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit">Update User</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
