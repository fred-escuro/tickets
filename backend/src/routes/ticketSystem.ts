import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, requireAgent, authorize } from '../middleware/auth';
import { ApiResponse } from '../types';

const router = Router();

// Get all ticket categories
router.get('/categories', authenticate, async (req, res) => {
  try {
    const categories = await prisma.ticketCategory.findMany({
      where: { isActive: true },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        _count: {
          select: { tickets: true }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    const response: ApiResponse = {
      success: true,
      data: categories
    };

    return res.json(response);
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get categories'
    });
  }
});

// Create new category
router.post('/categories', authenticate, authorize('admin', 'manager', 'agent'), async (req, res) => {
  try {
    const { name, description, color, icon, parentId, customFields, autoAssignRules, slaRules } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    // Get the next sort order
    const lastCategory = await prisma.ticketCategory.findFirst({
      where: { parentId: parentId || null },
      orderBy: { sortOrder: 'desc' }
    });

    const category = await prisma.ticketCategory.create({
      data: {
        name,
        description,
        color: color || 'blue',
        icon,
        parentId,
        sortOrder: (lastCategory?.sortOrder || 0) + 1,
        customFields,
        autoAssignRules,
        slaRules
      },
      include: {
        parent: true,
        children: true
      }
    });

    return res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create category'
    });
  }
});

// Update category
router.put('/categories/:id', authenticate, authorize('admin', 'manager', 'agent'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const category = await prisma.ticketCategory.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        children: true
      }
    });

    return res.json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Update category error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update category'
    });
  }
});

// Delete category
router.delete('/categories/:id', authenticate, authorize('admin', 'manager', 'agent'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has tickets
    const ticketCount = await prisma.ticket.count({
      where: { categoryId: id }
    });

    if (ticketCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with existing tickets'
      });
    }

    // Check if category has children
    const childrenCount = await prisma.ticketCategory.count({
      where: { parentId: id }
    });

    if (childrenCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with subcategories'
      });
    }

    await prisma.ticketCategory.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete category'
    });
  }
});

// Get all ticket priorities
router.get('/priorities', authenticate, async (req, res) => {
  try {
    const priorities = await prisma.ticketPriority.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    const response: ApiResponse = {
      success: true,
      data: priorities
    };

    return res.json(response);
  } catch (error) {
    console.error('Get priorities error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get priorities'
    });
  }
});

// Create new priority
router.post('/priorities', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, color, icon, level, slaResponseHours, slaResolveHours, escalationRules } = req.body;

    if (!name || !level) {
      return res.status(400).json({
        success: false,
        error: 'Priority name and level are required'
      });
    }

    // Check if level already exists
    const existingPriority = await prisma.ticketPriority.findFirst({
      where: { level }
    });

    if (existingPriority) {
      return res.status(400).json({
        success: false,
        error: `Priority level ${level} already exists`
      });
    }

    // Get the next sort order
    const lastPriority = await prisma.ticketPriority.findFirst({
      orderBy: { sortOrder: 'desc' }
    });

    const priority = await prisma.ticketPriority.create({
      data: {
        name,
        description,
        color: color || 'blue',
        icon,
        level,
        sortOrder: (lastPriority?.sortOrder || 0) + 1,
        slaResponseHours: slaResponseHours || 24,
        slaResolveHours: slaResolveHours || 72,
        escalationRules
      }
    });

    return res.status(201).json({
      success: true,
      data: priority,
      message: 'Priority created successfully'
    });
  } catch (error) {
    console.error('Create priority error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create priority'
    });
  }
});

// Update priority
router.put('/priorities/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const priority = await prisma.ticketPriority.update({
      where: { id },
      data: updateData
    });

    return res.json({
      success: true,
      data: priority,
      message: 'Priority updated successfully'
    });
  } catch (error) {
    console.error('Update priority error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update priority'
    });
  }
});

