// Mock data for Ticketing System
// Repurposed from Nexus intranet dashboard

export interface User {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  email?: string;
  phone?: string;
  location?: string;
  isAgent?: boolean; // Whether user is a support agent
  skills?: string[]; // Technical skills for agents
}

export interface TicketTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number; // 0-100
  ticketId: string; // Reference to parent ticket
  assignedTo?: string;
  dueDate?: Date;
  startDate: Date;
  completedDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
}

export interface TicketEvent {
  id: string;
  title: string;
  date: Date;
  type: 'ticket-due' | 'sla-deadline' | 'agent-assignment' | 'follow-up' | 'escalation';
  ticketId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  assignedTo?: string;
}

export interface TicketMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changeType: 'increase' | 'decrease';
  unit: string;
  icon: string;
}

export interface TicketActivityData {
  date: string;
  ticketsCreated: number;
  ticketsResolved: number;
  ticketsEscalated: number;
  avgResolutionTime: number;
}

export interface DepartmentPerformanceData {
  department: string;
  ticketsHandled: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  slaCompliance: number;
}

export interface TicketStatusData {
  status: string;
  count: number;
  percentage: number;
}

export interface TicketCategoryData {
  category: string;
  count: number;
  avgResolutionTime: number;
  escalationRate: number;
}

export interface TicketTrendData {
  month: string;
  ticketsCreated: number;
  ticketsResolved: number;
  avgResponseTime: number;
  avgResolutionTime: number;
}

// Helpdesk Types
export interface TicketAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface HelpdeskTicket {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed' | 'escalated';
  submittedBy: string;
  submittedAt: Date;
  assignedTo?: string;
  assignedAt?: Date;
  dueDate?: Date;
  resolvedAt?: Date;
  resolution?: string;
  satisfaction?: number;
  tags?: string[];
  attachments?: TicketAttachment[];
  comments?: HelpdeskComment[];
}

export interface HelpdeskComment {
  id: string;
  ticketId: string;
  author: string;
  content: string;
  timestamp: Date;
  isInternal: boolean;
  attachments?: TicketAttachment[];
}

export interface HelpdeskCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  estimatedResolutionTime: string;
  slaHours: number;
}

export interface HelpdeskKnowledgeBase {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  views: number;
  helpful: number;
  lastUpdated: Date;
  author?: string;
  attachments?: string[];
}

// Current user data
export const currentUser: User = {
  id: '1',
  name: 'John Support',
  role: 'Senior Support Agent',
  department: 'IT Support',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
  email: 'john.support@company.com',
  phone: '+1 (555) 123-4567',
  location: 'San Francisco, CA',
  isAgent: true,
  skills: ['Network', 'Hardware', 'Software', 'Security']
};

// Support team users
export const supportUsers: User[] = [
  {
    id: '1',
    name: 'John Support',
    role: 'Senior Support Agent',
    department: 'IT Support',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    email: 'john.support@company.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    isAgent: true,
    skills: ['Network', 'Hardware', 'Software', 'Security']
  },
  {
    id: '2',
    name: 'Sarah Tech',
    role: 'Technical Specialist',
    department: 'IT Support',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    email: 'sarah.tech@company.com',
    phone: '+1 (555) 234-5678',
    location: 'New York, NY',
    isAgent: true,
    skills: ['Software', 'Database', 'Cloud', 'DevOps']
  },
  {
    id: '3',
    name: 'Mike Hardware',
    role: 'Hardware Specialist',
    department: 'IT Support',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    email: 'mike.hardware@company.com',
    phone: '+1 (555) 345-6789',
    location: 'Los Angeles, CA',
    isAgent: true,
    skills: ['Hardware', 'Peripherals', 'Networking', 'Mobile']
  },
  {
    id: '4',
    name: 'Lisa Network',
    role: 'Network Engineer',
    department: 'IT Support',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
    email: 'lisa.network@company.com',
    phone: '+1 (555) 456-7890',
    location: 'Austin, TX',
    isAgent: true,
    skills: ['Network', 'Security', 'Infrastructure', 'VPN']
  },
  {
    id: '5',
    name: 'David Security',
    role: 'Security Specialist',
    department: 'IT Support',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    email: 'david.security@company.com',
    phone: '+1 (555) 567-8901',
    location: 'Seattle, WA',
    isAgent: true,
    skills: ['Security', 'Compliance', 'Access Control', 'Audit']
  },
  {
    id: '6',
    name: 'Emma Customer',
    role: 'Customer',
    department: 'Marketing',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    email: 'emma.customer@company.com',
    phone: '+1 (555) 678-9012',
    location: 'Chicago, IL',
    isAgent: false
  },
  {
    id: '7',
    name: 'Alex Manager',
    role: 'Support Manager',
    department: 'IT Support',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    email: 'alex.manager@company.com',
    phone: '+1 (555) 789-0123',
    location: 'San Francisco, CA',
    isAgent: true,
    skills: ['Management', 'Escalation', 'SLA', 'Reporting']
  }
];

