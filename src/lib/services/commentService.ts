import { API_ENDPOINTS } from '../api';

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

  // Create a new comment
  static async createComment(commentData: CreateCommentRequest): Promise<CommentResponse> {
    const endpoint = '/api/comments';
    return apiClient.post(endpoint, commentData);
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
