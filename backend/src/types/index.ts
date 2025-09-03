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
  role: string;
  department?: string;
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
  role?: string;
  department?: string;
  avatar?: string;
  phone?: string;
  location?: string;
  isAgent?: boolean;
  skills?: string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email?: string;
  role?: string;
  department?: string;
  avatar?: string;
  phone?: string;
  location?: string;
  isAgent?: boolean;
  skills?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
  refreshToken: string;
}

// Ticket types
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Status = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATED';

export interface Ticket extends BaseEntity {
  ticketNumber: number;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
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
  assignedTo?: string;
  submittedBy?: string;
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
  role: string;
  iat?: number;
  exp?: number;
}

// Middleware types
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface AuthorizedRequest extends AuthenticatedRequest {
  user: User;
}