// Ticket tasks data
export const ticketTasks: TicketTask[] = [
  {
    id: 'TT-001',
    title: 'Investigate email authentication',
    description: 'Check email server logs and authentication settings',
    status: 'in-progress',
    priority: 'high',
    progress: 60,
    ticketId: 'HT-001',
    assignedTo: 'John Support',
    dueDate: new Date('2025-01-25T17:00:00'),
    startDate: new Date('2025-01-22T09:00:00'),
    estimatedHours: 4,
    actualHours: 2.5
  },
  {
    id: 'TT-002',
    title: 'Reset user password',
    description: 'Reset password and verify access',
    status: 'completed',
    priority: 'medium',
    progress: 100,
    ticketId: 'HT-001',
    assignedTo: 'Sarah Tech',
    dueDate: new Date('2025-01-23T17:00:00'),
    startDate: new Date('2025-01-22T10:00:00'),
    completedDate: new Date('2025-01-22T11:30:00'),
    estimatedHours: 1,
    actualHours: 1.5
  },
  {
    id: 'TT-003',
    title: 'Diagnose laptop performance',
    description: 'Run diagnostics and identify performance bottlenecks',
    status: 'pending',
    priority: 'medium',
    progress: 0,
    ticketId: 'HT-002',
    assignedTo: 'Mike Hardware',
    dueDate: new Date('2025-01-26T17:00:00'),
    startDate: new Date('2025-01-22T14:00:00'),
    estimatedHours: 3,
    actualHours: 0
  },
  {
    id: 'TT-004',
    title: 'Check printer connectivity',
    description: 'Verify network connection and driver status',
    status: 'completed',
    priority: 'low',
    progress: 100,
    ticketId: 'HT-003',
    assignedTo: 'Mike Hardware',
    dueDate: new Date('2025-01-22T17:00:00'),
    startDate: new Date('2025-01-21T14:30:00'),
    completedDate: new Date('2025-01-22T08:00:00'),
    estimatedHours: 2,
    actualHours: 1.5
  },
  {
    id: 'TT-005',
    title: 'Renew software license',
    description: 'Contact vendor and process license renewal',
    status: 'in-progress',
    priority: 'critical',
    progress: 80,
    ticketId: 'HT-004',
    assignedTo: 'Sarah Tech',
    dueDate: new Date('2025-01-23T17:00:00'),
    startDate: new Date('2025-01-22T12:00:00'),
    estimatedHours: 2,
    actualHours: 1.6
  }
];

