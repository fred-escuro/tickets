import { apiClient } from '../api';

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
}

export interface UploadedAttachment {
  id: string;
  name: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export class AttachmentService {
  // Upload a single file for a ticket
  static async uploadFileForTicket(file: File, ticketId: string): Promise<UploadedAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ticketId', ticketId);

    console.log('Uploading file:', file.name, 'Type:', file.type, 'Size:', file.size, 'To ticket:', ticketId);
    console.log('FormData contents:', Array.from(formData.entries()));

    try {
      const response = await apiClient.post('/api/attachments/upload', formData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to upload file');
      }

      console.log('Upload successful:', response.data);
      return response.data as UploadedAttachment;
    } catch (error) {
      console.error('Upload error in AttachmentService:', error);
      throw error;
    }
  }

  // Upload a single file for a comment
  static async uploadFileForComment(file: File, commentId: string): Promise<UploadedAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('commentId', commentId);

    console.log('Uploading file for comment:', file.name, 'Type:', file.type, 'Size:', file.size, 'To comment:', commentId);
    console.log('FormData contents:', Array.from(formData.entries()));

    try {
      const response = await apiClient.post('/api/attachments/upload', formData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to upload file');
      }

      console.log('Comment upload successful:', response.data);
      return response.data as UploadedAttachment;
    } catch (error) {
      console.error('Upload error in AttachmentService:', error);
      throw error;
    }
  }

  // Upload multiple files for a ticket
  static async uploadFilesForTicket(files: FileAttachment[], ticketId: string): Promise<UploadedAttachment[]> {
    const uploadPromises = files.map(attachment => 
      this.uploadFileForTicket(attachment.file, ticketId)
    );

    return Promise.all(uploadPromises);
  }

  // Upload multiple files for a comment
  static async uploadFilesForComment(files: FileAttachment[], commentId: string): Promise<UploadedAttachment[]> {
    const uploadPromises = files.map(attachment => 
      this.uploadFileForComment(attachment.file, commentId)
    );

    return Promise.all(uploadPromises);
  }

  // Delete an attachment
  static async deleteAttachment(attachmentId: string): Promise<boolean> {
    const response = await apiClient.delete(`/api/attachments/${attachmentId}`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete attachment');
    }

    return true;
  }

  // Get attachment download URL
  static getDownloadUrl(attachmentId: string): string {
    return `/api/attachments/${attachmentId}/download`;
  }
}
