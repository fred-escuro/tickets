import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, requireAgent, authorize, authorizePermission } from '../middleware/auth';
import { CreateTicketRequest, UpdateTicketRequest, TicketFilters, ApiResponse, TicketSource } from '../types';
import { AutoAssignmentService } from '../services/autoAssignmentService';

const router = Router();

// Get all tickets with filtering and pagination
router.get('/', authenticate, authorizePermission('tickets:read'), async (req, res) => {
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
      department,
      assignedToDepartment,
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
    const roles = Array.isArray((req as any).user?.roles) ? (req as any).user.roles : [];
    const roleNames = roles.map((r: any) => (r?.role?.name || '').toLowerCase());
    const perms: string[] = Array.isArray((req as any).user?.permissions) ? (req as any).user.permissions : [];
    const isElevated = isAgent 
      || roleNames.includes('admin')
      || roleNames.includes('manager')
      || perms.includes('users:read')
      || perms.includes('reports:read');
    if (!isElevated) {
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

    // Department filtering
    if (department) {
      // Filter by submitter's department
      where.submitter = {
        departmentEntity: {
          name: {
            equals: department as string,
            mode: 'insensitive'
          }
        }
      };
    }
    
    if (assignedToDepartment) {
      // Filter by assignee's department
      where.assignee = {
        departmentEntity: {
          name: {
            equals: assignedToDepartment as string,
            mode: 'insensitive'
          }
        }
      };
    }

    // Ticket number filter - support exact or prefix (e.g., '1' matches 1, 10, 100...)
    if (ticketNumber) {
      const raw = (ticketNumber as string).toString();
      const num = parseInt(raw, 10);
      if (!isNaN(num)) {
        // Use raw SQL to find ids with ticketNumber text starting with the digits
        try {
          const like = `%${raw}%`;
          const rows = await prisma.$queryRaw<any>`SELECT "id" FROM "tickets" WHERE CAST("ticketNumber" AS TEXT) LIKE ${like}`;
          const ids = Array.isArray(rows) ? rows.map((r: any) => r.id).filter(Boolean) : [];
          if (ids.length > 0) {
            (where.AND ||= []).push({ id: { in: ids } });
          } else {
            // Force no results if no ids matched the prefix
            (where.AND ||= []).push({ id: { in: ['__no_match__'] } });
          }
        } catch (e) {
          // Fallback to exact match if raw query fails
          where.ticketNumber = num;
        }
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
            avatar: true,
            departmentEntity: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
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
            departmentEntity: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
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
            comments: true,
            tasks: true
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
router.get('/:id', authenticate, authorizePermission('tickets:read'), async (req, res) => {
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
            departmentId: true,
            departmentEntity: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
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
            departmentId: true,
            departmentEntity: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
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
          orderBy: { createdAt: 'desc' },
          include: {
            status: { select: { id: true, key: true, name: true, color: true, sortOrder: true } },
            priority: { select: { id: true, key: true, name: true, color: true, level: true, sortOrder: true } }
          }
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
router.post('/', authenticate, authorizePermission('tickets:write'), async (req, res) => {
  try {
    const { title, description, category, priority, dueDate, tags }: CreateTicketRequest = req.body as any;
    const source: TicketSource = (req.body as any)?.source || 'WEB';
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
      data: ({
        title,
        description,
        categoryId: category,
        priorityId: (resolvedPriority?.id) || defaultPriority.id,
        statusId: defaultStatus.id,
        submittedBy: userId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        tags: tags || [],
        source: source as any
      } as any),
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
        category: true,
        priority: true,
        status: true
      }
    });

    // Attempt auto-assignment
    let assignmentResult = null;
    try {
      assignmentResult = await AutoAssignmentService.assignTicket(ticket.id);
      
      if (assignmentResult.success) {
        // Update agent's last assignment time
        await AutoAssignmentService.updateAgentAssignmentTime(assignmentResult.assignedTo!);
        
        // Fetch updated ticket with assignee information
        const updatedTicket = await prisma.ticket.findUnique({
          where: { id: ticket.id },
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
            category: true,
            priority: true,
            status: true
          }
        });

        return res.status(201).json({
          success: true,
          data: updatedTicket,
          message: `Ticket created and auto-assigned successfully via ${assignmentResult.method}`,
          assignment: {
            success: true,
            method: assignmentResult.method,
            assignedTo: assignmentResult.assignedTo
          }
        });
      }
    } catch (assignmentError) {
      console.error('Auto-assignment failed:', assignmentError);
      // Continue with ticket creation even if auto-assignment fails
    }

    return res.status(201).json({
      success: true,
      data: ticket,
      message: 'Ticket created successfully' + (assignmentResult ? ` (Auto-assignment: ${assignmentResult.reason || assignmentResult.error})` : ''),
      assignment: assignmentResult || { success: false, reason: 'Auto-assignment not attempted' }
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create ticket'
    });
  }
});

// Create task for a ticket
router.post('/:id/tasks', authenticate, authorizePermission('tickets:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority = 'MEDIUM', dueDate, assignedTo } = req.body as any;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Task title is required' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    // Resolve task priority and status defaults
    const [statusDef, priorityDef] = await Promise.all([
      prisma.taskStatusDef.findFirst({ where: { key: 'PENDING' } }) || prisma.taskStatusDef.findFirst(),
      prisma.taskPriorityDef.findFirst({ where: { key: String(priority || 'MEDIUM').toUpperCase() } }) || prisma.taskPriorityDef.findFirst()
    ]);

    const created = await prisma.ticketTask.create({
      data: {
        ticketId: id,
        title: title.trim(),
        description: (description || '').toString(),
        taskPriorityId: (priorityDef as any)?.id,
        taskStatusId: (statusDef as any)?.id,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignedTo: assignedTo || undefined
      }
    });

    return res.status(201).json({ success: true, data: created, message: 'Task created' });
  } catch (e) {
    console.error('Create task error:', e);
    return res.status(500).json({ success: false, error: 'Failed to create task' });
  }
});

// Get tasks for a ticket
router.get('/:id/tasks', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await prisma.ticket.findUnique({ where: { id }, select: { id: true } });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    const tasks = await prisma.ticketTask.findMany({ where: { ticketId: id }, orderBy: { createdAt: 'desc' }, include: { status: true, priority: true } });
    return res.json({ success: true, data: tasks });
  } catch (e) {
    console.error('Get tasks error:', e);
    return res.status(500).json({ success: false, error: 'Failed to get tasks' });
  }
});

