import React, { useEffect, useMemo, useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { departmentService, type CreateDepartmentInput, type DepartmentDto, type UpdateDepartmentInput } from '@/lib/services/departmentService';

export function DepartmentSettings() {
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<DepartmentDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentDto | null>(null);

  const [form, setForm] = useState<{ name: string; description: string; managerId: string | null; parentId: string | null }>({
    name: '',
    description: '',
    managerId: null,
    parentId: null,
  });

  const totalUsers = useMemo(() => {
    return departments.reduce((sum, d) => sum + (d._count?.users ?? 0), 0);
  }, [departments]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await departmentService.list();
      if (res.success && Array.isArray(res.data)) {
        setDepartments(res.data);
      } else {
        toast.error(res.error || 'Failed to load departments');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', managerId: null, parentId: null });
    setDialogOpen(true);
  };

  const openEdit = (dept: DepartmentDto) => {
    setEditing(dept);
    setForm({
      name: dept.name,
      description: (dept.description ?? ''),
      managerId: dept.manager?.id ?? null,
      parentId: dept.parentId ?? null,
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    const payload: CreateDepartmentInput | UpdateDepartmentInput = {
      name: form.name || undefined as any,
      description: form.description || undefined,
      managerId: form.managerId,
      parentId: form.parentId,
    };

    try {
      let res;
      if (editing) {
        res = await departmentService.update(editing.id, payload as UpdateDepartmentInput);
      } else {
        res = await departmentService.create(payload as CreateDepartmentInput);
      }

      if (res.success) {
        toast.success(editing ? 'Department updated' : 'Department created');
        setDialogOpen(false);
        setEditing(null);
        await load();
      } else {
        toast.error(res.error || 'Operation failed');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Operation failed');
    }
  };

  const confirmDelete = (dept: DepartmentDto) => {
    setDeleteTarget(dept);
    setDeleteDialogOpen(true);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await departmentService.remove(deleteTarget.id);
      if (res.success) {
        toast.success('Department deleted');
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        await load();
      } else {
        toast.error(res.error || 'Failed to delete');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button onClick={openCreate} variant="outline">
          <Plus className="h-4 w-4 mr-2" /> Add Department
        </Button>
      </div>

      <Separator />

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          departments.map((dept) => (
            <div key={dept.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">{dept.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {dept.description || 'No description'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Manager: {dept.manager ? `${dept.manager.firstName} ${dept.manager.lastName}` : '—'} · Users: {dept._count?.users ?? 0}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(dept)}>
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => confirmDelete(dept)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Department' : 'Add Department'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update department details' : 'Create a new department'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deptName">Name</Label>
              <Input id="deptName" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deptDesc">Description</Label>
              <Input id="deptDesc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit}>{editing ? 'Save Changes' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure you want to delete {deleteTarget?.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={doDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
