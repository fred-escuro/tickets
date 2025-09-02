import { API_ENDPOINTS } from '../api';
import { AttachmentService, type FileAttachment } from './attachmentService';

// Types
export interface Comment {
  id: string;
  ticketId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    avatar?: string;
  };
  attachments?: any[];
}

export interface CreateCommentRequest {
  ticketId: string;
  content: string;
  isInternal?: boolean;
  attachments?: FileAttachment[];
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentResponse {
  success: boolean;
  data: Comment;
  message?: string;
}

export interface CommentsListResponse {
  success: boolean;
  data: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Simple API client
const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    const headers: Record<string, string> = {};
    
    // Add auth token if available
    const authToken = localStorage.getItem('auth-token');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(endpoint, {
      headers
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth token if available
        ...(localStorage.getItem('auth-token') && {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        })
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Add auth token if available
        ...(localStorage.getItem('auth-token') && {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        })
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  async delete<T>(endpoint: string): Promise<T> {
    const headers: Record<string, string> = {};
    
    // Add auth token if available
    const authToken = localStorage.getItem('auth-token');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
};

// Comment service
export class CommentService {
  // Get comments for a ticket
  static async getComments(ticketId: string, page: number = 1, limit: number = 20): Promise<CommentsListResponse> {
    const endpoint = `/api/comments/ticket/${ticketId}?page=${page}&limit=${limit}`;
    return apiClient.get(endpoint);
  }

  // Create a new comment with attachments
  static async createComment(commentData: CreateCommentRequest): Promise<CommentResponse> {
    try {
      console.log('CommentService: Creating comment with data:', {
        ticketId: commentData.ticketId,
        contentLength: commentData.content?.length || 0,
        isInternal: commentData.isInternal,
        attachmentsCount: commentData.attachments?.length || 0
      });

      // First create the comment
      const commentResponse = await apiClient.post('/api/comments', {
        ticketId: commentData.ticketId,
        content: commentData.content,
        isInternal: commentData.isInternal || false
      });

      console.log('CommentService: Comment creation response:', commentResponse);

      if (!commentResponse.success) {
        throw new Error(commentResponse.error || 'Failed to create comment');
      }

      const comment = commentResponse.data;

      // If there are attachments, upload them
      if (commentData.attachments && commentData.attachments.length > 0) {
        console.log('CommentService: Uploading attachments for comment:', comment.id);
        try {
          const uploadedAttachments = await AttachmentService.uploadFilesForComment(
            commentData.attachments,
            comment.id
          );
          
          console.log('CommentService: Attachments uploaded successfully:', uploadedAttachments);
          
          // Update the comment response to include attachments
          comment.attachments = uploadedAttachments;
        } catch (attachmentError) {
          console.error('CommentService: Failed to upload attachments:', attachmentError);
          // Don't fail the comment creation if attachments fail
        }
      } else {
        console.log('CommentService: No attachments to upload');
      }

      return {
        success: true,
        data: comment,
        message: 'Comment created successfully'
      };
    } catch (error) {
      console.error('CommentService: Create comment error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Failed to create comment'
      };
    }
  }

  // Update a comment
  static async updateComment(commentId: string, commentData: UpdateCommentRequest): Promise<CommentResponse> {
    const endpoint = `/api/comments/${commentId}`;
    return apiClient.put(endpoint, commentData);
  }

  // Delete a comment
  static async deleteComment(commentId: string): Promise<{ success: boolean; message: string }> {
    const endpoint = `/api/comments/${commentId}`;
    return apiClient.delete(endpoint);
  }
}
