# Ticket Attachment System

## Overview
The ticketing system now supports comprehensive file attachments for both tickets and comments. Users can upload files when creating tickets or adding comments, and these attachments can be previewed, downloaded, and managed.

## Features

### File Upload Support
- **Supported File Types**: Images (PNG, JPG, GIF, SVG, WebP), Documents (PDF, Word, Excel), Text files, Archives (ZIP, RAR)
- **File Size Limits**: 10MB per file for tickets, 5MB per file for comments
- **Multiple Files**: Up to 10 files per ticket, up to 5 files per comment
- **Drag & Drop**: Modern drag-and-drop interface for file uploads

### Attachment Management
- **Preview**: Click attachments to preview images or open documents
- **Download**: Direct download of attachments
- **Delete**: Remove attachments (only by uploader or admin)
- **File Information**: Display file size, type, upload date, and uploader

## Backend Implementation

### Database Schema
The attachment system uses a dedicated `Attachment` table in the database:

```sql
model Attachment {
  id         String   @id @default(cuid())
  ticketId   String?  // Links to ticket if attached to ticket
  commentId  String?  // Links to comment if attached to comment
  name       String   // Original filename
  filePath   String   // Server file path
  fileSize   Int      // File size in bytes
  mimeType   String   // MIME type
  uploadedBy String   // User ID who uploaded
  uploadedAt DateTime @default(now())
  
  // Relations
  ticket     Ticket?  @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  comment    Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)
  uploader   User     @relation(fields: [uploadedBy], references: [id])
}
```

### API Endpoints

#### Upload Attachment
```
POST /api/attachments/upload
Content-Type: multipart/form-data

Body:
- file: File (required)
- ticketId: string (optional, for ticket attachments)
- commentId: string (optional, for comment attachments)
```

#### Download Attachment
```
GET /api/attachments/:id/download
Authorization: Bearer <token>
```

#### Delete Attachment
```
DELETE /api/attachments/:id
Authorization: Bearer <token>
```

#### Get Attachment Info
```
GET /api/attachments/:id
Authorization: Bearer <token>
```

### File Storage
- Files are stored in the `./uploads` directory (configurable via `UPLOAD_PATH` environment variable)
- File names are unique with timestamps to prevent conflicts
- File type validation ensures only safe file types are uploaded
- File size limits are enforced (configurable via `MAX_FILE_SIZE` environment variable)

## Frontend Implementation

### Components

#### FileUpload Component
- Handles file selection via click or drag-and-drop
- Validates file types and sizes
- Generates previews for images
- Manages file list state

#### AttachmentDisplay Component
- Displays list of attachments
- Shows file icons, names, sizes, and upload dates
- Handles preview and download actions
- Integrates with attachment viewer

#### AddCommentDialog Component
- Includes file upload for comments
- Supports up to 5 files per comment
- 5MB file size limit per file

#### NewTicketDialog Component
- Includes file upload for tickets
- Supports up to 10 files per ticket
- 10MB file size limit per file

### Services

#### AttachmentService
```typescript
class AttachmentService {
  // Upload files for tickets
  static async uploadFilesForTicket(files: FileAttachment[], ticketId: string): Promise<UploadedAttachment[]>
  
  // Upload files for comments
  static async uploadFilesForComment(files: FileAttachment[], commentId: string): Promise<UploadedAttachment[]>
  
  // Delete attachments
  static async deleteAttachment(attachmentId: string): Promise<boolean>
  
  // Get download URL
  static getDownloadUrl(attachmentId: string): string
}
```

#### TicketService
- Updated to handle attachments during ticket creation
- Uploads attachments after ticket is created
- Includes attachments in ticket responses

#### CommentService
- Updated to handle attachments during comment creation
- Uploads attachments after comment is created
- Includes attachments in comment responses

## Usage Examples

### Creating a Ticket with Attachments
1. Open the New Ticket dialog
2. Fill in ticket details (title, description, category, priority)
3. Drag and drop files or click to select attachments
4. Submit the ticket
5. Attachments are automatically uploaded and linked to the ticket

### Adding a Comment with Attachments
1. Open a ticket to view details
2. Click "Add Comment"
3. Write your comment using the rich text editor
4. Add any relevant file attachments
5. Submit the comment
6. Attachments are automatically uploaded and linked to the comment

### Managing Attachments
1. **Preview**: Click any attachment to open the attachment viewer
2. **Download**: Use the download button to save files locally
3. **Delete**: Use the delete button (only available to uploader or admin)

## Security Features

### File Validation
- File type whitelist prevents malicious file uploads
- File size limits prevent abuse
- Server-side validation ensures security

### Access Control
- Only authenticated users can upload attachments
- Users can only delete their own attachments
- Admins can delete any attachment
- File downloads require authentication

### File Storage
- Files are stored outside the web root
- Direct file access is prevented
- Files are served through secure download endpoints

## Configuration

### Environment Variables
```bash
# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/ticketing_db
```

### File Type Whitelist
The system allows these file types by default:
- Images: `image/*`
- Documents: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.*`
- Text: `text/plain`
- Archives: `application/zip`, `application/x-rar-compressed`

## Troubleshooting

### Common Issues

#### File Upload Fails
- Check file size limits
- Verify file type is allowed
- Ensure uploads directory exists and is writable
- Check server logs for detailed error messages

#### Attachments Not Displaying
- Verify database relationships are correct
- Check if attachments are being included in API responses
- Ensure frontend is properly handling attachment data

#### Download Issues
- Verify authentication token is valid
- Check if file exists on server
- Ensure proper file permissions

### Debug Steps
1. Check browser console for JavaScript errors
2. Verify network requests in browser dev tools
3. Check backend server logs
4. Verify database contains attachment records
5. Test file upload with simple text files first

## Future Enhancements

### Planned Features
- Image thumbnails and previews
- Document preview (PDF, Word, Excel)
- Bulk attachment operations
- Attachment search and filtering
- Version control for attachments
- Cloud storage integration

### Performance Optimizations
- File compression for images
- Lazy loading of attachments
- CDN integration for file delivery
- Background file processing

## Testing

### Manual Testing
1. Start backend server: `npm run dev` (in backend directory)
2. Start frontend: `npm run dev` (in root directory)
3. Create a ticket with attachments
4. Add comments with attachments
5. Test file preview and download
6. Test file deletion

### Automated Testing
- Unit tests for attachment services
- Integration tests for API endpoints
- E2E tests for file upload workflows
- Security tests for file validation

## Support

For issues or questions about the attachment system:
1. Check this README for common solutions
2. Review server logs for error details
3. Verify configuration settings
4. Test with simple file types first
