import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DepartmentService } from '@/lib/services/departmentService';
import type { Department } from '@/lib/services/departmentService';
import { Loader2 } from 'lucide-react';

interface DepartmentFilterProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showAssignedTo?: boolean;
}

export function DepartmentFilter({ 
  value, 
  onChange, 
  placeholder = "Select department",
  showAssignedTo = false 
}: DepartmentFilterProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDepartments = async () => {
      setLoading(true);
      try {
        const response = await DepartmentService.getDepartments();
        if (response.success && response.data) {
          setDepartments(response.data);
        }
      } catch (error) {
        console.error('Failed to load departments:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDepartments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading departments...</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Departments</SelectItem>
        {departments.map((dept) => (
          <SelectItem key={dept.id} value={dept.name}>
            {dept.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
