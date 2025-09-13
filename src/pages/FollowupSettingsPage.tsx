import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PageWrapper, PageSection } from '@/components/PageWrapper';
import { 
  ArrowLeft, 
  Save, 
  RefreshCw, 
  Settings, 
  Clock, 
  Mail, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

interface FollowupSettings {
  enabled: boolean;
  default_delay_hours: number;
  max_followups_per_ticket: number;
  escalation_delay_hours: number;
  auto_close_delay_hours: number;
  business_hours_only: boolean;
  exclude_weekends: boolean;
  exclude_holidays: boolean;
  priority_multipliers: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  category_rules: {
    [key: string]: {
      delay_hours: number;
      max_followups: number;
    };
  };
  escalation_rules: {
    enabled: boolean;
    levels: Array<{
      delay_hours: number;
      action: string;
    }>;
  };
  auto_response_rules: {
    enabled: boolean;
    include_original_content: boolean;
    include_ticket_details: boolean;
    include_support_portal_link: boolean;
    include_escalation_info: boolean;
  };
}

export default function FollowupSettingsPage() {
  const [settings, setSettings] = useState<FollowupSettings>({
    enabled: true,
    default_delay_hours: 72,
    max_followups_per_ticket: 3,
    escalation_delay_hours: 168,
    auto_close_delay_hours: 720,
    business_hours_only: true,
    exclude_weekends: true,
    exclude_holidays: true,
    priority_multipliers: {
      low: 1.0,
      medium: 0.8,
      high: 0.5,
      critical: 0.25
    },
    category_rules: {
      'technical_support': { delay_hours: 48, max_followups: 5 },
      'billing': { delay_hours: 24, max_followups: 2 },
      'general_inquiry': { delay_hours: 72, max_followups: 3 }
    },
    escalation_rules: {
      enabled: true,
      levels: [
        { delay_hours: 168, action: 'notify_manager' },
        { delay_hours: 336, action: 'notify_director' },
        { delay_hours: 504, action: 'notify_executive' }
      ]
    },
    auto_response_rules: {
      enabled: true,
      include_original_content: true,
      include_ticket_details: true,
      include_support_portal_link: true,
      include_escalation_info: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/settings/followup');
      if (response.success && response.data) {
        setSettings(response.data as FollowupSettings);
      }
    } catch (error) {
      console.error('Error loading followup settings:', error);
      toast.error('Failed to load followup settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // Convert settings object to individual API calls
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        namespace: 'followup',
        key,
        value
      }));

      // Update each setting
      for (const setting of settingsArray) {
        await apiClient.put('/api/settings/v2', setting);
      }

      toast.success('Followup settings saved successfully');
    } catch (error) {
      console.error('Error saving followup settings:', error);
      toast.error('Failed to save followup settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    await loadSettings();
    toast.success('Settings refreshed');
  };

  if (loading) {
    return (
      <div className="relative z-0 min-h-screen bg-background">
        <PageWrapper className="max-w-[1500px] lg:pl-[calc(var(--sidebar-width,14rem)+1.5rem)] py-6">
          <PageSection index={0}>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading followup settings...</span>
            </div>
          </PageSection>
        </PageWrapper>
      </div>
    );
  }

  return (
    <div className="relative z-0 min-h-screen bg-background">
      <PageWrapper className="max-w-[1500px] lg:pl-[calc(var(--sidebar-width,14rem)+1.5rem)] py-6">
        {/* Header */}
        <PageSection index={0} className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/settings?tab=tickets">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Settings
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Follow-up Settings</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Configure automatic follow-up management for customer replies
            </p>
          </div>
        </div>
      </PageSection>

      {/* Settings Cards */}
      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Enable Follow-up Management</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically manage customer follow-ups to auto-responses
                </p>
              </div>
              <Switch
                id="enabled"
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default_delay_hours">Default Delay (Hours)</Label>
                <Input
                  id="default_delay_hours"
                  type="number"
                  value={settings.default_delay_hours}
                  onChange={(e) => setSettings(prev => ({ ...prev, default_delay_hours: parseInt(e.target.value) || 72 }))}
                />
                <p className="text-sm text-muted-foreground">Default delay before sending follow-up emails</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_followups_per_ticket">Max Follow-ups per Ticket</Label>
                <Input
                  id="max_followups_per_ticket"
                  type="number"
                  value={settings.max_followups_per_ticket}
                  onChange={(e) => setSettings(prev => ({ ...prev, max_followups_per_ticket: parseInt(e.target.value) || 3 }))}
                />
                <p className="text-sm text-muted-foreground">Maximum number of follow-up emails per ticket</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="escalation_delay_hours">Escalation Delay (Hours)</Label>
                <Input
                  id="escalation_delay_hours"
                  type="number"
                  value={settings.escalation_delay_hours}
                  onChange={(e) => setSettings(prev => ({ ...prev, escalation_delay_hours: parseInt(e.target.value) || 168 }))}
                />
                <p className="text-sm text-muted-foreground">Delay before escalating tickets without response</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auto_close_delay_hours">Auto-close Delay (Hours)</Label>
                <Input
                  id="auto_close_delay_hours"
                  type="number"
                  value={settings.auto_close_delay_hours}
                  onChange={(e) => setSettings(prev => ({ ...prev, auto_close_delay_hours: parseInt(e.target.value) || 720 }))}
                />
                <p className="text-sm text-muted-foreground">Delay before auto-closing tickets without response</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Hours Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Business Hours & Timing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="business_hours_only">Business Hours Only</Label>
                <p className="text-sm text-muted-foreground">
                  Only send follow-ups during business hours
                </p>
              </div>
              <Switch
                id="business_hours_only"
                checked={settings.business_hours_only}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, business_hours_only: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="exclude_weekends">Exclude Weekends</Label>
                <p className="text-sm text-muted-foreground">
                  Exclude weekends from follow-up calculations
                </p>
              </div>
              <Switch
                id="exclude_weekends"
                checked={settings.exclude_weekends}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, exclude_weekends: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="exclude_holidays">Exclude Holidays</Label>
                <p className="text-sm text-muted-foreground">
                  Exclude holidays from follow-up calculations
                </p>
              </div>
              <Switch
                id="exclude_holidays"
                checked={settings.exclude_holidays}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, exclude_holidays: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Priority Multipliers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Priority Multipliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Multipliers for follow-up delays based on ticket priority
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(settings.priority_multipliers).map(([priority, multiplier]) => (
                <div key={priority} className="space-y-2">
                  <Label htmlFor={`priority_${priority}`} className="capitalize">
                    {priority} Priority
                  </Label>
                  <Input
                    id={`priority_${priority}`}
                    type="number"
                    step="0.1"
                    value={multiplier}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      priority_multipliers: {
                        ...prev.priority_multipliers,
                        [priority]: parseFloat(e.target.value) || 1.0
                      }
                    }))}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Auto-Response Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Auto-Response Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto_response_enabled">Enable Auto-Response Rules</Label>
                <p className="text-sm text-muted-foreground">
                  Apply rules to auto-response content
                </p>
              </div>
              <Switch
                id="auto_response_enabled"
                checked={settings.auto_response_rules.enabled}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  auto_response_rules: { ...prev.auto_response_rules, enabled: checked }
                }))}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="include_original_content">Include Original Content</Label>
                <Switch
                  id="include_original_content"
                  checked={settings.auto_response_rules.include_original_content}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    auto_response_rules: { ...prev.auto_response_rules, include_original_content: checked }
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include_ticket_details">Include Ticket Details</Label>
                <Switch
                  id="include_ticket_details"
                  checked={settings.auto_response_rules.include_ticket_details}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    auto_response_rules: { ...prev.auto_response_rules, include_ticket_details: checked }
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include_support_portal_link">Include Support Portal Link</Label>
                <Switch
                  id="include_support_portal_link"
                  checked={settings.auto_response_rules.include_support_portal_link}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    auto_response_rules: { ...prev.auto_response_rules, include_support_portal_link: checked }
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include_escalation_info">Include Escalation Info</Label>
                <Switch
                  id="include_escalation_info"
                  checked={settings.auto_response_rules.include_escalation_info}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    auto_response_rules: { ...prev.auto_response_rules, include_escalation_info: checked }
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </PageWrapper>
    </div>
  );
}
