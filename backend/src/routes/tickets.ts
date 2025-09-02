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

export default router;
