// Base types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
}

// User types
export interface User extends BaseEntity {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  avatar?: string;
  phone?: string;
  location?: string;
  isAgent: boolean;
  skills?: string[];
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  password: string;
  avatar?: string;
  phone?: string;
  location?: string;
  isAgent?: boolean;
  skills?: string[];
  departments?: Array<{
    departmentId: string;
    isPrimary: boolean;
    role?: string;
  }>;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email?: string;
  avatar?: string;
  phone?: string;
  location?: string;
  isAgent?: boolean;
  skills?: string[];
  // Allow privileged updates to password
  password?: string;
  departments?: Array<{
    departmentId: string;
    isPrimary: boolean;
    role?: string;
  }>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'> & { roles?: Array<{ isPrimary?: boolean; role: { id: string; name: string } }>; };
  token: string;
  refreshToken: string;
}

// Ticket types
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Status = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATED';
export type TicketSource = 'WEB' | 'EMAIL' | 'API' | 'MOBILE' | 'OTHER';

export interface Ticket extends BaseEntity {
  ticketNumber: number;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  source?: TicketSource;
  submittedBy: string;
  submittedAt: Date;
  assignedTo?: string;
  assignedAt?: Date;
  dueDate?: Date;
  resolvedAt?: Date;
  resolution?: string;
  satisfaction?: number;
  tags?: string[];
  submitter?: User;
  assignee?: User;
  comments?: Comment[];
  attachments?: Attachment[];
  tasks?: TicketTask[];
  events?: TicketEvent[];
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  category: string;
  priority?: Priority;
  dueDate?: Date;
  tags?: string[];
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  categoryId?: string;
  priorityId?: string;
  statusId?: string;
  // Optional metadata for status change history
  statusChangeReason?: string;
  statusChangeComment?: string;
  assignedTo?: string;
  dueDate?: Date;
  resolution?: string;
  satisfaction?: number;
  tags?: string[];
  resolvedAt?: Date;
  assignedAt?: Date;
}

// Comment types
export interface Comment extends BaseEntity {
  ticketId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  author?: User;
  attachments?: Attachment[];
}

export interface CreateCommentRequest {
  ticketId: string;
  content: string;
  isInternal?: boolean;
}

// Attachment types
export interface Attachment extends BaseEntity {
  ticketId?: string;
  commentId?: string;
  name: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploader?: User;
}

export interface CreateAttachmentRequest {
  ticketId?: string;
  commentId?: string;
  name: string;
  file: Express.Multer.File;
}

// Task types
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface TicketTask extends BaseEntity {
  ticketId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  progress: number;
  assignedTo?: string;
  dueDate?: Date;
  startDate: Date;
  completedDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
}

export interface TaskComment extends BaseEntity {
  taskId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
}

export interface TaskStatusHistory extends BaseEntity {
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  changedBy: string;
  changedAt: Date;
  reason?: string;
}

export interface CreateTaskRequest {
  ticketId: string;
  title: string;
  description: string;
  priority?: Priority;
  assignedTo?: string;
  dueDate?: Date;
  estimatedHours?: number;
}

// Event types
export type EventType = 'TICKET_DUE' | 'SLA_DEADLINE' | 'AGENT_ASSIGNMENT' | 'FOLLOW_UP' | 'ESCALATION';

export interface TicketEvent extends BaseEntity {
  ticketId: string;
  title: string;
  date: Date;
  type: EventType;
  priority: Priority;
  description?: string;
  assignedTo?: string;
}

// Knowledge Base types
export interface KnowledgeBase extends BaseEntity {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  views: number;
  helpful: number;
  authorId?: string;
  author?: User;
}

export interface CreateKnowledgeBaseRequest {
  title: string;
  content: string;
  category: string;
  tags?: string[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Filter types
export interface TicketFilters extends PaginationQuery {
  status?: Status;
  priority?: Priority;
  category?: string;
  ticketNumber?: string;
  assignedTo?: string;
  submittedBy?: string;
  department?: string;
  assignedToDepartment?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Search types
export interface SearchQuery extends PaginationQuery {
  q: string;
  type?: 'tickets' | 'knowledge' | 'users';
  category?: string;
}

// File upload types
export interface FileUploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  uploadPath: string;
}

// JWT types
export interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
  sessionStart?: number; // Session start timestamp
  lastActivity?: number; // Last activity timestamp
}

// Middleware types
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface AuthorizedRequest extends AuthenticatedRequest {
  user: User;
}

// RBAC/ABAC & Department Types

export interface Department extends BaseEntity {
  name: string;
  description?: string;
  managerId?: string;
  parentId?: string;
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
  managerId?: string;
  parentId?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
  managerId?: string | null;
  parentId?: string | null;
}

export interface Role extends BaseEntity {
  name: string;
  description?: string;
  isSystem: boolean;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  isSystem?: boolean;
  permissionIds?: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  isSystem?: boolean;
}

export interface Permission extends BaseEntity {
  key: string; // e.g. "tickets:read"
  description?: string;
}

export interface CreatePermissionRequest {
  key: string;
  description?: string;
}

export interface UpdatePermissionRequest {
  description?: string;
}

export type AccessEffect = 'ALLOW' | 'DENY';
export type PolicySubjectType = 'ROLE' | 'USER' | 'DEPARTMENT';

export interface AccessPolicy extends BaseEntity {
  name: string;
  description?: string;
  effect: AccessEffect;
  subjectType: PolicySubjectType;
  subjectId?: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
  isActive: boolean;
}

export interface CreateAccessPolicyRequest {
  name: string;
  description?: string;
  effect?: AccessEffect;
  subjectType: PolicySubjectType;
  subjectId?: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateAccessPolicyRequest {
  name?: string;
  description?: string;
  effect?: AccessEffect;
  subjectType?: PolicySubjectType;
  subjectId?: string | null;
  resource?: string;
  action?: string;
  conditions?: Record<string, any> | null;
  isActive?: boolean;
}

// Menu & Navigation Types
export interface MenuItem extends BaseEntity {
  parentId?: string;
  label: string;
  path?: string;
  icon?: string;
  sortOrder?: number;
  isActive: boolean;
  featureFlag?: string;
}

export interface CreateMenuItemRequest {
  parentId?: string;
  label: string;
  path?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
  featureFlag?: string;
}

export interface UpdateMenuItemRequest {
  parentId?: string | null;
  label?: string;
  path?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  featureFlag?: string | null;
}