// Delete priority
router.delete('/priorities/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if priority is being used by any tickets
    const ticketsUsingPriority = await prisma.ticket.count({
      where: { priorityId: id }
    });

    if (ticketsUsingPriority > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete priority. It is currently being used by ${ticketsUsingPriority} ticket(s).`
      });
    }

    await prisma.ticketPriority.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Priority deleted successfully'
    });
  } catch (error) {
    console.error('Delete priority error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete priority'
    });
  }
});

// Get all ticket statuses
router.get('/statuses', authenticate, async (req, res) => {
  try {
    // Return all statuses (active and inactive) so UIs can resolve configured transitions reliably
    const statuses = await prisma.ticketStatus.findMany({
      orderBy: { sortOrder: 'asc' }
    });

    const response: ApiResponse = {
      success: true,
      data: statuses
    };

    return res.json(response);
  } catch (error) {
    console.error('Get statuses error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get statuses'
    });
  }
});

// Create new status
router.post('/statuses', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, color, icon, isClosed, isResolved, allowedTransitions, permissions } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Status name is required'
      });
    }

    // Prevent duplicate names early
    const existingByName = await prisma.ticketStatus.findUnique({
      where: { name }
    });

    if (existingByName) {
      return res.status(400).json({
        success: false,
        error: `Status with name "${name}" already exists`
      });
    }

    // Get the next sort order
    const lastStatus = await prisma.ticketStatus.findFirst({
      orderBy: { sortOrder: 'desc' }
    });

    const status = await prisma.ticketStatus.create({
      data: {
        name,
        description,
        color: color || 'blue',
        icon,
        sortOrder: (lastStatus?.sortOrder || 0) + 1,
        isClosed: isClosed || false,
        isResolved: isResolved || false,
        allowedTransitions,
        permissions
      }
    });

    return res.status(201).json({
      success: true,
      data: status,
      message: 'Status created successfully'
    });
  } catch (error: any) {
    // Handle Prisma unique constraint error gracefully
    if (error?.code === 'P2002' && Array.isArray(error?.meta?.target) && error.meta.target.includes('name')) {
      return res.status(400).json({
        success: false,
        error: 'Status name must be unique'
      });
    }

    console.error('Create status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create status'
    });
  }
});

// Update status
router.put('/statuses/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const status = await prisma.ticketStatus.update({
      where: { id },
      data: updateData
    });

    return res.json({
      success: true,
      data: status,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update status'
    });
  }
});

// Delete status
router.delete('/statuses/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if status is being used by any tickets
    const ticketsUsingStatus = await prisma.ticket.count({
      where: { statusId: id }
    });

    if (ticketsUsingStatus > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete status. It is currently being used by ${ticketsUsingStatus} ticket(s).`
      });
    }

    await prisma.ticketStatus.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Status deleted successfully'
    });
  } catch (error) {
    console.error('Delete status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete status'
    });
  }
});

// Get ticket templates
router.get('/templates', authenticate, async (req, res) => {
  try {
    const { categoryId } = req.query;

    const templates = await prisma.ticketTemplate.findMany({
      where: {
        isActive: true,
        ...(categoryId && { categoryId: categoryId as string })
      },
      include: {
        category: true
      },
      orderBy: { name: 'asc' }
    });

    const response: ApiResponse = {
      success: true,
      data: templates
    };

    return res.json(response);
  } catch (error) {
    console.error('Get templates error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get templates'
    });
  }
});

// Create ticket template
router.post('/templates', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, categoryId, title, description: templateDescription, customFields } = req.body;

    if (!name || !categoryId || !title) {
      return res.status(400).json({
        success: false,
        error: 'Template name, category, and title are required'
      });
    }

    const template = await prisma.ticketTemplate.create({
      data: {
        name,
        description,
        categoryId,
        title,
        templateDescription,
        customFields
      },
      include: {
        category: true
      }
    });

    return res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Create template error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
});

// Get workflows
router.get('/workflows', authenticate, async (req, res) => {
  try {
    const workflows = await prisma.ticketWorkflow.findMany({
      where: { isActive: true },
      include: {
        category: true,
        priority: true
      },
      orderBy: { name: 'asc' }
    });

    const response: ApiResponse = {
      success: true,
      data: workflows
    };

    return res.json(response);
  } catch (error) {
    console.error('Get workflows error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get workflows'
    });
  }
});

// Create workflow
router.post('/workflows', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, categoryId, priorityId, rules } = req.body;

    if (!name || !rules) {
      return res.status(400).json({
        success: false,
        error: 'Workflow name and rules are required'
      });
    }

    const workflow = await prisma.ticketWorkflow.create({
      data: {
        name,
        description,
        categoryId,
        priorityId,
        rules
      },
      include: {
        category: true,
        priority: true
      }
    });

    return res.status(201).json({
      success: true,
      data: workflow,
      message: 'Workflow created successfully'
    });
  } catch (error) {
    console.error('Create workflow error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create workflow'
    });
  }
});

// Get system configuration summary
router.get('/config', authenticate, async (req, res) => {
  try {
    const [categories, priorities, statuses, templates, workflows] = await Promise.all([
      prisma.ticketCategory.count({ where: { isActive: true } }),
      prisma.ticketPriority.count({ where: { isActive: true } }),
      prisma.ticketStatus.count({ where: { isActive: true } }),
      prisma.ticketTemplate.count({ where: { isActive: true } }),
      prisma.ticketWorkflow.count({ where: { isActive: true } })
    ]);

    const config = {
      categories,
      priorities,
      statuses,
      templates,
      workflows
    };

    const response: ApiResponse = {
      success: true,
      data: config
    };

    return res.json(response);
  } catch (error) {
    console.error('Get config error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get system configuration'
    });
  }
});

export default router;