// Update ticket
router.put('/:id', authenticate, authorizePermission('tickets:write'), async (req, res) => {
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

    // Handle status changes (permission + validate allowed transitions server-side)
    if (updateData.statusId && updateData.statusId !== existingTicket.statusId) {
      // Enforce specific permission to change status unless admin role
      const requester = (req as any).user || {};
      const roleNames: string[] = Array.isArray(requester?.roles)
        ? requester.roles.map((r: any) => (r?.role?.name || '').toLowerCase())
        : [];
      const perms: string[] = Array.isArray(requester?.permissions) ? requester.permissions : [];
      const canChangeStatus = roleNames.includes('admin') || perms.includes('ticket-status:change');
      if (!canChangeStatus) {
        return res.status(403).json({ success: false, error: 'Insufficient permissions to change ticket status' });
      }
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
router.get('/:id/status-history', authenticate, authorizePermission('tickets:read'), async (req, res) => {
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
router.delete('/:id', authenticate, authorizePermission('tickets:delete'), async (req, res) => {
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

    // Only allow deletion if user is submitter or admin via RBAC
    const requester = (req as any).user;
    const isAdmin = Array.isArray(requester?.roles) && requester.roles.some((r: any) => r?.role?.name === 'admin');
    if (ticket.submittedBy !== userId && !isAdmin) {
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
router.get('/stats/overview', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const isAgent = (req as any).user.isAgent;
    const roles = Array.isArray((req as any).user?.roles) ? (req as any).user.roles : [];
    const roleNames = roles.map((r: any) => (r?.role?.name || '').toLowerCase());
    const perms: string[] = Array.isArray((req as any).user?.permissions) ? (req as any).user.permissions : [];
    const isElevated = isAgent 
      || roleNames.includes('admin')
      || roleNames.includes('manager')
      || perms.includes('users:read')
      || perms.includes('reports:read');
    const { range = 'today' } = req.query as { range?: string };

    let whereClause: any = {};

    // If not an agent, only show user's own tickets
    if (!isElevated) {
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
      slaAtRiskTickets,
      openInProgressDirect
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
      prisma.ticket.count({ where: { ...notResolvedClosedWhere, slaResponseAt: { lt: now } } }),
      // Fallback: directly count tickets whose status is neither resolved nor closed
      prisma.ticket.count({ where: { 
        ...whereClause,
        status: { is: { isClosed: false, isResolved: false } }
      } })
    ]);

    const stats = {
      total: totalTickets,
      open: openTickets,
      inProgress: inProgressTickets,
      resolved: resolvedTickets,
      closed: closedTickets,
      openInProgress: (Number.isFinite(openTickets) && Number.isFinite(inProgressTickets) && (statusMap.open || statusMap['open']) && (statusMap.inprogress || statusMap['inprogress']))
        ? (openTickets + inProgressTickets)
        : openInProgressDirect,
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
router.get('/stats/activity', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const isAgent = (req as any).user.isAgent;
    const roles = Array.isArray((req as any).user?.roles) ? (req as any).user.roles : [];
    const roleNames = roles.map((r: any) => (r?.role?.name || '').toLowerCase());
    const perms: string[] = Array.isArray((req as any).user?.permissions) ? (req as any).user.permissions : [];
    const isElevated = isAgent 
      || roleNames.includes('admin')
      || roleNames.includes('manager')
      || perms.includes('users:read')
      || perms.includes('reports:read');
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
    if (!isElevated) {
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
router.get('/stats/metrics', authenticate, authorizePermission('tickets:read'), async (req, res) => {
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

// Get task assignment history
router.get('/:ticketId/tasks/:taskId/assignment-history', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const { ticketId, taskId } = req.params;
    const task = await prisma.ticketTask.findUnique({ where: { id: taskId }, select: { id: true, ticketId: true } });
    if (!task || task.ticketId !== ticketId) return res.status(404).json({ success: false, error: 'Task not found' });

    // For now, we'll create assignment history from task changes
    // In a real implementation, you might want to create a separate assignment history table
    const history = await (prisma as any).taskAssignmentHistory.findMany({
      where: { taskId },
      orderBy: { assignedAt: 'desc' },
      include: {
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    // Map to response format
    const data = history.map((h: any) => ({
      id: h.id,
      fromAssignee: h.fromUser ? `${h.fromUser.firstName} ${h.fromUser.lastName}` : null,
      toAssignee: h.toUser ? `${h.toUser.firstName} ${h.toUser.lastName}` : null,
      assignedBy: `${h.assignedBy?.firstName || ''} ${h.assignedBy?.lastName || ''}`.trim() || h.assignedById,
      assignedAt: h.assignedAt,
      reason: h.reason || undefined
    }));

    return res.json({ success: true, data });
  } catch (e) {
    console.error('Get task assignment history error:', e);
    return res.status(500).json({ success: false, error: 'Failed to get task assignment history' });
  }
});

// Task comments
router.get('/:ticketId/tasks/:taskId/comments', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const { ticketId, taskId } = req.params;
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    const comments = await (prisma as any).taskComment.findMany({
      where: { taskId },
      include: { author: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: comments });
  } catch (e) {
    console.error('Get task comments error:', e);
    return res.status(500).json({ success: false, error: 'Failed to get task comments' });
  }
});

router.post('/:ticketId/tasks/:taskId/comments', authenticate, authorizePermission('tickets:write'), async (req, res) => {
  try {
    const { ticketId, taskId } = req.params;
    const { content, isInternal } = req.body as { content?: string; isInternal?: boolean };
    if (!content || !content.trim()) return res.status(400).json({ success: false, error: 'Content is required' });
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    const created = await (prisma as any).taskComment.create({
      data: { taskId, authorId: (req as any).user.id, content: content.trim(), isInternal: !!isInternal }
    });
    return res.status(201).json({ success: true, data: created, message: 'Task comment added' });
  } catch (e) {
    console.error('Create task comment error:', e);
    return res.status(500).json({ success: false, error: 'Failed to add task comment' });
  }
});

// Task status update with history logging
router.patch('/:ticketId/tasks/:taskId/status', authenticate, authorizePermission('tickets:write'), async (req, res) => {
  try {
    const { ticketId, taskId } = req.params;
    const { toStatus, reason } = req.body as { toStatus?: string; reason?: string };
    if (!toStatus) return res.status(400).json({ success: false, error: 'toStatus is required' });

    const task = await prisma.ticketTask.findUnique({ where: { id: taskId } });
    if (!task || task.ticketId !== ticketId) return res.status(404).json({ success: false, error: 'Task not found' });

    const statusDef = await prisma.taskStatusDef.findFirst({ where: { key: String(toStatus).toUpperCase() } });
    if (!statusDef) return res.status(400).json({ success: false, error: 'Invalid toStatus' });

    const updated = await prisma.$transaction(async (tx: any) => {
      const prevStatusDef = await tx.taskStatusDef.findUnique({ where: { id: (task as any).taskStatusId } });
      const prev = await tx.ticketTask.update({ where: { id: taskId }, data: { taskStatusId: statusDef.id, completedDate: (String(toStatus).toUpperCase() === 'COMPLETED' ? new Date() : task.completedDate) } });
      await tx.taskStatusHistory.create({ data: { taskId, fromStatus: (prevStatusDef?.key || 'PENDING') as any, toStatus: (statusDef.key as any), changedBy: (req as any).user.id, reason: reason || undefined } });
      return prev;
    });

    return res.json({ success: true, data: updated, message: 'Task status updated' });
  } catch (e) {
    console.error('Update task status error:', e);
    return res.status(500).json({ success: false, error: 'Failed to update task status' });
  }
});

// Task assignment update
router.patch('/:ticketId/tasks/:taskId/assign', authenticate, authorizePermission('tickets:write'), async (req, res) => {
  try {
    const { ticketId, taskId } = req.params;
    const { assignedTo } = req.body as { assignedTo?: string | null };

    const task = await prisma.ticketTask.findUnique({ where: { id: taskId } });
    if (!task || task.ticketId !== ticketId) return res.status(404).json({ success: false, error: 'Task not found' });

    // If assignedTo is provided, verify the user exists
    if (assignedTo) {
      const user = await prisma.user.findUnique({ where: { id: assignedTo } });
      if (!user) return res.status(400).json({ success: false, error: 'User not found' });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      // Get current assignment before updating
      const currentTask = await tx.ticketTask.findUnique({ where: { id: taskId } });
      
      // Update the task assignment
      const task = await tx.ticketTask.update({
        where: { id: taskId },
        data: { assignedTo: assignedTo || null }
      });

      // Create assignment history entry
      await tx.taskAssignmentHistory.create({
        data: {
          taskId: taskId,
          fromUserId: currentTask?.assignedTo || null,
          toUserId: assignedTo || null,
          assignedById: (req as any).user.id,
          reason: req.body.reason || undefined
        }
      });

      return task;
    });

    return res.json({ success: true, data: updated, message: 'Task assignment updated' });
  } catch (e) {
    console.error('Update task assignment error:', e);
    return res.status(500).json({ success: false, error: 'Failed to update task assignment' });
  }
});

// Get task status history
router.get('/:ticketId/tasks/:taskId/status-history', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const { ticketId, taskId } = req.params;
    const task = await prisma.ticketTask.findUnique({ where: { id: taskId }, select: { id: true, ticketId: true } });
    if (!task || task.ticketId !== ticketId) return res.status(404).json({ success: false, error: 'Task not found' });

    const history = await (prisma as any).taskStatusHistory.findMany({
      where: { taskId },
      orderBy: { changedAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        task: false
      }
    });

    // Map to response with resolved names for from/to
    const defs = await prisma.taskStatusDef.findMany();
    const mapName = (id: string) => defs.find(d => d.id === id)?.name || defs.find(d => d.id === id)?.key || id;

    const data = history.map((h: any) => ({
      id: h.id,
      fromStatusId: h.fromStatus,
      fromStatusName: mapName(h.fromStatus),
      toStatusId: h.toStatus,
      toStatusName: mapName(h.toStatus),
      changedBy: `${h.user?.firstName || ''} ${h.user?.lastName || ''}`.trim() || h.changedBy,
      changedAt: h.changedAt,
      reason: h.reason || undefined
    }));

    return res.json({ success: true, data });
  } catch (e) {
    console.error('Get task status history error:', e);
    return res.status(500).json({ success: false, error: 'Failed to get task status history' });
  }
});

export default router;