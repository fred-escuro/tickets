import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { ApiResponse, CreateDepartmentRequest, UpdateDepartmentRequest } from '../types';

const router = Router();

// Create department (admin)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const data: CreateDepartmentRequest = req.body;

    if (!data.name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const created = await prisma.department.create({
      data: {
        name: data.name,
        description: data.description,
        managerId: data.managerId,
        parentId: data.parentId
      }
    });

    return res.status(201).json({ success: true, data: created, message: 'Department created' });
  } catch (error) {
    console.error('Create department error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create department' });
  }
});

// List departments
router.get('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const depts = await prisma.department.findMany({
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { users: true, children: true } }
      },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: depts });
  } catch (error) {
    console.error('List departments error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get departments' });
  }
});

// Get department by id
router.get('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await prisma.department.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        children: { select: { id: true, name: true } },
        users: { 
          select: { 
            id: true, 
            isPrimary: true,
            role: true,
            user: {
              select: {
                id: true, 
                firstName: true, 
                lastName: true, 
                email: true 
              }
            }
          } 
        }
      }
    });
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    return res.json({ success: true, data: dept });
  } catch (error) {
    console.error('Get department error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get department' });
  }
});

// Update department (admin)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const data: UpdateDepartmentRequest = req.body;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Department not found' });

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        managerId: data.managerId === null ? null : data.managerId ?? undefined,
        parentId: data.parentId === null ? null : data.parentId ?? undefined
      }
    });

    return res.json({ success: true, data: updated, message: 'Department updated' });
  } catch (error) {
    console.error('Update department error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update department' });
  }
});

// Delete department (admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Department not found' });

    // Ensure no users are assigned before delete
    const countUsers = await prisma.userDepartment.count({ where: { departmentId: id } });
    if (countUsers > 0) {
      return res.status(400).json({ success: false, error: 'Department has assigned users; reassign them first' });
    }

    await prisma.department.delete({ where: { id } });
    return res.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    console.error('Delete department error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete department' });
  }
});

// Assign user to department (admin/manager)
router.post('/:id/users/:userId', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id, userId } = req.params;

    const [dept, user] = await Promise.all([
      prisma.department.findUnique({ where: { id } }),
      prisma.user.findUnique({ where: { id: userId } })
    ]);

    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { 
        departments: {
          create: {
            departmentId: id,
            isPrimary: true,
            role: 'member'
          }
        }
      }
    });

    return res.json({ success: true, data: { id: updated.id, departmentId: id }, message: 'User assigned to department' });
  } catch (error) {
    console.error('Assign user to department error:', error);
    return res.status(500).json({ success: false, error: 'Failed to assign user' });
  }
});

// Remove user from department (admin/manager)
router.delete('/:id/users/:userId', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id, userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    // Check if user is in this department
    const userDept = await prisma.userDepartment.findFirst({
      where: { userId, departmentId: id }
    });
    
    if (!userDept) return res.status(400).json({ success: false, error: 'User is not in this department' });

    await prisma.userDepartment.delete({ where: { id: userDept.id } });
    return res.json({ success: true, message: 'User removed from department' });
  } catch (error) {
    console.error('Remove user from department error:', error);
    return res.status(500).json({ success: false, error: 'Failed to remove user' });
  }
});

// Get department statistics
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get department
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        users: {
          where: { 
            user: { isAgent: true }
          },
          select: { id: true }
        }
      }
    });

    if (!department) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    const agentIds = department.users.map(userDept => userDept.id);

    // Get ticket statistics
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      ticketsByPriority,
      ticketsByCategory
    ] = await Promise.all([
      // Total tickets assigned to department agents
      prisma.ticket.count({
        where: {
          assignedTo: { in: agentIds }
        }
      }),
      // Open tickets
      prisma.ticket.count({
        where: {
          assignedTo: { in: agentIds },
          status: { name: 'OPEN' }
        }
      }),
      // In progress tickets
      prisma.ticket.count({
        where: {
          assignedTo: { in: agentIds },
          status: { name: 'IN_PROGRESS' }
        }
      }),
      // Resolved tickets
      prisma.ticket.count({
        where: {
          assignedTo: { in: agentIds },
          status: { name: 'RESOLVED' }
        }
      }),
      // Closed tickets
      prisma.ticket.count({
        where: {
          assignedTo: { in: agentIds },
          status: { name: 'CLOSED' }
        }
      }),
      // Tickets by priority
      prisma.ticket.groupBy({
        by: ['priorityId'],
        where: {
          assignedTo: { in: agentIds }
        },
        _count: true
      }),
      // Tickets by category
      prisma.ticket.groupBy({
        by: ['categoryId'],
        where: {
          assignedTo: { in: agentIds }
        },
        _count: true
      })
    ]);

    // Get priority and category names
    const priorityIds = ticketsByPriority.map(t => t.priorityId);
    const categoryIds = ticketsByCategory.map(t => t.categoryId);

    const [priorities, categories] = await Promise.all([
      prisma.ticketPriority.findMany({
        where: { id: { in: priorityIds } },
        select: { id: true, name: true }
      }),
      prisma.ticketCategory.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true }
      })
    ]);

    const priorityMap = new Map(priorities.map(p => [p.id, p.name]));
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const ticketsByPriorityData = ticketsByPriority.reduce((acc, item) => {
      const priorityName = priorityMap.get(item.priorityId) || 'Unknown';
      acc[priorityName] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const ticketsByCategoryData = ticketsByCategory.reduce((acc, item) => {
      const categoryName = categoryMap.get(item.categoryId) || 'Unknown';
      acc[categoryName] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average resolution time (simplified)
    const resolvedTicketsWithTimes = await prisma.ticket.findMany({
      where: {
        assignedTo: { in: agentIds },
        status: { name: 'RESOLVED' },
        resolvedAt: { not: null }
      },
      select: {
        submittedAt: true,
        resolvedAt: true
      }
    });

    const averageResolutionTime = resolvedTicketsWithTimes.length > 0
      ? resolvedTicketsWithTimes.reduce((sum, ticket) => {
          const resolutionTime = ticket.resolvedAt!.getTime() - ticket.submittedAt.getTime();
          return sum + resolutionTime;
        }, 0) / resolvedTicketsWithTimes.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    const stats = {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      averageResolutionTime: Math.round(averageResolutionTime * 100) / 100,
      ticketsByPriority: ticketsByPriorityData,
      ticketsByCategory: ticketsByCategoryData
    };

    return res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get department stats error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get department statistics' });
  }
});

export default router;


