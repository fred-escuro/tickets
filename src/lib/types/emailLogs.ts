export interface EmailLog {
  id: string;
  messageId?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  type: 'NEW' | 'REPLY';
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  htmlBody?: string;
  ticketId?: string;
  userId?: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'PROCESSING' | 'PROCESSED' | 'ERROR';
  sentAt?: string;
  receivedAt?: string;
  processedAt: string;
  error?: string;
  retryCount: number;
  rawMeta?: any;
  attachments?: any;
  deliveryStatus?: any;
  readAt?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
  ticket?: {
    id: string;
    ticketNumber: number;
    title: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface EmailLogsResponse {
  logs: EmailLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EmailStatistics {
  totalEmails: number;
  inboundEmails: number;
  outboundEmails: number;
  sentEmails: number;
  failedEmails: number;
  deliveredEmails: number;
  bouncedEmails: number;
  successRate: number;
}

export interface EmailLogsFilters {
  direction?: 'INBOUND' | 'OUTBOUND';
  status?: 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'PROCESSING' | 'PROCESSED' | 'ERROR';
  ticketId?: string;
  userId?: string;
  from?: string;
  to?: string;
  subject?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
