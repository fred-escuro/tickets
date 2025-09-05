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
      ticketNumber,
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

    // Scope results for non-agents to only their tickets (submitted or assigned)
    const userId = (req as any).user.id;
    const isAgent = (req as any).user.isAgent;
    if (!isAgent) {
      where.OR = [
        { submittedBy: userId },
        { assignedTo: userId }
      ];
    }

    // Flexible filters for relations
    if (status) {
      // Filter by related status name (case-insensitive)
      where.status = {
        name: {
          equals: status as string,
          mode: 'insensitive'
        }
      };
    }
    if (priority) {
      // Filter by related priority name (case-insensitive)
      where.priority = {
        name: {
          equals: priority as string,
          mode: 'insensitive'
        }
      };
    }
    if (category) {
      // Accept either category id or name; prefer id
      // If value looks like an id (cuid/uuid), filter by id; else by name
      const value = category as string;
      const looksLikeId = /^[a-z0-9]{10,}$/i.test(value);
      if (looksLikeId) {
        where.categoryId = value;
      } else {
        where.category = {
          name: {
            equals: value,
            mode: 'insensitive'
          }
        };
      }
    }
    if (assignedTo) where.assignedTo = assignedTo;
    if (submittedBy) where.submittedBy = submittedBy;

    // Exact ticket number match when provided
    if (ticketNumber) {
      const num = parseInt((ticketNumber as string).toString(), 10);
      if (!isNaN(num)) {
        where.ticketNumber = num;
      }
    }

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
        status: {
          select: {
            id: true,
            name: true
          }
        },
        priority: {
          select: {
            id: true,
            name: true,
            level: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true
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
        status: {
          select: { id: true, name: true, color: true, isResolved: true, isClosed: true }
        },
        priority: {
          select: { id: true, name: true, color: true, level: true }
        },
        category: {
          select: { id: true, name: true, color: true, icon: true }
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
    const { title, description, category, priority, dueDate, tags }: CreateTicketRequest = req.body as any;
    const { priorityId } = (req.body as any);
    const userId = (req as any).user.id;

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, and category are required'
      });
    }

    // Resolve priority: accept explicit priorityId, or legacy string enum name
    let resolvedPriority = null as null | { id: string };
    if (priorityId) {
      resolvedPriority = await prisma.ticketPriority.findUnique({ where: { id: priorityId } });
      if (!resolvedPriority) {
        return res.status(400).json({ success: false, error: 'Invalid priorityId' });
      }
    } else if (priority) {
      const normalized = priority.toString().trim().toLowerCase();
      const nameMap: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
      const name = nameMap[normalized] || priority;
      resolvedPriority = await prisma.ticketPriority.findFirst({ where: { name } });
    }

    // Get default priority and status IDs
    const defaultPriority = resolvedPriority || await prisma.ticketPriority.findFirst({ 
      where: { name: 'Medium' } 
    }) || await prisma.ticketPriority.findFirst();
    
    const defaultStatus = await prisma.ticketStatus.findFirst({ 
      where: { name: 'Open' } 
    }) || await prisma.ticketStatus.findFirst();

    if (!defaultPriority) {
      return res.status(500).json({
        success: false,
        error: 'No priority levels configured. Please set up priorities first.'
      });
    }

    if (!defaultStatus) {
      return res.status(500).json({
        success: false,
        error: 'No status levels configured. Please set up statuses first.'
      });
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        categoryId: category,
        priorityId: (resolvedPriority?.id) || defaultPriority.id,
        statusId: defaultStatus.id,
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

    // Handle status changes (validate allowed transitions server-side)
    if (updateData.statusId && updateData.statusId !== existingTicket.statusId) {
      const [currentStatus, targetStatus] = await Promise.all([
        prisma.ticketStatus.findUnique({ where: { id: existingTicket.statusId } }),
        prisma.ticketStatus.findUnique({ where: { id: updateData.statusId } })
      ]);

      if (!targetStatus) {
        return res.status(400).json({ success: false, error: 'Invalid statusId' });
      }

      // Validate transition using DB-configured allowedTransitions on current status
      const normalize = (v: any) => (v ?? '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
      const raw = (currentStatus as any)?.allowedTransitions;
      const configured: string[] = Array.isArray(raw) ? raw : (raw?.transitions || []);
      const allowedSet = new Set(configured.map(x => normalize(x)));

      if (configured.length === 0 || (!allowedSet.has(updateData.statusId) && !allowedSet.has(normalize(targetStatus.name)))) {
        return res.status(400).json({
          success: false,
          error: `Transition from "${currentStatus?.name || 'Unknown'}" to "${targetStatus.name}" is not permitted`
        });
      }

      // Additional requirements for resolved statuses
      if (targetStatus.isResolved && !updateData.resolution) {
        return res.status(400).json({
          success: false,
          error: 'Resolution is required when resolving a ticket'
        });
      }

      if (targetStatus.isResolved) {
        updateData.resolvedAt = new Date();
      }

      // Auto-assign if moving into an "in progress" state and unassigned
      if (targetStatus.name.toLowerCase().includes('progress') && !existingTicket.assignedTo) {
        updateData.assignedTo = userId;
        updateData.assignedAt = new Date();
      }
    }

    // Handle assignment changes
    if (updateData.assignedTo && updateData.assignedTo !== existingTicket.assignedTo) {
      updateData.assignedAt = new Date();
    }

    // Create proper update data object for Prisma
    const prismaUpdateData: any = {};
    if (updateData.title !== undefined) prismaUpdateData.title = updateData.title;
    if (updateData.description !== undefined) prismaUpdateData.description = updateData.description;
    if (updateData.categoryId !== undefined) prismaUpdateData.categoryId = updateData.categoryId;
    if (updateData.priorityId !== undefined) prismaUpdateData.priorityId = updateData.priorityId;
    if (updateData.statusId !== undefined) prismaUpdateData.statusId = updateData.statusId;
    if (updateData.assignedTo !== undefined) prismaUpdateData.assignedTo = updateData.assignedTo;
    if (updateData.dueDate !== undefined) prismaUpdateData.dueDate = updateData.dueDate;
    if (updateData.resolution !== undefined) prismaUpdateData.resolution = updateData.resolution;
    if (updateData.satisfaction !== undefined) prismaUpdateData.satisfaction = updateData.satisfaction;
    if (updateData.tags !== undefined) prismaUpdateData.tags = updateData.tags;
    if (updateData.resolvedAt !== undefined) prismaUpdateData.resolvedAt = updateData.resolvedAt;
    if (updateData.assignedAt !== undefined) prismaUpdateData.assignedAt = updateData.assignedAt;

    // If status changed, perform update and history creation in a single transaction
    const performStatusHistory = updateData.statusId && updateData.statusId !== existingTicket.statusId;

    const updatedTicket = await (performStatusHistory
      ? prisma.$transaction(async (tx) => {
          const updated = await tx.ticket.update({
            where: { id },
            data: prismaUpdateData,
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

          await tx.ticketStatusHistory.create({
            data: {
              ticketId: id,
              statusId: updateData.statusId as string,
              previousStatusId: existingTicket.statusId,
              changedBy: userId,
              reason: (updateData as any).statusChangeReason || undefined,
              comment: (updateData as any).statusChangeComment || undefined
            }
          });

          return updated;
        })
      : prisma.ticket.update({
          where: { id },
          data: prismaUpdateData,
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
        })
    );

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

// Get ticket status history
router.get('/:id/status-history', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({ where: { id }, select: { id: true } });
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const history = await prisma.ticketStatusHistory.findMany({
      where: { ticketId: id },
      include: {
        status: { select: { id: true, name: true, color: true } },
        previousStatus: { select: { id: true, name: true, color: true } },
        user: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { changedAt: 'desc' }
    });

    const mapped = history.map(h => ({
      id: h.id,
      statusId: h.statusId,
      statusName: h.status?.name || 'Unknown',
      previousStatusId: h.previousStatusId || null,
      previousStatusName: h.previousStatus?.name || null,
      changedBy: h.user ? `${h.user.firstName} ${h.user.lastName}` : 'Unknown',
      changedAt: h.changedAt,
      reason: h.reason || undefined,
      comment: h.comment || undefined
    }));

    return res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Get status history error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get status history' });
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
    const { range = 'today' } = req.query as { range?: string };

    let whereClause: any = {};

    // If not an agent, only show user's own tickets
    if (!isAgent) {
      whereClause.OR = [
        { submittedBy: userId },
        { assignedTo: userId }
      ];
    }

    // Get status IDs first
    const statuses = await prisma.ticketStatus.findMany({
      select: { id: true, name: true }
    });
    
    const statusMap = statuses.reduce((acc, status) => {
      acc[status.name.toLowerCase().replace(/\s+/g, '')] = status.id;
      return acc;
    }, {} as Record<string, string>);

    // Range handling
    const now = new Date();
    let rangeStart: Date;
    const rangeLower = typeof range === 'string' ? range.toLowerCase() : 'today';
    if (rangeLower === '7d') {
      rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (rangeLower === '30d') {
      rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (rangeLower === 'all') {
      // Special case: no date filtering for range-based metrics
      rangeStart = new Date(0);
    } else {
      rangeStart = new Date(now);
      rangeStart.setHours(0, 0, 0, 0); // today
    }

    const notClosedWhere = { ...whereClause, NOT: { statusId: statusMap.closed || statusMap['closed'] } };
    const notResolvedClosedWhere = { ...whereClause, NOT: { statusId: { in: [statusMap.resolved || statusMap['resolved'], statusMap.closed || statusMap['closed']] } } };

    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      newTickets,
      resolvedInRange,
      overdueTickets,
      unassignedTickets,
      slaAtRiskTickets
    ] = await Promise.all([
      prisma.ticket.count({ where: whereClause }),
      prisma.ticket.count({ where: { ...whereClause, statusId: statusMap.open || statusMap['open'] } }),
      prisma.ticket.count({ where: { ...whereClause, statusId: statusMap.inprogress || statusMap['inprogress'] } }),
      prisma.ticket.count({ where: { ...whereClause, statusId: statusMap.resolved || statusMap['resolved'] } }),
      prisma.ticket.count({ where: { ...whereClause, statusId: statusMap.closed || statusMap['closed'] } }),
      prisma.ticket.count({ where: rangeLower === 'all' ? { ...whereClause } : { ...whereClause, submittedAt: { gte: rangeStart } } }),
      prisma.ticket.count({ where: rangeLower === 'all' ? { ...whereClause, resolvedAt: { not: null } } : { ...whereClause, resolvedAt: { gte: rangeStart } } }),
      prisma.ticket.count({ where: { ...notResolvedClosedWhere, dueDate: { lt: now } } }),
      prisma.ticket.count({ where: { ...notClosedWhere, assignedTo: null } }),
      prisma.ticket.count({ where: { ...notResolvedClosedWhere, slaResponseAt: { lt: now } } })
    ]);

    const stats = {
      total: totalTickets,
      open: openTickets,
      inProgress: inProgressTickets,
      resolved: resolvedTickets,
      closed: closedTickets,
      openInProgress: openTickets + inProgressTickets,
      new: newTickets,
      resolvedInRange,
      overdue: overdueTickets,
      unassigned: unassignedTickets,
      slaAtRisk: slaAtRiskTickets,
      range: typeof range === 'string' ? range : 'today',
      lastUpdated: now
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
      if (ticket.priority && (ticket.priority.level >= 7)) {
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
      by: ['priorityId'],
      where: whereClause,
      _count: {
        priorityId: true
      }
    });

    // Get status distribution
    const statusStats = await prisma.ticket.groupBy({
      by: ['statusId'],
      where: whereClause,
      _count: {
        statusId: true
      }
    });

    // Get status counts using relations
    const openStatus = await prisma.ticketStatus.findFirst({ where: { name: 'Open' } });
    const inProgressStatus = await prisma.ticketStatus.findFirst({ where: { name: 'In Progress' } });
    const resolvedStatus = await prisma.ticketStatus.findFirst({ where: { name: 'Resolved' } });
    const closedStatus = await prisma.ticketStatus.findFirst({ where: { name: 'Closed' } });

    const metrics = {
      openTickets: openStatus ? await prisma.ticket.count({ where: { ...whereClause, statusId: openStatus.id } }) : 0,
      inProgressTickets: inProgressStatus ? await prisma.ticket.count({ where: { ...whereClause, statusId: inProgressStatus.id } }) : 0,
      resolvedTickets: resolvedStatus ? await prisma.ticket.count({ where: { ...whereClause, statusId: resolvedStatus.id } }) : 0,
      closedTickets: closedStatus ? await prisma.ticket.count({ where: { ...whereClause, statusId: closedStatus.id } }) : 0,
      weeklyChange: change,
      priorityDistribution: priorityStats.reduce((acc, stat) => {
        acc[stat.priorityId] = stat._count?.priorityId || 0;
        return acc;
      }, {} as any),
      statusDistribution: statusStats.reduce((acc, stat) => {
        acc[stat.statusId] = stat._count?.statusId || 0;
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
