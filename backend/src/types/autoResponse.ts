export interface AutoResponseTemplate {
  id: string;
  name: string;
  description?: string;
  subjectTemplate: string;
  bodyTemplate: string;
  triggerConditions?: AutoResponseTriggerConditions;
  departmentId?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  department?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface AutoResponseTriggerConditions {
  // Ticket-based conditions
  categories?: string[];
  priorities?: string[];
  statuses?: string[];
  sources?: string[];
  
  // Email-based conditions
  fromDomains?: string[];
  subjectKeywords?: string[];
  bodyKeywords?: string[];
  
  // Time-based conditions
  businessHoursOnly?: boolean;
  timezone?: string;
  
  // Department-based conditions
  assignedDepartment?: string;
  
  // Custom conditions (JSON)
  customRules?: Record<string, any>;
}

export interface AutoResponse {
  id: string;
  ticketId: string;
  templateId: string;
  responseId: string; // Unique identifier for tracking replies
  toEmail: string;
  subject: string;
  body: string;
  threadId?: string; // Email thread identifier
  sentAt: Date;
  status: AutoResponseStatus;
  
  // Relations
  ticket?: {
    id: string;
    ticketNumber: number;
    title: string;
  };
  template?: {
    id: string;
    name: string;
  };
}

export interface EmailFollowup {
  id: string;
  autoResponseId: string;
  ticketId: string;
  originalEmailId?: string;
  followupEmailId?: string;
  content: string;
  processedAt: Date;
  status: FollowupStatus;
  
  // Relations
  autoResponse?: AutoResponse;
  ticket?: {
    id: string;
    ticketNumber: number;
    title: string;
  };
}

export enum AutoResponseStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR'
}

export enum FollowupStatus {
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  IGNORED = 'IGNORED'
}

// API Request/Response Types
export interface CreateAutoResponseTemplateRequest {
  name: string;
  description?: string;
  subjectTemplate: string;
  bodyTemplate: string;
  triggerConditions?: AutoResponseTriggerConditions;
  departmentId?: string;
  isActive?: boolean;
}

export interface UpdateAutoResponseTemplateRequest {
  name?: string;
  description?: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
  triggerConditions?: AutoResponseTriggerConditions;
  departmentId?: string;
  isActive?: boolean;
}

export interface AutoResponseTemplateFilters {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface AutoResponseFilters {
  page?: number;
  limit?: number;
  ticketId?: string;
  templateId?: string;
  status?: AutoResponseStatus;
  fromDate?: Date;
  toDate?: Date;
  sortBy?: 'sentAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface EmailFollowupFilters {
  page?: number;
  limit?: number;
  ticketId?: string;
  autoResponseId?: string;
  status?: FollowupStatus;
  fromDate?: Date;
  toDate?: Date;
  sortBy?: 'processedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// Template Generation Types
export interface TemplateVariables {
  ticketNumber: string;
  ticketTitle: string;
  ticketStatus: string;
  ticketPriority: string;
  ticketCategory: string;
  submitterName: string;
  submitterEmail: string;
  assignedAgent?: string;
  assignedDepartment?: string;
  companyName: string;
  supportEmail: string;
  supportPhone?: string;
  estimatedResponseTime?: string;
  estimatedResolutionTime?: string;
  ticketUrl?: string;
  customFields?: Record<string, any>;
}

export interface GeneratedAutoResponse {
  subject: string;
  body: string;
  responseId: string;
  threadId?: string;
}

// Service Interfaces
export interface AutoResponseGenerator {
  selectTemplate(ticket: any, email: any): Promise<AutoResponseTemplate | null>;
  generateResponse(template: AutoResponseTemplate, variables: TemplateVariables): Promise<GeneratedAutoResponse>;
  sendResponse(response: GeneratedAutoResponse, ticketId: string, toEmail: string): Promise<AutoResponse>;
}

export interface FollowupDetector {
  detectAutoResponseReply(email: any): boolean;
  extractResponseId(email: any): string | null;
  getTicketFromResponse(responseId: string): Promise<any | null>;
}

export interface FollowupProcessor {
  processFollowup(email: any, ticket: any): Promise<void>;
  addCommentToTicket(ticketId: string, comment: string, author: string): Promise<void>;
}