// Ticket calendar events
export const ticketEvents: TicketEvent[] = [
  {
    id: 'TE-001',
    title: 'HT-001 Due',
    date: new Date('2025-01-25T17:00:00'),
    type: 'ticket-due',
    ticketId: 'HT-001',
    priority: 'high',
    description: 'Email access issue resolution due',
    assignedTo: 'John Support'
  },
  {
    id: 'TE-002',
    title: 'HT-002 SLA Deadline',
    date: new Date('2025-01-26T17:00:00'),
    type: 'sla-deadline',
    ticketId: 'HT-002',
    priority: 'medium',
    description: 'Laptop performance issue SLA deadline',
    assignedTo: 'Mike Hardware'
  },
  {
    id: 'TE-003',
    title: 'HT-004 Escalation',
    date: new Date('2025-01-23T12:00:00'),
    type: 'escalation',
    ticketId: 'HT-004',
    priority: 'critical',
    description: 'Software license issue escalated to management',
    assignedTo: 'Alex Manager'
  },
  {
    id: 'TE-004',
    title: 'HT-003 Follow-up',
    date: new Date('2025-01-24T10:00:00'),
    type: 'follow-up',
    ticketId: 'HT-003',
    priority: 'low',
    description: 'Printer issue resolution follow-up',
    assignedTo: 'Mike Hardware'
  },
  {
    id: 'TE-005',
    title: 'HT-005 Assignment',
    date: new Date('2025-01-27T09:00:00'),
    type: 'agent-assignment',
    ticketId: 'HT-005',
    priority: 'medium',
    description: 'New VPN access request assigned',
    assignedTo: 'Lisa Network'
  }
];

// Ticket analytics metrics
export const ticketMetrics: TicketMetric[] = [
  {
    id: 'TM-001',
    name: 'Open Tickets',
    value: 12,
    previousValue: 15,
    change: -20,
    changeType: 'decrease',
    unit: 'tickets',
    icon: 'AlertCircle'
  },
  {
    id: 'TM-002',
    name: 'Avg Resolution Time',
    value: 4.2,
    previousValue: 5.1,
    change: -17.6,
    changeType: 'decrease',
    unit: 'hours',
    icon: 'Clock'
  },
  {
    id: 'TM-003',
    name: 'SLA Compliance',
    value: 94.5,
    previousValue: 91.2,
    change: 3.6,
    changeType: 'increase',
    unit: '%',
    icon: 'CheckCircle'
  },
  {
    id: 'TM-004',
    name: 'Customer Satisfaction',
    value: 4.6,
    previousValue: 4.3,
    change: 7.0,
    changeType: 'increase',
    unit: '/5',
    icon: 'Star'
  }
];

// Ticket activity data for charts
export const ticketActivityData: TicketActivityData[] = [
  { date: '2025-01-15', ticketsCreated: 8, ticketsResolved: 7, ticketsEscalated: 1, avgResolutionTime: 3.2 },
  { date: '2025-01-16', ticketsCreated: 12, ticketsResolved: 9, ticketsEscalated: 2, avgResolutionTime: 4.1 },
  { date: '2025-01-17', ticketsCreated: 6, ticketsResolved: 8, ticketsEscalated: 0, avgResolutionTime: 2.8 },
  { date: '2025-01-18', ticketsCreated: 15, ticketsResolved: 12, ticketsEscalated: 3, avgResolutionTime: 5.2 },
  { date: '2025-01-19', ticketsCreated: 9, ticketsResolved: 11, ticketsEscalated: 1, avgResolutionTime: 3.9 },
  { date: '2025-01-20', ticketsCreated: 7, ticketsResolved: 6, ticketsEscalated: 1, avgResolutionTime: 3.1 },
  { date: '2025-01-21', ticketsCreated: 11, ticketsResolved: 10, ticketsEscalated: 2, avgResolutionTime: 4.3 }
];

// Department performance data
export const departmentPerformanceData: DepartmentPerformanceData[] = [
  {
    department: 'IT Support',
    ticketsHandled: 45,
    avgResolutionTime: 3.8,
    satisfactionScore: 4.6,
    slaCompliance: 94.5
  },
  {
    department: 'Hardware Support',
    ticketsHandled: 28,
    avgResolutionTime: 5.2,
    satisfactionScore: 4.4,
    slaCompliance: 91.2
  },
  {
    department: 'Software Support',
    ticketsHandled: 32,
    avgResolutionTime: 4.1,
    satisfactionScore: 4.7,
    slaCompliance: 96.8
  },
  {
    department: 'Network Support',
    ticketsHandled: 19,
    avgResolutionTime: 6.5,
    satisfactionScore: 4.3,
    slaCompliance: 88.9
  }
];

