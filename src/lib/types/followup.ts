export interface FollowupDetectionResult {
  isFollowup: boolean;
  autoResponseId?: string;
  ticketId?: string;
  confidence: number;
  reason?: string;
}

export interface ProcessedFollowup {
  id: string;
  ticketId: string;
  content: string;
  authorEmail: string;
  processedAt: string;
  status: 'PROCESSED' | 'FAILED' | 'PENDING' | 'IGNORED';
}

export interface FollowupStats {
  totalFollowups: number;
  processedFollowups: number;
  failedFollowups: number;
  recentFollowups: number;
}

export interface InboundEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
  messageId?: string;
  receivedAt: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    content: Buffer;
  }>;
}
