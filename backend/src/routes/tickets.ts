import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, requireAgent, authorize } from '../middleware/auth';
import { CreateTicketRequest, UpdateTicketRequest, TicketFilters, ApiResponse } from '../types';

const router = Router();

// Get all tickets with filtering and pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      category,
      assignedTo,
      submittedBy,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as TicketFilters;

    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assignedTo) where.assignedTo = assignedTo;
    if (submittedBy) where.submittedBy = submittedBy;

    if (dateFrom || dateTo) {
      where.submittedAt = {};
      if (dateFrom) where.submittedAt.gte = new Date(dateFrom);
      if (dateTo) where.submittedAt.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
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
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            avatar: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            avatar: true
          }
        },
        attachments: {
          select: {
            id: true,
            name: true,
            fileSize: true,
            mimeType: true,
            uploadedAt: true,
            uploadedBy: true
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limitNum
    });

    const totalPages = Math.ceil(total / limitNum);

    const response: ApiResponse = {
      success: true,
      data: tickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Get tickets error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get tickets'
    });
  }
});

// Get ticket by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        submitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            avatar: true,
            department: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            avatar: true,
            department: true
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                email: true,
                avatar: true
              }
            },
            attachments: true
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: true,
        tasks: {
          orderBy: { createdAt: 'desc' }
        },
        events: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    return res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get ticket'
    });
  }
});

// Create new ticket
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, category, priority, dueDate, tags }: CreateTicketRequest = req.body;
    const userId = (req as any).user.id;

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, and category are required'
      });
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        category,
        priority: priority || 'MEDIUM',
        submittedBy: userId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        tags: tags || []
      },
      include: {
        submitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      data: ticket,
      message: 'Ticket created successfully'
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create ticket'
    });
  }
});

// Update ticket
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: UpdateTicketRequest = req.body;
    const userId = (req as any).user.id;

    // Check if ticket exists
    const existingTicket = await prisma.ticket.findUnique({
      where: { id }
    });

    if (!existingTicket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    // Only allow updates if user is submitter, assignee, or agent
    if (
      existingTicket.submittedBy !== userId &&
      existingTicket.assignedTo !== userId &&
      !(req as any).user.isAgent
    ) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update this ticket'
      });
    }

    // Handle status changes
    if (updateData.status && updateData.status !== existingTicket.status) {
      if (updateData.status === 'RESOLVED' && !updateData.resolution) {
        return res.status(400).json({
          success: false,
          error: 'Resolution is required when closing a ticket'
        });
      }

      if (updateData.status === 'RESOLVED') {
        updateData.resolvedAt = new Date();
      }

      if (updateData.status === 'IN_PROGRESS' && !existingTicket.assignedTo) {
        updateData.assignedTo = userId;
        updateData.assignedAt = new Date();
      }
    }

    // Handle assignment changes
    if (updateData.assignedTo && updateData.assignedTo !== existingTicket.assignedTo) {
      updateData.assignedAt = new Date();
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        submitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            avatar: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    return res.json({
      success: true,
      data: updatedTicket,
      message: 'Ticket updated successfully'
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update ticket'
    });
  }
});

// Delete ticket (only by submitter or admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const ticket = await prisma.ticket.findUnique({
      where: { id }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    // Only allow deletion if user is submitter or admin
    if (ticket.submittedBy !== userId && (req as any).user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to delete this ticket'
      });
    }

    await prisma.ticket.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    console.error('Delete ticket error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete ticket'
    });
  }
});

// Get ticket statistics
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const isAgent = (req as any).user.isAgent;

    let whereClause: any = {};

    // If not an agent, only show user's own tickets
    if (!isAgent) {
      whereClause.OR = [
        { submittedBy: userId },
        { assignedTo: userId }
      ];
    }

    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets
    ] = await Promise.all([
      prisma.ticket.count({ where: whereClause }),
      prisma.ticket.count({ where: { ...whereClause, status: 'OPEN' } }),
      prisma.ticket.count({ where: { ...whereClause, status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { ...whereClause, status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { ...whereClause, status: 'CLOSED' } })
    ]);

    const stats = {
      total: totalTickets,
      open: openTickets,
      inProgress: inProgressTickets,
      resolved: resolvedTickets,
      closed: closedTickets
    };

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get ticket statistics'
    });
  }
});