// Ticket status distribution
export const ticketStatusData: TicketStatusData[] = [
  { status: 'Open', count: 12, percentage: 25.5 },
  { status: 'In Progress', count: 18, percentage: 38.3 },
  { status: 'Resolved', count: 15, percentage: 31.9 },
  { status: 'Closed', count: 2, percentage: 4.3 }
];

// Ticket category analysis
export const ticketCategoryData: TicketCategoryData[] = [
  {
    category: 'Hardware',
    count: 15,
    avgResolutionTime: 5.2,
    escalationRate: 12.5
  },
  {
    category: 'Software',
    count: 22,
    avgResolutionTime: 4.1,
    escalationRate: 8.3
  },
  {
    category: 'Network',
    count: 8,
    avgResolutionTime: 6.5,
    escalationRate: 18.7
  },
  {
    category: 'Access',
    count: 12,
    avgResolutionTime: 2.8,
    escalationRate: 5.2
  }
];

// Ticket trends data
export const ticketTrendData: TicketTrendData[] = [
  { month: 'Jan', ticketsCreated: 45, ticketsResolved: 42, avgResponseTime: 1.2, avgResolutionTime: 4.2 },
  { month: 'Feb', ticketsCreated: 52, ticketsResolved: 48, avgResponseTime: 1.1, avgResolutionTime: 3.9 },
  { month: 'Mar', ticketsCreated: 38, ticketsResolved: 41, avgResponseTime: 1.3, avgResolutionTime: 4.5 },
  { month: 'Apr', ticketsCreated: 61, ticketsResolved: 58, avgResponseTime: 1.0, avgResolutionTime: 3.8 },
  { month: 'May', ticketsCreated: 47, ticketsResolved: 49, avgResponseTime: 1.2, avgResolutionTime: 4.1 },
  { month: 'Jun', ticketsCreated: 55, ticketsResolved: 52, avgResponseTime: 1.1, avgResolutionTime: 3.9 }
];

// Helpdesk Categories
export const helpdeskCategories: HelpdeskCategory[] = [
  {
    id: 'hardware',
    name: 'Hardware Issues',
    description: 'Computer, printer, and device problems',
    icon: 'Monitor',
    estimatedResolutionTime: '1-2 days',
    slaHours: 48
  },
  {
    id: 'software',
    name: 'Software Support',
    description: 'Application and software-related issues',
    icon: 'Settings',
    estimatedResolutionTime: '4-8 hours',
    slaHours: 8
  },
  {
    id: 'network',
    name: 'Network Issues',
    description: 'Network, server, and connectivity problems',
    icon: 'Wifi',
    estimatedResolutionTime: '2-4 hours',
    slaHours: 4
  },
  {
    id: 'access',
    name: 'Account & Access',
    description: 'Login, permissions, and account issues',
    icon: 'Key',
    estimatedResolutionTime: '1-2 hours',
    slaHours: 2
  },
  {
    id: 'mobile',
    name: 'Mobile Support',
    description: 'Mobile device and app issues',
    icon: 'Smartphone',
    estimatedResolutionTime: '4-6 hours',
    slaHours: 6
  }
];

