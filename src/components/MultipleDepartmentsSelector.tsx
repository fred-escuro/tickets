import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, X, Star, Users, Crown, Shield, User } from 'lucide-react';
import type { DepartmentOption, UserDepartment } from '@/lib/services/userService';

interface MultipleDepartmentsSelectorProps {
  departments: DepartmentOption[];
  selectedDepartments: UserDepartment[];
  onDepartmentsChange: (departments: UserDepartment[]) => void;
  disabled?: boolean;
}

const DEPARTMENT_ROLES = [
  { value: 'admin', label: 'Admin', icon: Crown, color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800' },
  { value: 'manager', label: 'Manager', icon: Shield, color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
  { value: 'specialist', label: 'Specialist', icon: Star, color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800' },
  { value: 'member', label: 'Member', icon: Users, color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800' },
  { value: 'observer', label: 'Observer', icon: User, color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800' },
];

export const MultipleDepartmentsSelector: React.FC<MultipleDepartmentsSelectorProps> = ({
  departments,
  selectedDepartments,
  onDepartmentsChange,
  disabled = false
}) => {
  const [newDepartmentId, setNewDepartmentId] = useState('');
  const [newRole, setNewRole] = useState('member');

  // Get available departments (not already selected)
  const availableDepartments = departments.filter(
    dept => !selectedDepartments.some(selected => selected.department.id === dept.id)
  );

  const addDepartment = () => {
    if (!newDepartmentId) return;

    const department = departments.find(d => d.id === newDepartmentId);
    if (!department) return;

    // Check if this would be the first department (make it primary)
    const isFirstDepartment = selectedDepartments.length === 0;

    const newUserDepartment: UserDepartment = {
      id: `temp-${Date.now()}`, // Temporary ID for new entries
      isPrimary: isFirstDepartment,
      role: newRole,
      joinedAt: new Date().toISOString(),
      department: {
        id: department.id,
        name: department.name,
        description: department.description
      }
    };

    onDepartmentsChange([...selectedDepartments, newUserDepartment]);
    setNewDepartmentId('');
    setNewRole('member');
  };

  const removeDepartment = (departmentId: string) => {
    const updated = selectedDepartments.filter(d => d.department.id !== departmentId);
    
    // If we removed the primary department, make the first remaining one primary
    if (updated.length > 0 && !updated.some(d => d.isPrimary)) {
      updated[0].isPrimary = true;
    }
    
    onDepartmentsChange(updated);
  };

  const setPrimaryDepartment = (departmentId: string) => {
    const updated = selectedDepartments.map(d => ({
      ...d,
      isPrimary: d.department.id === departmentId
    }));
    onDepartmentsChange(updated);
  };

  const updateDepartmentRole = (departmentId: string, newRole: string) => {
    const updated = selectedDepartments.map(d => 
      d.department.id === departmentId 
        ? { ...d, role: newRole }
        : d
    );
    onDepartmentsChange(updated);
  };

  const getRoleInfo = (role: string) => {
    return DEPARTMENT_ROLES.find(r => r.value === role) || DEPARTMENT_ROLES[DEPARTMENT_ROLES.length - 1];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Departments</Label>
        <span className="text-xs text-muted-foreground">
          {selectedDepartments.length} assigned
        </span>
      </div>
      
      {/* Selected Departments - Compact Design */}
      {selectedDepartments.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {selectedDepartments.map((userDept) => {
            const roleInfo = getRoleInfo(userDept.role);
            const RoleIcon = roleInfo.icon;
            
            return (
              <div key={userDept.department.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${userDept.isPrimary ? 'ring-1 ring-primary/30 bg-primary/5 border-primary/20' : 'bg-muted/30 hover:bg-muted/50'}`}>
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <RoleIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{userDept.department.name}</span>
                  {userDept.isPrimary && (
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20 px-1.5 py-0.5">
                      <Star className="h-2.5 w-2.5 mr-1" />
                      Primary
                    </Badge>
                  )}
                  <Badge className={`text-xs font-medium px-2 py-0.5 ${roleInfo.color}`}>
                    {roleInfo.label}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-1 flex-shrink-0">
                  {/* Role Selector */}
                  <Select
                    value={userDept.role}
                    onValueChange={(value) => updateDepartmentRole(userDept.department.id, value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-24 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENT_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center space-x-1">
                            <role.icon className="h-3 w-3" />
                            <span className="text-xs">{role.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Primary Toggle */}
                  {!userDept.isPrimary && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrimaryDepartment(userDept.department.id)}
                      disabled={disabled}
                      className="h-7 w-7 p-0 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                      title="Set as primary"
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  
                  {/* Remove Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeDepartment(userDept.department.id)}
                    disabled={disabled}
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Department - Compact Design */}
      {availableDepartments.length > 0 && (
        <div className="p-3 border-dashed border border-muted-foreground/20 rounded-lg hover:border-muted-foreground/40 transition-colors">
          <div className="flex items-center space-x-2">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Add Department</span>
          </div>
          
          <div className="flex items-center space-x-2 mt-2">
            <Select
              value={newDepartmentId}
              onValueChange={setNewDepartmentId}
              disabled={disabled}
            >
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {availableDepartments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    <span className="text-xs">{dept.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={newRole}
              onValueChange={setNewRole}
              disabled={disabled}
            >
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENT_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center space-x-1">
                      <role.icon className="h-3 w-3" />
                      <span className="text-xs">{role.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              onClick={addDepartment}
              disabled={!newDepartmentId || disabled}
              size="sm"
              className="h-8 px-3 bg-primary hover:bg-primary/90 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </div>
      )}

      {availableDepartments.length === 0 && selectedDepartments.length > 0 && (
        <div className="text-center py-2">
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="text-xs">All departments assigned</span>
          </div>
        </div>
      )}

      {selectedDepartments.length === 0 && (
        <div className="text-center py-3">
          <div className="flex flex-col items-center space-y-1 text-muted-foreground">
            <Users className="h-6 w-6" />
            <p className="text-xs font-medium">No departments assigned</p>
            <p className="text-xs opacity-70">Add a department to get started</p>
          </div>
        </div>
      )}
    </div>
  );
};
