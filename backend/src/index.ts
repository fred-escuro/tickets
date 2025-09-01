import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

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
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple ticket routes (minimal working version)
app.get('/api/tickets', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, category, search } = req.query;
    
    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search.toString(), mode: 'insensitive' } },
        { description: { contains: search.toString(), mode: 'insensitive' } }
      ];
    }

    // Get total count
    const total = await prisma.ticket.count({ where });

    // Get tickets with relations
    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' },
      skip,
      take: limitNum
    });

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: tickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tickets'
    });
  }
});

// Get ticket statistics
app.get('/api/tickets/stats/overview', async (req, res) => {
  try {
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } })
    ]);

    const stats = {
      total: totalTickets,
      open: openTickets,
      inProgress: inProgressTickets,
      resolved: resolvedTickets,
      closed: closedTickets
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ticket statistics'
    });
  }
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