// Helpdesk Tickets
export const helpdeskTickets: HelpdeskTicket[] = [
  {
    id: 'HT-001',
    ticketNumber: 1001,
    title: 'Cannot access company email',
    description: '<p>I\'m experiencing issues with my company email account. Here are the details:</p><ul><li><strong>Error Message:</strong> "Authentication failed. Please check your credentials."</li><li><strong>Browser:</strong> Chrome (latest version)</li><li><strong>Time:</strong> Started this morning at 9:00 AM</li></ul><p>I\'ve tried the following troubleshooting steps:</p><ol><li>Cleared browser cache and cookies</li><li>Reset my password through the self-service portal</li><li>Tried accessing from different browsers (Firefox, Edge)</li></ol><p>None of these steps resolved the issue. I need immediate access to my email for an important client meeting this afternoon.</p><p>Please see the attached screenshot of the error message.</p>',
    category: 'access',
    priority: 'high',
    status: 'in-progress',
    submittedBy: 'Emma Customer',
    submittedAt: new Date('2025-01-22T09:00:00'),
    assignedTo: 'John Support',
    assignedAt: new Date('2025-01-22T09:15:00'),
    dueDate: new Date('2025-01-25T17:00:00'),
    tags: ['email', 'authentication', 'urgent'],
    attachments: [
      {
        id: 'att-001',
        name: 'error-screenshot.png',
        size: 245760,
        type: 'image/png',
        url: 'https://via.placeholder.com/800x600/ff6b6b/ffffff?text=Error+Screenshot',
        uploadedAt: new Date('2025-01-22T09:05:00'),
        uploadedBy: 'Emma Customer'
      },
      {
        id: 'att-002',
        name: 'browser-details.pdf',
        size: 102400,
        type: 'application/pdf',
        url: 'https://via.placeholder.com/800x600/4ecdc4/ffffff?text=Browser+Details+PDF',
        uploadedAt: new Date('2025-01-22T09:10:00'),
        uploadedBy: 'Emma Customer'
      }
    ],
    comments: [
      {
        id: 'com-001',
        ticketId: 'HT-001',
        author: 'John Support',
        content: '<p>Thank you for the detailed information and screenshots. I can see the authentication error you\'re experiencing.</p><p>I\'ve checked your account status and found that your email account was temporarily locked due to multiple failed login attempts. This is a security measure.</p><p><strong>Action taken:</strong></p><ul><li>Unlocked your email account</li><li>Reset your password to a temporary one</li><li>Sent the new password to your backup email</li></ul><p>Please check your backup email for the temporary password and let me know if you can access your account now.</p>',
        timestamp: new Date('2025-01-22T09:30:00'),
        isInternal: false
      },
      {
        id: 'com-002',
        ticketId: 'HT-001',
        author: 'Emma Customer',
        content: '<p>Thank you John! I received the temporary password and was able to access my email successfully. I\'ve also changed it to a new secure password as recommended.</p><p>Everything is working perfectly now. I appreciate the quick response!</p>',
        timestamp: new Date('2025-01-22T10:15:00'),
        isInternal: false
      },
      {
        id: 'com-003',
        ticketId: 'HT-001',
        author: 'John Support',
        content: '<p>Excellent! I\'m glad we could resolve this quickly. I\'ve also enabled two-factor authentication on your account to prevent similar issues in the future.</p><p>Please check your email for the 2FA setup instructions. Let me know if you need any help with the setup.</p>',
        timestamp: new Date('2025-01-22T10:45:00'),
        isInternal: false
      },
      {
        id: 'com-004',
        ticketId: 'HT-001',
        author: 'Sarah Tech',
        content: '<p>Internal Note: Account security has been enhanced. Monitoring for any suspicious activity.</p>',
        timestamp: new Date('2025-01-22T11:00:00'),
        isInternal: true
      }
    ]
  },
  {
    id: 'HT-002',
    ticketNumber: 1002,
    title: 'Laptop running very slow',
    description: '<p>My laptop has been experiencing severe performance issues for the past week. Here\'s what I\'ve observed:</p><h3>Performance Issues:</h3><ul><li><strong>Startup time:</strong> Takes 5+ minutes to fully boot</li><li><strong>Application loading:</strong> 30-60 seconds to open basic apps like Word or Excel</li><li><strong>System responsiveness:</strong> 10-15 second delays when clicking buttons</li><li><strong>Fan noise:</strong> Constantly running at high speed</li></ul><h3>System Information:</h3><ul><li><strong>Model:</strong> Dell Latitude 5520</li><li><strong>OS:</strong> Windows 11 Pro</li><li><strong>RAM:</strong> 16GB</li><li><strong>Storage:</strong> 512GB SSD (showing 85% full)</li></ul><p>I\'ve already tried:</p><ol><li>Restarting the computer multiple times</li><li>Running Windows Defender scan (no threats found)</li><li>Clearing temporary files</li><li>Updating Windows</li></ol><p>This is affecting my productivity significantly. Please help!</p>',
    category: 'hardware',
    priority: 'medium',
    status: 'open',
    submittedBy: 'Alex Manager',
    submittedAt: new Date('2025-01-22T10:30:00'),
    dueDate: new Date('2025-01-26T17:00:00'),
    tags: ['performance', 'laptop', 'slow'],
    attachments: [
      {
        id: 'att-003',
        name: 'task-manager-screenshot.png',
        size: 189440,
        type: 'image/png',
        url: 'https://via.placeholder.com/800x600/45b7d1/ffffff?text=Task+Manager+Screenshot',
        uploadedAt: new Date('2025-01-22T10:35:00'),
        uploadedBy: 'Alex Manager'
      }
    ],
    comments: [
      {
        id: 'com-005',
        ticketId: 'HT-002',
        author: 'Mike Hardware',
        content: '<p>Hi Alex, I\'ve reviewed your laptop performance issue. Based on the task manager screenshot, I can see several potential causes:</p><ul><li><strong>High CPU usage</strong> from background processes</li><li><strong>Low available RAM</strong> (only 2GB free out of 16GB)</li><li><strong>Disk space</strong> is at 85% capacity</li></ul><p>Let\'s start with some immediate fixes:</p><ol><li>Close unnecessary applications and browser tabs</li><li>Run Disk Cleanup to free up space</li><li>Restart your computer</li></ol><p>I\'ll schedule a remote session tomorrow to perform a deeper analysis.</p>',
        timestamp: new Date('2025-01-22T11:00:00'),
        isInternal: false
      },
      {
        id: 'com-006',
        ticketId: 'HT-002',
        author: 'Alex Manager',
        content: '<p>Thanks Mike! I\'ve tried those steps and it\'s running a bit better now. I freed up about 10GB of space and closed some unnecessary programs.</p><p>However, it\'s still slower than normal. Looking forward to the remote session tomorrow.</p>',
        timestamp: new Date('2025-01-22T14:30:00'),
        isInternal: false
      },
      {
        id: 'com-007',
        ticketId: 'HT-002',
        author: 'Mike Hardware',
        content: '<p>Great progress! I\'ve scheduled the remote session for tomorrow at 10:00 AM. I\'ll also bring some diagnostic tools to check for:</p><ul><li>Hardware health (SSD, RAM)</li><li>Background services</li><li>Startup programs</li><li>Driver updates</li></ul><p>Please make sure your laptop is connected to the network and you\'re available for the session.</p>',
        timestamp: new Date('2025-01-22T15:00:00'),
        isInternal: false
      },
      {
        id: 'com-008',
        ticketId: 'HT-002',
        author: 'Lisa Network',
        content: '<p>Internal Note: Checked network logs - no connectivity issues detected. Performance issue appears to be local to the device.</p>',
        timestamp: new Date('2025-01-22T16:00:00'),
        isInternal: true
      }
    ]
  },
  {
    id: 'HT-003',
    ticketNumber: 1003,
    title: 'Printer not working in conference room',
    description: 'The printer in Conference Room B is not responding to print jobs.',
    category: 'hardware',
    priority: 'low',
    status: 'resolved',
    submittedBy: 'David Security',
    submittedAt: new Date('2025-01-21T14:00:00'),
    assignedTo: 'Mike Hardware',
    assignedAt: new Date('2025-01-21T14:30:00'),
    resolvedAt: new Date('2025-01-22T08:00:00'),
    resolution: 'Replaced toner cartridge and updated drivers.',
    satisfaction: 5,
    tags: ['printer', 'conference-room'],
    comments: [
      {
        id: 'com-009',
        ticketId: 'HT-003',
        author: 'Mike Hardware',
        content: '<p>Hi David, I\'ve received your printer issue report. I\'ll check the printer in Conference Room B this afternoon.</p><p>Can you confirm if the printer is showing any error messages on the display?</p>',
        timestamp: new Date('2025-01-21T14:45:00'),
        isInternal: false
      },
      {
        id: 'com-010',
        ticketId: 'HT-003',
        author: 'David Security',
        content: '<p>Yes, the printer shows "Toner Low" and "Paper Jam" messages. I tried to clear the paper jam but it\'s still not working.</p>',
        timestamp: new Date('2025-01-21T15:30:00'),
        isInternal: false
      },
      {
        id: 'com-011',
        ticketId: 'HT-003',
        author: 'Mike Hardware',
        content: '<p>Thanks for the details. I\'ll bring replacement toner and tools to fix the paper jam. I\'ll be there around 4:00 PM today.</p>',
        timestamp: new Date('2025-01-21T16:00:00'),
        isInternal: false
      },
      {
        id: 'com-012',
        ticketId: 'HT-003',
        author: 'Mike Hardware',
        content: '<p>Issue resolved! I\'ve:</p><ul><li>Cleared the paper jam</li><li>Replaced the toner cartridge</li><li>Updated the printer drivers</li><li>Tested with a sample print job</li></ul><p>The printer is now working perfectly. Please test it when you get a chance.</p>',
        timestamp: new Date('2025-01-22T08:30:00'),
        isInternal: false
      },
      {
        id: 'com-013',
        ticketId: 'HT-003',
        author: 'David Security',
        content: '<p>Perfect! I just tested the printer and it\'s working great. Thanks for the quick fix, Mike!</p>',
        timestamp: new Date('2025-01-22T09:00:00'),
        isInternal: false
      }
    ]
  },
  {
    id: 'HT-004',
    ticketNumber: 1004,
    title: 'Software license expired',
    description: 'Adobe Creative Suite license has expired and I need access for a project.',
    category: 'software',
    priority: 'critical',
    status: 'in-progress',
    submittedBy: 'Sarah Tech',
    submittedAt: new Date('2025-01-22T11:45:00'),
    assignedTo: 'Sarah Tech',
    assignedAt: new Date('2025-01-22T12:00:00'),
    dueDate: new Date('2025-01-23T17:00:00'),
    tags: ['license', 'adobe', 'critical']
  },
  {
    id: 'HT-005',
    ticketNumber: 1005,
    title: 'Request VPN access',
    description: 'I need VPN access to work remotely. Please set up access for my account.',
    category: 'access',
    priority: 'medium',
    status: 'open',
    submittedBy: 'Lisa Network',
    submittedAt: new Date('2025-01-22T16:00:00'),
    dueDate: new Date('2025-01-27T17:00:00'),
    tags: ['vpn', 'remote-access']
  },
  {
    id: 'HT-006',
    ticketNumber: 1006,
    title: 'WiFi connection unstable',
    description: 'WiFi keeps dropping connection in the office. Very frustrating.',
    category: 'network',
    priority: 'high',
    status: 'open',
    submittedBy: 'Mike Hardware',
    submittedAt: new Date('2025-01-22T13:20:00'),
    dueDate: new Date('2025-01-24T17:00:00'),
    tags: ['wifi', 'network', 'connectivity']
  },
  {
    id: 'HT-007',
    ticketNumber: 1007,
    title: 'Mobile app crashes',
    description: 'Company mobile app crashes immediately when opened.',
    category: 'mobile',
    priority: 'medium',
    status: 'in-progress',
    submittedBy: 'Emma Customer',
    submittedAt: new Date('2025-01-21T15:30:00'),
    assignedTo: 'David Security',
    assignedAt: new Date('2025-01-22T09:00:00'),
    dueDate: new Date('2025-01-25T17:00:00'),
    tags: ['mobile', 'app', 'crash']
  }
];

