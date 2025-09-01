// Settings service for managing ticketing system configuration

export interface CompanyInfo {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  timezone: string;
  language: string;
  currency: string;
  businessHours: {
    start: string;
    end: string;
    timezone: string;
  };
}

export interface TicketCategory {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface TicketPriority {
  id: string;
  name: string;
  color: string;
  slaHours: number;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export interface TicketStatus {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface Department {
  id: string;
  name: string;
  manager: string;
}

export interface EmailNotifications {
  enabled: boolean;
  ticketCreated: boolean;
  ticketUpdated: boolean;
  ticketResolved: boolean;
  slaBreach: boolean;
}

export interface InAppNotifications {
  enabled: boolean;
  ticketAssigned: boolean;
  ticketEscalated: boolean;
  newComment: boolean;
}

export interface SystemSettings {
  general: CompanyInfo;
  tickets: {
    categories: TicketCategory[];
    priorities: TicketPriority[];
    statuses: TicketStatus[];
  };
  users: {
    roles: UserRole[];
    departments: Department[];
  };
  notifications: {
    email: EmailNotifications;
    inApp: InAppNotifications;
  };
}

// Default settings with proper color codes matching the existing system
const defaultSettings: SystemSettings = {
  general: {
    companyName: 'TicketHub Inc.',
    companyEmail: 'support@tickethub.com',
    companyPhone: '+1 (555) 123-4567',
    companyAddress: '123 Business St, Suite 100, City, State 12345',
    timezone: 'America/New_York',
    language: 'en',
    currency: 'USD',
    businessHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'America/New_York'
    }
  },
  tickets: {
    categories: [
      { id: '1', name: 'Technical Support', color: 'blue', description: 'Hardware and software issues' },
      { id: '2', name: 'Billing', color: 'green', description: 'Payment and subscription issues' },
      { id: '3', name: 'Feature Request', color: 'purple', description: 'New feature suggestions' },
      { id: '4', name: 'Bug Report', color: 'red', description: 'System bugs and errors' }
    ],
    priorities: [
             { 
         id: '1', 
         name: 'Low', 
         color: 'green', 
         slaHours: 72,
         bgColor: 'bg-green-500',
         textColor: 'text-white',
         borderColor: 'border-green-600'
       },
             { 
         id: '2', 
         name: 'Medium', 
         color: 'yellow', 
         slaHours: 24,
         bgColor: 'bg-yellow-500',
         textColor: 'text-white',
         borderColor: 'border-yellow-600'
       },
             { 
         id: '3', 
         name: 'High', 
         color: 'orange', 
         slaHours: 8,
         bgColor: 'bg-orange-500',
         textColor: 'text-white',
         borderColor: 'border-orange-600'
       },
             { 
         id: '4', 
         name: 'Critical', 
         color: 'red', 
         slaHours: 2,
         bgColor: 'bg-red-500',
         textColor: 'text-white',
         borderColor: 'border-red-600'
       }
    ],
    statuses: [
      { 
        id: '1', 
        name: 'Open', 
        color: 'blue',
        bgColor: 'bg-blue-200',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-300'
      },
      { 
        id: '2', 
        name: 'In Progress', 
        color: 'yellow',
        bgColor: 'bg-yellow-500',
        textColor: 'text-white',
        borderColor: 'border-yellow-600'
      },
      { 
        id: '3', 
        name: 'Pending', 
        color: 'orange',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200'
      },
      { 
        id: '4', 
        name: 'Resolved', 
        color: 'green',
        bgColor: 'bg-green-200',
        textColor: 'text-green-800',
        borderColor: 'border-green-300'
      },
      { 
        id: '5', 
        name: 'Closed', 
        color: 'gray',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200'
      }
    ]
  },
  users: {
    roles: [
      { id: '1', name: 'Admin', permissions: ['all'] },
      { id: '2', name: 'Manager', permissions: ['manage_team', 'view_reports', 'manage_tickets'] },
      { id: '3', name: 'Agent', permissions: ['handle_tickets', 'view_knowledge_base'] },
      { id: '4', name: 'Customer', permissions: ['submit_tickets', 'view_own_tickets'] }
    ],
    departments: [
      { id: '1', name: 'Technical Support', manager: 'John Smith' },
      { id: '2', name: 'Customer Success', manager: 'Sarah Johnson' },
      { id: '3', name: 'Billing', manager: 'Mike Davis' }
    ]
  },
  notifications: {
    email: {
      enabled: true,
      ticketCreated: true,
      ticketUpdated: true,
      ticketResolved: true,
      slaBreach: true
    },
    inApp: {
      enabled: true,
      ticketAssigned: true,
      ticketEscalated: true,
      newComment: true
    }
  }
};

// Local storage key
const SETTINGS_STORAGE_KEY = 'tickethub-settings';

// Settings service class
export class SettingsService {
  private static instance: SettingsService;
  private settings: SystemSettings;

