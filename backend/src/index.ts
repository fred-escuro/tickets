import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './routes/auth';
import ticketRoutes from './routes/tickets';
import userRoutes from './routes/users';
import attachmentRoutes from './routes/attachments';
import knowledgeBaseRoutes from './routes/knowledgeBase';
import searchRoutes from './routes/search';
import commentRoutes from './routes/comments';
import ticketSystemRoutes from './routes/ticketSystem';
import emailIngestRoutes from './routes/emailIngest';
import taskMetaRoutes from './routes/taskMeta';
import departmentRoutes from './routes/departments';
import roleRoutes from './routes/roles';
import permissionRoutes from './routes/permissions';
import policyRoutes from './routes/policies';
import menuRoutes from './routes/menu';
import assignmentRulesRoutes from './routes/assignmentRules';
// Legacy settings routes removed after migration to v2
// import settingsRoutes from './routes/settings';
import settingsV2Routes from './routes/settingsV2';

// Load environment variables
dotenv.config();

// Initialize Prisma
export const prisma = new PrismaClient();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static uploads (e.g., logo)
import path from 'path';
import fs from 'fs';
const uploadsDir = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/knowledge', knowledgeBaseRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/ticket-system', ticketSystemRoutes);
app.use('/api/email-ingest', emailIngestRoutes);
app.use('/api/tasks/meta', taskMetaRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/assignment-rules', assignmentRulesRoutes);
// app.use('/api/settings', settingsRoutes);
app.use('/api/settings/v2', settingsV2Routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});





// Error handling middleware
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.use((error: any, req: any, res: any, next: any) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🎫 Tickets API: http://localhost:${PORT}/api/tickets`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