// Helpdesk Comments
export const helpdeskComments: HelpdeskComment[] = [
  {
    id: 'HC-001',
    ticketId: 'HT-001',
    author: 'John Support',
    content: 'We\'re investigating the authentication issue. Please try resetting your password first.',
    timestamp: new Date('2025-01-22T09:30:00'),
    isInternal: false
  },
  {
    id: 'HC-002',
    ticketId: 'HT-001',
    author: 'Emma Customer',
    content: 'I tried resetting the password but still getting the same error.',
    timestamp: new Date('2025-01-22T10:00:00'),
    isInternal: false
  },
  {
    id: 'HC-003',
    ticketId: 'HT-004',
    author: 'Sarah Tech',
    content: 'Working on license renewal. Should be resolved by end of day.',
    timestamp: new Date('2025-01-22T12:15:00'),
    isInternal: false
  },
  {
    id: 'HC-004',
    ticketId: 'HT-003',
    author: 'Mike Hardware',
    content: 'Issue resolved. Toner cartridge replaced and drivers updated.',
    timestamp: new Date('2025-01-22T08:00:00'),
    isInternal: false
  }
];

// Helpdesk Knowledge Base
export const helpdeskKnowledgeBase: HelpdeskKnowledgeBase[] = [
  {
    id: 'KB-001',
    title: 'How to Reset Your Password',
    content: 'Step-by-step guide to reset your company password. 1. Go to the password reset page. 2. Enter your email address. 3. Check your email for reset link. 4. Create a new strong password.',
    category: 'access',
    tags: ['password', 'login', 'security'],
    views: 156,
    helpful: 23,
    lastUpdated: new Date('2025-01-15'),
    author: 'John Support'
  },
  {
    id: 'KB-002',
    title: 'Setting Up VPN Connection',
    content: 'Complete guide to configure VPN access on different devices. Includes Windows, Mac, and mobile setup instructions with troubleshooting tips.',
    category: 'access',
    tags: ['vpn', 'remote', 'connection'],
    views: 89,
    helpful: 15,
    lastUpdated: new Date('2025-01-10'),
    author: 'Lisa Network'
  },
  {
    id: 'KB-003',
    title: 'Troubleshooting Slow Computer Performance',
    content: 'Common solutions for improving computer performance. Check for malware, clear temporary files, update drivers, and optimize startup programs.',
    category: 'hardware',
    tags: ['performance', 'slow', 'computer'],
    views: 234,
    helpful: 41,
    lastUpdated: new Date('2025-01-20'),
    author: 'Mike Hardware'
  },
  {
    id: 'KB-004',
    title: 'Software Installation Guidelines',
    content: 'How to request and install new software applications. Follow the approval process and installation steps for different software types.',
    category: 'software',
    tags: ['installation', 'software', 'approval'],
    views: 67,
    helpful: 12,
    lastUpdated: new Date('2025-01-18'),
    author: 'Sarah Tech'
  },
  {
    id: 'KB-005',
    title: 'Network Connectivity Issues',
    content: 'Troubleshooting guide for network connectivity problems. Check cables, restart router, verify IP settings, and contact IT if issues persist.',
    category: 'network',
    tags: ['network', 'connectivity', 'troubleshooting'],
    views: 112,
    helpful: 28,
    lastUpdated: new Date('2025-01-12'),
    author: 'Lisa Network'
  }
];

// Quick Links types and data
export interface QuickLink {
  id: string;
  title: string;
  name: string;
  url: string;
  icon: string;
  description?: string;
}

export const defaultQuickLinks: QuickLink[] = [
  {
    id: '1',
    title: 'Help Desk',
    name: 'Help Desk',
    url: '/helpdesk',
    icon: 'headphones',
    description: 'Access the main help desk dashboard'
  },
  {
    id: '2',
    title: 'Tickets',
    name: 'Tickets',
    url: '/tickets',
    icon: 'file-text',
    description: 'View and manage support tickets'
  },
  {
    id: '3',
    title: 'Settings',
    name: 'Settings',
    url: '/settings',
    icon: 'settings',
    description: 'Configure system settings'
  },
  {
    id: '4',
    title: 'Analytics',
    name: 'Analytics',
    url: '/analytics',
    icon: 'bar-chart-3',
    description: 'View system analytics and reports'
  }
];