  private constructor() {
    this.settings = this.loadSettings();
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  // Load settings from localStorage or use defaults
  private loadSettings(): SystemSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return defaultSettings;
  }

  // Save settings to localStorage
  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  // Get all settings
  public getSettings(): SystemSettings {
    return { ...this.settings };
  }

  // Update settings
  public updateSettings(newSettings: Partial<SystemSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  // Update specific section
  public updateSection<K extends keyof SystemSettings>(
    section: K,
    data: SystemSettings[K]
  ): void {
    this.settings[section] = data;
    this.saveSettings();
  }

  // Get company info
  public getCompanyInfo(): CompanyInfo {
    return { ...this.settings.general };
  }

  // Update company info
  public updateCompanyInfo(info: Partial<CompanyInfo>): void {
    this.settings.general = { ...this.settings.general, ...info };
    this.saveSettings();
  }

  // Get ticket categories
  public getTicketCategories(): TicketCategory[] {
    return [...this.settings.tickets.categories];
  }

  // Add ticket category
  public addTicketCategory(category: Omit<TicketCategory, 'id'>): TicketCategory {
    const newCategory: TicketCategory = {
      ...category,
      id: Date.now().toString()
    };
    this.settings.tickets.categories.push(newCategory);
    this.saveSettings();
    return newCategory;
  }

  // Update ticket category
  public updateTicketCategory(id: string, updates: Partial<TicketCategory>): void {
    const index = this.settings.tickets.categories.findIndex(cat => cat.id === id);
    if (index !== -1) {
      this.settings.tickets.categories[index] = {
        ...this.settings.tickets.categories[index],
        ...updates
      };
      this.saveSettings();
    }
  }

  // Delete ticket category
  public deleteTicketCategory(id: string): void {
    this.settings.tickets.categories = this.settings.tickets.categories.filter(
      cat => cat.id !== id
    );
    this.saveSettings();
  }

  // Get ticket priorities
  public getTicketPriorities(): TicketPriority[] {
    return [...this.settings.tickets.priorities];
  }

  // Get ticket statuses
  public getTicketStatuses(): TicketStatus[] {
    return [...this.settings.tickets.statuses];
  }

  // Get user roles
  public getUserRoles(): UserRole[] {
    return [...this.settings.users.roles];
  }

  // Get departments
  public getDepartments(): Department[] {
    return [...this.settings.users.departments];
  }

  // Get notification settings
  public getNotificationSettings() {
    return {
      email: { ...this.settings.notifications.email },
      inApp: { ...this.settings.notifications.inApp }
    };
  }

  // Update notification settings
  public updateNotificationSettings(
    type: 'email' | 'inApp',
    settings: Partial<EmailNotifications | InAppNotifications>
  ): void {
    if (type === 'email') {
      this.settings.notifications.email = {
        ...this.settings.notifications.email,
        ...(settings as Partial<EmailNotifications>)
      };
    } else {
      this.settings.notifications.inApp = {
        ...this.settings.notifications.inApp,
        ...(settings as Partial<InAppNotifications>)
      };
    }
    this.saveSettings();
  }

  // Reset to defaults
  public resetToDefaults(): void {
    this.settings = { ...defaultSettings };
    this.saveSettings();
  }

  // Export settings
  public exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  // Import settings
  public importSettings(settingsJson: string): boolean {
    try {
      const imported = JSON.parse(settingsJson);
      this.settings = { ...defaultSettings, ...imported };
      this.saveSettings();
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  }
}

// Export singleton instance
export const settingsService = SettingsService.getInstance();
