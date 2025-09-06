import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { menuService, type CreateMenuItemInput, type UpdateMenuItemInput } from '@/lib/services/menuService';
import { permissionService, type Permission } from '@/lib/services/permissionService';
import { Plus, Edit, Trash2, Link, Unlink } from 'lucide-react';

interface MenuItemFlat {
  id: string;
  parentId?: string | null;
  label: string;
  path?: string | null;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  featureFlag?: string | null;
  permissions?: Array<{ permission: Permission }>;
}

export function MenuManagement() {
  const [items, setItems] = useState<MenuItemFlat[]>([]);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItemFlat | null>(null);
  const [form, setForm] = useState<CreateMenuItemInput>({ label: '', path: '', icon: '', parentId: null, sortOrder: 0, isActive: true, featureFlag: '' });

  const [linkDlgOpen, setLinkDlgOpen] = useState(false);
  const [targetItem, setTargetItem] = useState<MenuItemFlat | null>(null);
  const [selectedPermId, setSelectedPermId] = useState('');

  const parents = useMemo(() => items.filter(i => !i.parentId), [items]);

  const load = async () => {
    setLoading(true);
    try {
      const [itemsRes, permsList] = await Promise.all([menuService.listItems(), permissionService.list()]);
      if (itemsRes.success) setItems(itemsRes.data as any);
      setPerms(permsList);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load menu items');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditItem(null); setForm({ label: '', path: '', icon: '', parentId: null, sortOrder: 0, isActive: true, featureFlag: '' }); setDlgOpen(true); };
  const openEdit = (item: MenuItemFlat) => { setEditItem(item); setForm({ label: item.label, path: item.path ?? '', icon: item.icon ?? '', parentId: item.parentId ?? null, sortOrder: item.sortOrder, isActive: item.isActive, featureFlag: item.featureFlag ?? '' }); setDlgOpen(true); };

  const submit = async () => {
    try {
      const payload: CreateMenuItemInput | UpdateMenuItemInput = {
        label: form.label || undefined as any,
        path: (form.path ?? '') || null,
        icon: (form.icon ?? '') || null,
        parentId: form.parentId ?? null,
        sortOrder: form.sortOrder ?? 0,
        isActive: form.isActive ?? true,
        featureFlag: (form.featureFlag ?? '') || null,
      };
      const res = editItem ? await menuService.updateItem(editItem.id, payload) : await menuService.createItem(payload as CreateMenuItemInput);
      if (res.success) {
        toast.success(editItem ? 'Menu item updated' : 'Menu item created');
        setDlgOpen(false);
        setEditItem(null);
        const y = window.scrollY;
        await load();
        window.scrollTo({ top: y });
      } else {
        toast.error(res.error || 'Operation failed');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Operation failed');
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await menuService.deleteItem(id);
      if (res.success) {
        toast.success('Menu item deleted');
        const y = window.scrollY;
        await load();
        window.scrollTo({ top: y });
      }
      else toast.error(res.error || 'Failed to delete');
    } catch (e: any) { toast.error(e?.message || 'Failed to delete'); }
  };

  const openLinkPerm = (item: MenuItemFlat) => { setTargetItem(item); setSelectedPermId(''); setLinkDlgOpen(true); };

  const linkPerm = async () => {
    if (!targetItem || !selectedPermId) return;
    try {
      const res = await menuService.linkPermission(targetItem.id, selectedPermId);
      if (res.success) {
        toast.success('Permission linked');
        setLinkDlgOpen(false);
        const y = window.scrollY;
        await load();
        window.scrollTo({ top: y });
      }
      else toast.error(res.error || 'Failed to link permission');
    } catch (e: any) { toast.error(e?.message || 'Failed to link permission'); }
  };

  const unlinkPerm = async (item: MenuItemFlat, permissionId: string) => {
    try {
      const res = await menuService.unlinkPermission(item.id, permissionId);
      if (res.success) {
        toast.success('Permission unlinked');
        const y = window.scrollY;
        await load();
        window.scrollTo({ top: y });
      }
      else toast.error(res.error || 'Failed to unlink permission');
    } catch (e: any) { toast.error(e?.message || 'Failed to unlink permission'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Menu Items</h3>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> New Item</Button>
      </div>
      <Separator />
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{item.label} <span className="text-xs text-muted-foreground">({item.sortOrder})</span></div>
                  <div className="text-xs text-muted-foreground">{item.path || '#'} {item.icon ? `· ${item.icon}` : ''} {item.parentId ? '· child' : '· root'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}><Edit className="h-4 w-4 mr-1" /> Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => openLinkPerm(item)}><Link className="h-4 w-4 mr-1" /> Link Permission</Button>
                  <Button variant="outline" size="sm" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                </div>
              </div>
              {item.permissions && item.permissions.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className="text-muted-foreground mb-1">Permissions:</div>
                  <div className="flex flex-wrap gap-2">
                    {item.permissions.map((rp) => (
                      <span key={rp.permission.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-muted-foreground">
                        {rp.permission.key}
                        <button type="button" className="ml-1" onClick={() => unlinkPerm(item, rp.permission.id)} title="Unlink">
                          <Unlink className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Menu Item' : 'New Menu Item'}</DialogTitle>
            <DialogDescription>Configure label, path, and hierarchy.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={form.label ?? ''} onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Path</Label>
              <Input value={form.path ?? ''} onChange={(e) => setForm(f => ({ ...f, path: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Input value={form.icon ?? ''} onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Parent</Label>
              <select className="border rounded h-9 px-2 text-sm w-full" value={form.parentId ?? ''} onChange={(e) => setForm(f => ({ ...f, parentId: e.target.value ? e.target.value : null }))}>
                <option value="">(root)</option>
                {parents.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgOpen(false)}>Cancel</Button>
            <Button onClick={submit}>{editItem ? 'Save Changes' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDlgOpen} onOpenChange={setLinkDlgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Permission</DialogTitle>
            <DialogDescription>Select a permission to link to this menu item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Permission</Label>
            <select className="border rounded h-9 px-2 text-sm w-full" value={selectedPermId} onChange={(e) => setSelectedPermId(e.target.value)}>
              <option value="">Select permission...</option>
              {perms.map(p => <option key={p.id} value={p.id}>{p.key}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDlgOpen(false)}>Cancel</Button>
            <Button onClick={linkPerm} disabled={!selectedPermId}>Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
