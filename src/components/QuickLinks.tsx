import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { defaultQuickLinks, type QuickLink } from '@/data/mockData';
import { generateId, storage } from '@/lib/utils';
import { Plus, Trash2, GripVertical, Link, Globe, FileText, Settings, Mail, Home } from 'lucide-react';
import { useState, useEffect, type FC } from 'react';
import { useWaveAnimation } from '@/hooks/useWaveAnimation';

export const QuickLinks: FC = () => {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const { containerRef, getItemStyle, getItemClassName } = useWaveAnimation();

  // Function to get appropriate icon for a link based on its name or URL
  const getLinkIcon = (name: string, url: string) => {
    const lowerName = name.toLowerCase();
    const lowerUrl = url.toLowerCase();
    
    if (lowerName.includes('mail') || lowerName.includes('email') || lowerUrl.includes('mail')) {
      return <Mail className="h-4 w-4" />;
    }
    if (lowerName.includes('doc') || lowerName.includes('wiki') || lowerName.includes('confluence') || lowerUrl.includes('doc')) {
      return <FileText className="h-4 w-4" />;
    }
    if (lowerName.includes('setting') || lowerName.includes('admin') || lowerName.includes('config')) {
      return <Settings className="h-4 w-4" />;
    }
    if (lowerName.includes('home') || lowerName.includes('dashboard') || lowerName.includes('main')) {
      return <Home className="h-4 w-4" />;
    }
    // Default to globe icon for external links
    return <Globe className="h-4 w-4" />;
  };

  // Load links from localStorage on mount
  useEffect(() => {
    const savedLinks = storage.getQuickLinks();
    if (savedLinks.length === 0) {
      // First time user, use default links
      setLinks(defaultQuickLinks);
      storage.setQuickLinks(defaultQuickLinks);
    } else {
      setLinks(savedLinks);
    }
  }, []);

  const addLink = () => {
    if (!newLinkName.trim() || !newLinkUrl.trim()) return;

    const newLink: QuickLink = {
      id: generateId(),
      name: newLinkName.trim(),
      url: newLinkUrl.trim()
    };

    const updatedLinks = [...links, newLink];
    setLinks(updatedLinks);
    storage.setQuickLinks(updatedLinks);

    // Reset form
    setNewLinkName('');
    setNewLinkUrl('');
    setIsAddDialogOpen(false);
  };

  const removeLink = (id: string) => {
    const updatedLinks = links.filter(link => link.id !== id);
    setLinks(updatedLinks);
    storage.setQuickLinks(updatedLinks);
  };

  const handleLinkClick = (url: string) => {
    // Ensure URL has protocol
    const finalUrl = url.startsWith('http') ? url : `https://${url}`;
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, linkId: string) => {
    setDraggedItem(linkId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, linkId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem(linkId);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const draggedIndex = links.findIndex(link => link.id === draggedItem);
    const targetIndex = links.findIndex(link => link.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newLinks = [...links];
    const [draggedLink] = newLinks.splice(draggedIndex, 1);
    newLinks.splice(targetIndex, 0, draggedLink);

    setLinks(newLinks);
    storage.setQuickLinks(newLinks);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link className="h-5 w-5" />
            My Quick Links
          </CardTitle>
          <CardDescription>Your most-used tools and resources</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[95vw] sm:w-full sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Quick Link</DialogTitle>
              <DialogDescription>
                Add a new link to your quick access list.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="name" className="sm:text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  placeholder="e.g., Company Wiki"
                  className="sm:col-span-3"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="url" className="sm:text-right">
                  URL
                </Label>
                <Input
                  id="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="e.g., wiki.company.com"
                  className="sm:col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={addLink}
                disabled={!newLinkName.trim() || !newLinkUrl.trim()}
                className="w-full sm:w-auto"
              >
                Add Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent ref={containerRef}>
        {links.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No quick links yet.</p>
            <p className="text-xs mt-1">Add your most-used tools and resources.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {links.map((link, index) => (
              <div
                key={link.id}
                onDragOver={(e) => handleDragOver(e, link.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, link.id)}
                className={getItemClassName(`flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 ${
                  dragOverItem === link.id ? 'border-primary bg-primary/10' : ''
                } ${draggedItem === link.id ? 'opacity-50' : ''}`)}
                style={getItemStyle(index)}
              >
                <div className="flex items-center gap-2 flex-1">
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, link.id)}
                    onDragEnd={handleDragEnd}
                    className="cursor-move p-1 rounded hover:bg-muted"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <button
                    onClick={() => handleLinkClick(link.url)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {getLinkIcon(link.name, link.url)}
                    <span className="text-sm font-medium">{link.name}</span>
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLink(link.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