// Get ticket activity data for charts
router.get('/stats/activity', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const isAgent = (req as any).user.isAgent;
    const { days = '7' } = req.query;
    
    const daysCount = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCount);

    let whereClause: any = {
      createdAt: {
        gte: startDate
      }
    };

    // If not an agent, only show user's own tickets
    if (!isAgent) {
      whereClause.OR = [
        { submittedBy: userId },
        { assignedTo: userId }
      ];
    }

    // Get tickets created in the last N days
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      select: {
        id: true,
        createdAt: true,
        status: true,
        resolvedAt: true,
        priority: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group by date and calculate metrics
    const activityData: any[] = [];
    const dateMap = new Map();

    // Initialize all dates in range
    for (let i = 0; i < daysCount; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (daysCount - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, {
        date: dateStr,
        ticketsCreated: 0,
        ticketsResolved: 0,
        ticketsEscalated: 0,
        avgResolutionTime: 0
      });
    }

    // Process tickets
    tickets.forEach(ticket => {
      const dateStr = ticket.createdAt.toISOString().split('T')[0];
      if (dateMap.has(dateStr)) {
        dateMap.get(dateStr).ticketsCreated++;
      }

      // Check if resolved on this date
      if (ticket.resolvedAt) {
        const resolvedDateStr = ticket.resolvedAt.toISOString().split('T')[0];
        if (dateMap.has(resolvedDateStr)) {
          dateMap.get(resolvedDateStr).ticketsResolved++;
        }
      }

      // Check for escalations (high priority tickets)
      if (ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL') {
        const dateStr = ticket.createdAt.toISOString().split('T')[0];
        if (dateMap.has(dateStr)) {
          dateMap.get(dateStr).ticketsEscalated++;
        }
      }
    });

    // Calculate average resolution time for each day
    for (const [dateStr, data] of dateMap) {
      const dayTickets = tickets.filter(ticket => {
        const createdDate = ticket.createdAt.toISOString().split('T')[0];
        const resolvedDate = ticket.resolvedAt ? ticket.resolvedAt.toISOString().split('T')[0] : null;
        return createdDate === dateStr && resolvedDate === dateStr;
      });

      if (dayTickets.length > 0) {
        const totalResolutionTime = dayTickets.reduce((sum, ticket) => {
          if (ticket.resolvedAt) {
            const resolutionTime = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
            return sum + (resolutionTime / (1000 * 60 * 60)); // Convert to hours
          }
          return sum;
        }, 0);
        data.avgResolutionTime = Math.round((totalResolutionTime / dayTickets.length) * 10) / 10;
      }

      activityData.push(data);
    }

    return res.json({
      success: true,
      data: activityData
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get ticket activity data'
    });
  }
});

// Get detailed ticket metrics
router.get('/stats/metrics', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const isAgent = (req as any).user.isAgent;

    let whereClause: any = {};

    // If not an agent, only show user's own tickets
    if (!isAgent) {
      whereClause.OR = [
        { submittedBy: userId },
        { assignedTo: userId }
      ];
    }

    // Get current week and previous week data
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);

    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);

    const previousWeekEnd = new Date(currentWeekStart);
    previousWeekEnd.setMilliseconds(-1);

    // Current week stats
    const currentWeekStats = await prisma.ticket.count({
      where: {
        ...whereClause,
        createdAt: {
          gte: currentWeekStart
        }
      }
    });

    // Previous week stats
    const previousWeekStats = await prisma.ticket.count({
      where: {
        ...whereClause,
        createdAt: {
          gte: previousWeekStart,
          lte: previousWeekEnd
        }
      }
    });

    // Calculate percentage change
    const change = previousWeekStats > 0 
      ? Math.round(((currentWeekStats - previousWeekStats) / previousWeekStats) * 100)
      : currentWeekStats > 0 ? 100 : 0;

    // Get priority distribution
    const priorityStats = await prisma.ticket.groupBy({
      by: ['priority'],
      where: whereClause,
      _count: {
        priority: true
      }
    });

    // Get status distribution
    const statusStats = await prisma.ticket.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        status: true
      }
    });

    const metrics = {
      openTickets: await prisma.ticket.count({ where: { ...whereClause, status: 'OPEN' } }),
      inProgressTickets: await prisma.ticket.count({ where: { ...whereClause, status: 'IN_PROGRESS' } }),
      resolvedTickets: await prisma.ticket.count({ where: { ...whereClause, status: 'RESOLVED' } }),
      closedTickets: await prisma.ticket.count({ where: { ...whereClause, status: 'CLOSED' } }),
      weeklyChange: change,
      priorityDistribution: priorityStats.reduce((acc, stat) => {
        acc[stat.priority.toLowerCase()] = stat._count.priority;
        return acc;
      }, {} as any),
      statusDistribution: statusStats.reduce((acc, stat) => {
        acc[stat.status.toLowerCase()] = stat._count.status;
        return acc;
      }, {} as any)
    };

    return res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get ticket metrics'
    });
  }
});

export default router;
